import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';
import { type CameraPreset } from './cameraPresets';
import { createMannequinGeometry, type MannequinInstance } from './mannequin';
import { SceneEnvironment } from './sceneEnvironment';
import { canvasEventBus } from '@/features/canvas/application/canvasServices';
import { type PlacedPropInstance } from '@/stores/canvasStore';
import { getPropById } from './props';

const DEFAULT_FOV = 50;

// --- Internal 3D objects ---

interface MannequinObjectProps {
  instance: MannequinInstance;
}

function MannequinObject({ instance }: MannequinObjectProps) {
  const geometry = useMemo(
    () => createMannequinGeometry(instance.pose, instance.color),
    [instance.pose, instance.color],
  );

  // C-01: Dispose GPU resources when geometry changes (pose/color recompute)
  useEffect(() => {
    const currentGeometry = geometry;
    return () => {
      currentGeometry.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry.dispose();
          ((child as THREE.Mesh).material as THREE.Material).dispose();
        }
      });
    };
  }, [geometry]);

  return (
    <primitive
      object={geometry}
      position={instance.position}
      rotation={[0, instance.rotation, 0]}
    />
  );
}

interface PropObjectProps {
  definitionId: string;
  position: [number, number, number];
  rotation: number;
}

function PropObject({ definitionId, position, rotation }: PropObjectProps) {
  const definition = getPropById(definitionId);
  if (!definition) {
    return null;
  }
  const mesh = definition.createMesh();
  return (
    <primitive
      object={mesh}
      position={position}
      rotation={[0, rotation, 0]}
    />
  );
}

function PanoramaSphere({ url }: { url: string }) {
  // M-02: useTexture manages loading + disposal automatically
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh>
      <sphereGeometry args={[50, 60, 40]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} />
    </mesh>
  );
}

// --- Camera preset transition ---

/** Threshold to decide the transition has reached its target */
const TRANSITION_SNAP_THRESHOLD = 0.02;
const LERP_FACTOR = 0.06;

function CameraController({
  preset,
  orbitControlsRef,
}: {
  preset: CameraPreset | null;
  orbitControlsRef: React.RefObject<React.ComponentRef<typeof OrbitControls> | null>;
}) {
  const { camera } = useThree();

  // Track whether we are actively transitioning to a new preset
  const isTransitioning = useRef(false);
  // Store the last preset id to detect changes
  const lastPresetId = useRef<string | null>(null);
  // Target state for the transition
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const targetFov = useRef(DEFAULT_FOV);

  useFrame(() => {
    // Detect preset change: start transitioning
    const currentPresetId = preset?.id ?? null;
    if (currentPresetId !== lastPresetId.current) {
      lastPresetId.current = currentPresetId;
      if (preset) {
        isTransitioning.current = true;
        targetPos.current.set(...preset.position);
        targetLookAt.current.set(...preset.target);
        targetFov.current = preset.fov ?? DEFAULT_FOV;
        // Disable OrbitControls during transition so camera isn't fought over
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = false;
        }
      } else {
        // C-03: When preset becomes null, stop transitioning and re-enable controls
        isTransitioning.current = false;
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = true;
        }
      }
    }

    if (!isTransitioning.current) {
      return;
    }

    // Lerp camera toward target
    camera.position.lerp(targetPos.current, LERP_FACTOR);
    // M-03: Also interpolate OrbitControls target (lookAt direction)
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.lerp(targetLookAt.current, LERP_FACTOR);
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += (targetFov.current - camera.fov) * LERP_FACTOR;
      camera.updateProjectionMatrix();
    }

    // Check if close enough to snap and end transition
    const distance = camera.position.distanceTo(targetPos.current);
    const fovDelta = camera instanceof THREE.PerspectiveCamera
      ? Math.abs(camera.fov - targetFov.current)
      : 0;
    if (distance < TRANSITION_SNAP_THRESHOLD && fovDelta < 0.5) {
      camera.position.copy(targetPos.current);
      // M-03: Snap lookAt target as well
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(targetLookAt.current);
        orbitControlsRef.current.update();
      }
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = targetFov.current;
        camera.updateProjectionMatrix();
      }
      isTransitioning.current = false;
      // Re-enable OrbitControls so user can freely orbit
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = true;
      }
    }
  });

  return null;
}

// --- Main scene component ---

export interface Director3dSceneProps {
  nodeId: string;
  backgroundUrl: string | null;
  mannequins: MannequinInstance[];
  placedProps: PlacedPropInstance[];
  activePreset: CameraPreset | null;
}

export function Director3dScene({
  nodeId,
  backgroundUrl,
  mannequins,
  placedProps,
  activePreset,
}: Director3dSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbitControlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const resolvedBackgroundUrl = useMemo(
    () => backgroundUrl ? resolveImageDisplayUrl(backgroundUrl) : null,
    [backgroundUrl],
  );

  // --- Event bus subscription for export ---
  useEffect(() => {
    const handleExportViewport = (payload: { nodeId: string }) => {
      if (payload.nodeId !== nodeId) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        canvasEventBus.publish('director3d/export-error', { nodeId, kind: 'viewport', reason: 'Canvas not available' });
        return;
      }
      try {
        const dataUrl = canvas.toDataURL('image/png');
        canvasEventBus.publish('director3d/export-result', { nodeId, kind: 'viewport', dataUrl });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown export error';
        canvasEventBus.publish('director3d/export-error', { nodeId, kind: 'viewport', reason: message });
      }
    };

    const handleExportDepth = (payload: { nodeId: string }) => {
      if (payload.nodeId !== nodeId) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        canvasEventBus.publish('director3d/export-error', { nodeId, kind: 'depth', reason: 'Canvas not available' });
        return;
      }
      try {
        const dataUrl = canvas.toDataURL('image/png');
        canvasEventBus.publish('director3d/export-result', { nodeId, kind: 'depth', dataUrl });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown export error';
        canvasEventBus.publish('director3d/export-error', { nodeId, kind: 'depth', reason: message });
      }
    };

    const unsubViewport = canvasEventBus.subscribe('director3d/export-viewport', handleExportViewport);
    const unsubDepth = canvasEventBus.subscribe('director3d/export-depth', handleExportDepth);

    return () => {
      unsubViewport();
      unsubDepth();
    };
  }, [nodeId]);

  return (
    <div className="h-full w-full">
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 1.6, 5], fov: DEFAULT_FOV, near: 0.1, far: 100 }}
        shadows
        gl={{ preserveDrawingBuffer: true }}
      >
        <SceneEnvironment />
        <CameraController preset={activePreset} orbitControlsRef={orbitControlsRef} />
        <OrbitControls
          ref={orbitControlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={30}
          target={[0, 1, 0]}
        />

        {resolvedBackgroundUrl && <PanoramaSphere url={resolvedBackgroundUrl} />}

        {mannequins.map((m) => (
          <MannequinObject key={m.id} instance={m} />
        ))}

        {placedProps.map((p) => (
          <PropObject
            key={p.id}
            definitionId={p.definitionId}
            position={p.position}
            rotation={p.rotation}
          />
        ))}
      </Canvas>
    </div>
  );
}
