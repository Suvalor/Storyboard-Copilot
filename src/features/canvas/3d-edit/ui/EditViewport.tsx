/**
 * Central R3F viewport for the 3D director edit mode.
 *
 * Renders scene mannequins / props / background, provides:
 *   - TransformControls on the selected object (gizmo)
 *   - OrbitControls (auto-disabled during gizmo drag via drei)
 *   - Click-to-select / click-empty-space-to-deselect
 *   - Camera preset quick-access bar
 *   - dragEnd -> setIsDragging(false) which triggers undo snapshot
 *   - objectChange -> write position/rotation back to editStore
 *   - Shot camera lerp transition when activeShotId is set
 *   - Shift+click preset = create new Shot from that preset
 *   - "Add shot from camera" event handling
 *
 * Reuses: mannequin.ts / props.ts / sceneEnvironment.tsx / cameraPresets.ts
 *
 * @since v0.1.14
 */

import {
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useState,
  type MutableRefObject,
} from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';

import { useDirector3dEditStore } from '../editStore';
import { SceneEnvironment } from '@/features/canvas/3d/sceneEnvironment';
import { CAMERA_PRESETS } from '@/features/canvas/3d/cameraPresets';
import type { CameraPreset } from '@/features/canvas/3d/cameraPresets';
import { createMannequinGeometry } from '@/features/canvas/3d/mannequin';
import type { MannequinPose as MannequinPose3d } from '@/features/canvas/3d/mannequin';
import { getPropById } from '@/features/canvas/3d/props';
import { v4 as uuid } from 'uuid';
import type {
  SelectedObject,
  GizmoMode,
  ShotCamera,
} from '../domain/sceneSchema';
import { AnnotationLabelsOverlay } from './AnnotationOverlay';
import {
  generateSceneBriefJson,
  generateSceneBriefText,
} from '../application/sceneBriefExporter';
import { canvasEventBus } from '@/features/canvas/application/canvasServices';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 1.6, 5];
const DEFAULT_FOV = 50;
const NEAR = 0.1;
const FAR = 200;
const SKY_SPHERE_RADIUS = 50;
const DESELECT_PLANE_SIZE = 10000;
const DESELECT_PLANE_Y = -500;

/** Lerp speed for smooth camera transitions (matches Director3dScene). */
const LERP_FACTOR = 0.06;
/** Distance threshold to snap the camera to target. */
const TRANSITION_SNAP_THRESHOLD = 0.02;

// ---------------------------------------------------------------------------
// Utility: dispose Object3D tree
// ---------------------------------------------------------------------------

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | undefined;
      mat?.dispose();
    }
  });
}

// ---------------------------------------------------------------------------
// MannequinPrimitive — builds and disposes mannequin Group
// ---------------------------------------------------------------------------

function MannequinPrimitive({
  pose,
  color,
}: {
  pose: MannequinPose3d;
  color: string;
}) {
  const group = useMemo(
    () => createMannequinGeometry(pose, color),
    [pose, color],
  );

  useEffect(() => {
    const g = group;
    return () => disposeObject3D(g);
  }, [group]);

  return <primitive object={group} />;
}

// ---------------------------------------------------------------------------
// PropPrimitive — builds and disposes prop Object3D
// ---------------------------------------------------------------------------

function PropPrimitive({ definitionId }: { definitionId: string }) {
  const definition = getPropById(definitionId);
  if (!definition) return null;

  const mesh = useMemo(() => definition.createMesh(), [definitionId]);

  useEffect(() => {
    const m = mesh;
    return () => disposeObject3D(m);
  }, [mesh]);

  return <primitive object={mesh} />;
}

// ---------------------------------------------------------------------------
// BackgroundSphere — equirectangular sky sphere
// ---------------------------------------------------------------------------

function BackgroundSphere({ url }: { url: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loadError, setLoadError] = useState(false);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    const seq = ++loadSeqRef.current;
    setLoadError(false);
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        if (seq !== loadSeqRef.current) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => {
        if (seq !== loadSeqRef.current) return;
        setLoadError(true);
      },
    );
    return () => {
      setTexture((prev) => {
        prev?.dispose();
        return null;
      });
    };
  }, [url]);

  if (loadError || !texture) return null;

  return (
    <mesh>
      <sphereGeometry args={[SKY_SPHERE_RADIUS, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// GizmoController — attaches TransformControls to the selected object
// ---------------------------------------------------------------------------

function GizmoController({
  selectedObject,
  gizmoMode,
  groupRefs,
}: {
  selectedObject: SelectedObject | null;
  gizmoMode: GizmoMode;
  groupRefs: MutableRefObject<Record<string, THREE.Group>>;
}) {
  const updateMannequin = useDirector3dEditStore((s) => s.updateMannequin);
  const updateProp = useDirector3dEditStore((s) => s.updateProp);
  const setIsDragging = useDirector3dEditStore((s) => s.setIsDragging);

  const transformRef = useRef<React.ComponentRef<typeof TransformControls> | null>(null);

  const targetObject = selectedObject
    ? groupRefs.current[selectedObject.id] ?? null
    : null;

  useEffect(() => {
    const ctrl = transformRef.current;
    if (!ctrl) return;

    const onDraggingChanged = (event: { value: boolean }) => {
      setIsDragging(event.value);
    };

    const addEv = ctrl.addEventListener.bind(ctrl) as (type: string, listener: (event: { value: boolean }) => void) => void;
    const removeEv = ctrl.removeEventListener.bind(ctrl) as (type: string, listener: (event: { value: boolean }) => void) => void;
    addEv('dragging-changed', onDraggingChanged);
    return () => {
      removeEv('dragging-changed', onDraggingChanged);
    };
  }, [setIsDragging, targetObject]);

  const handleObjectChange = useCallback(() => {
    if (!selectedObject) return;
    const obj = groupRefs.current[selectedObject.id];
    if (!obj) return;

    const { x, y, z } = obj.position;
    const rotY = obj.rotation.y;

    if (selectedObject.kind === 'mannequin') {
      updateMannequin(selectedObject.id, {
        position: [x, y, z],
        rotationY: rotY,
      });
    } else if (selectedObject.kind === 'prop') {
      updateProp(selectedObject.id, {
        position: [x, y, z],
        rotationY: rotY,
      });
    }
  }, [selectedObject, groupRefs, updateMannequin, updateProp]);

  if (!targetObject || !selectedObject) return null;

  return (
    <TransformControls
      ref={transformRef}
      key={selectedObject.id}
      object={targetObject}
      mode={gizmoMode}
      onObjectChange={handleObjectChange}
    />
  );
}

// ---------------------------------------------------------------------------
// EmptySpaceCatcher — invisible plane that deselects on click
// ---------------------------------------------------------------------------

function EmptySpaceCatcher() {
  const selectObject = useDirector3dEditStore((s) => s.selectObject);

  return (
    <mesh
      visible={false}
      position={[0, DESELECT_PLANE_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        selectObject(null);
      }}
    >
      <planeGeometry args={[DESELECT_PLANE_SIZE, DESELECT_PLANE_SIZE]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// CameraController — shot camera lerp + preset jump + add-shot-from-camera
// ---------------------------------------------------------------------------

/**
 * Camera controller with two modes:
 *   1. Free mode (activeShotId === null): OrbitControls enabled
 *   2. Shot mode (activeShotId !== null): camera lerps toward the Shot's
 *      position/target/FOV; OrbitControls disabled.
 *
 * Also handles:
 *   - `director3d-edit/camera-preset` event: instant jump to a preset
 *   - `director3d-edit/add-shot-from-camera` event: create a Shot from
 *     the current camera position
 */
function CameraController() {
  const { camera } = useThree();
  const activeShotId = useDirector3dEditStore((s) => s.scene.activeShotId);
  const shots = useDirector3dEditStore((s) => s.scene.shots);
  const addShot = useDirector3dEditStore((s) => s.addShot);
  const setActiveShot = useDirector3dEditStore((s) => s.setActiveShot);
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);

  // Lerp transition state
  const isTransitioning = useRef(false);
  const lastShotId = useRef<string | null>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const targetFov = useRef(DEFAULT_FOV);

  // Detect activeShotId change and set lerp targets
  useEffect(() => {
    const currentShotId = activeShotId;
    if (currentShotId !== lastShotId.current) {
      lastShotId.current = currentShotId;
      if (currentShotId !== null) {
        const shot = shots.find((s) => s.id === currentShotId);
        if (shot) {
          isTransitioning.current = true;
          targetPos.current.set(shot.position[0], shot.position[1], shot.position[2]);
          targetLookAt.current.set(shot.target[0], shot.target[1], shot.target[2]);
          targetFov.current = shot.fov ?? DEFAULT_FOV;
          // Disable OrbitControls during transition
          if (controlsRef.current) {
            controlsRef.current.enabled = false;
          }
        }
      } else {
        // Free camera mode: stop transitioning, re-enable controls
        isTransitioning.current = false;
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      }
    }
  }, [activeShotId, shots]);

  // Per-frame lerp toward shot camera target
  useFrame(() => {
    if (!isTransitioning.current) return;

    const perspCam = camera as THREE.PerspectiveCamera;
    perspCam.position.lerp(targetPos.current, LERP_FACTOR);

    // Also lerp the OrbitControls target (lookAt direction)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, LERP_FACTOR);
    }

    if (perspCam.fov !== undefined) {
      perspCam.fov += (targetFov.current - perspCam.fov) * LERP_FACTOR;
      perspCam.updateProjectionMatrix();
    }

    // Snap when close enough
    const distance = perspCam.position.distanceTo(targetPos.current);
    const fovDelta = Math.abs((perspCam.fov ?? DEFAULT_FOV) - targetFov.current);
    if (distance < TRANSITION_SNAP_THRESHOLD && fovDelta < 0.5) {
      perspCam.position.copy(targetPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      }
      perspCam.fov = targetFov.current;
      perspCam.updateProjectionMatrix();
      isTransitioning.current = false;
      // Re-enable OrbitControls so user can orbit around this shot
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }
  });

  // Listen for camera-preset jump event (from CameraPresetBar)
  useEffect(() => {
    const handlePreset = (event: Event) => {
      const preset = (event as CustomEvent<CameraPreset>).detail;
      if (!preset) return;

      const perspCam = camera as THREE.PerspectiveCamera;
      perspCam.position.set(preset.position[0], preset.position[1], preset.position[2]);
      perspCam.lookAt(new THREE.Vector3(preset.target[0], preset.target[1], preset.target[2]));
      if (preset.fov != null) {
        perspCam.fov = preset.fov;
        perspCam.updateProjectionMatrix();
      }
      // End any active shot transition (user manually navigated)
      isTransitioning.current = false;
    };

    window.addEventListener('director3d-edit/camera-preset', handlePreset);
    return () =>
      window.removeEventListener('director3d-edit/camera-preset', handlePreset);
  }, [camera]);

  // Listen for "add-shot-from-camera" event (from BottomShotsBar)
  useEffect(() => {
    const handleAddShot = () => {
      const perspCam = camera as THREE.PerspectiveCamera;
      const pos = perspCam.position;
      // Derive lookAt target from camera direction
      const dir = new THREE.Vector3();
      perspCam.getWorldDirection(dir);
      const lookTarget = pos.clone().add(dir.multiplyScalar(10));
      const shotCount = useDirector3dEditStore.getState().scene.shots.length;
      const newShot: ShotCamera = {
        id: `shot-${uuid()}`,
        name: `Shot ${shotCount + 1}`,
        position: [pos.x, pos.y, pos.z],
        target: [lookTarget.x, lookTarget.y, lookTarget.z],
        fov: perspCam.fov ?? DEFAULT_FOV,
        thumbnailDataUrl: '',
      };
      addShot(newShot);
      setActiveShot(newShot.id);
    };

    window.addEventListener('director3d-edit/add-shot-from-camera', handleAddShot);
    return () =>
      window.removeEventListener('director3d-edit/add-shot-from-camera', handleAddShot);
  }, [camera, addShot, setActiveShot]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
    />
  );
}

// ---------------------------------------------------------------------------
// EditSceneContent — everything inside Canvas
// ---------------------------------------------------------------------------

function EditSceneContent() {
  const scene = useDirector3dEditStore((s) => s.scene);
  const selectedObject = useDirector3dEditStore((s) => s.selectedObject);
  const gizmoMode = useDirector3dEditStore((s) => s.gizmoMode);
  const selectObject = useDirector3dEditStore((s) => s.selectObject);

  const groupRefs = useRef<Record<string, THREE.Group>>({});

  const handleSelectMannequin = useCallback(
    (id: string) => selectObject({ kind: 'mannequin', id }),
    [selectObject],
  );

  const handleSelectProp = useCallback(
    (id: string) => selectObject({ kind: 'prop', id }),
    [selectObject],
  );

  return (
    <>
      <SceneEnvironment />

      {scene.background.url && <BackgroundSphere url={scene.background.url} />}

      {/* Mannequins */}
      {scene.mannequins.map((m) => (
        <group
          key={m.id}
          ref={(el) => {
            if (el) groupRefs.current[m.id] = el;
          }}
          position={m.position}
          rotation={[0, m.rotationY, 0]}
          scale={[m.scale, m.scale, m.scale]}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectMannequin(m.id);
          }}
        >
          <MannequinPrimitive pose={m.pose} color={m.color} />
        </group>
      ))}

      {/* Props */}
      {scene.props.map((p) => (
        <group
          key={p.id}
          ref={(el) => {
            if (el) groupRefs.current[p.id] = el;
          }}
          position={p.position}
          rotation={[0, p.rotationY, 0]}
          scale={[p.scale, p.scale, p.scale]}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectProp(p.id);
          }}
        >
          <PropPrimitive definitionId={p.definitionId} />
        </group>
      ))}

      {/* Gizmo on selected object */}
      <GizmoController
        selectedObject={selectedObject}
        gizmoMode={gizmoMode}
        groupRefs={groupRefs}
      />

      {/* Deselect on click-empty */}
      <EmptySpaceCatcher />

      {/* Camera + OrbitControls */}
      <CameraController />

      {/* Annotation floating labels */}
      <AnnotationLabelsOverlay />
    </>
  );
}

// ---------------------------------------------------------------------------
// CameraPresetBar — HTML overlay with preset buttons
// ---------------------------------------------------------------------------

function CameraPresetBar() {
  const { t } = useTranslation();
  const addShot = useDirector3dEditStore((s) => s.addShot);
  const setActiveShot = useDirector3dEditStore((s) => s.setActiveShot);

  const jumpTo = useCallback((preset: CameraPreset, shiftKey: boolean) => {
    if (shiftKey) {
      // Shift+click: create a new Shot from this preset
      const shotCount = useDirector3dEditStore.getState().scene.shots.length;
      const newShot: ShotCamera = {
        id: `shot-${uuid()}`,
        name: `Shot ${shotCount + 1}`,
        position: preset.position,
        target: preset.target,
        fov: preset.fov ?? DEFAULT_FOV,
        thumbnailDataUrl: '',
      };
      addShot(newShot);
      setActiveShot(newShot.id);
    } else {
      // Normal click: jump camera to preset position
      window.dispatchEvent(
        new CustomEvent('director3d-edit/camera-preset', { detail: preset }),
      );
    }
  }, [addShot, setActiveShot]);

  return (
    <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
      {CAMERA_PRESETS.map((p) => (
        <button
          key={p.id}
          className="rounded bg-black/60 px-2 py-1 text-xs text-white/80 transition-colors hover:bg-black/80 hover:text-white"
          onClick={(e) => jumpTo(p, e.shiftKey)}
          title={t(p.labelKey)}
        >
          {t(p.labelKey)}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function EditViewport() {
  const { i18n } = useTranslation();

  // --- Subscribe to export-brief event, generate brief, publish result ---
  useEffect(() => {
    const unsub = canvasEventBus.subscribe('director3d/export-brief', (payload: { nodeId: string }) => {
      const state = useDirector3dEditStore.getState();
      const scene = state.scene;
      const language = (i18n.language?.startsWith('zh') ? 'zh' : 'en') as 'zh' | 'en';

      const briefJsonObj = generateSceneBriefJson(scene, {
        language,
        appVersion: '0.1.14',
        sourceProjectId: state.bindNodeId ?? payload.nodeId,
        sourceNodeId: payload.nodeId,
      });
      const briefText = generateSceneBriefText(scene, language);

      const thumbnails = scene.shots.map((shot) => ({
        shotId: shot.id,
        dataUrl: shot.thumbnailDataUrl ?? '',
      }));

      canvasEventBus.publish('director3d/export-brief-result', {
        nodeId: payload.nodeId,
        briefJson: JSON.stringify(briefJsonObj, null, 2),
        briefText,
        thumbnails,
      });
    });
    return () => { unsub(); };
  }, [i18n.language]);

  return (
    <div className="relative h-full w-full">
      <ErrorBoundary>
        <Canvas
          camera={{
            position: DEFAULT_CAMERA_POSITION,
            fov: DEFAULT_FOV,
            near: NEAR,
            far: FAR,
          }}
          shadows
          gl={{ preserveDrawingBuffer: true }}
          onPointerMissed={() => {
            useDirector3dEditStore.getState().selectObject(null);
          }}
        >
          <EditSceneContent />
        </Canvas>
      </ErrorBoundary>
      <CameraPresetBar />
    </div>
  );
}
