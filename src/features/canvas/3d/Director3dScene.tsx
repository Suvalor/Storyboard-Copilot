import { useRef, useCallback, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';

import { CAMERA_PRESETS, type CameraPreset } from './cameraPresets';
import { createMannequinGeometry, type MannequinPose, type MannequinInstance, ALL_POSES } from './mannequin';
import { getPropsByCategory, type PropDefinition, type PropCategory, PROP_CATEGORIES } from './props';
import { SceneEnvironment } from './sceneEnvironment';

// --- Internal 3D objects ---

interface MannequinObjectProps {
  instance: MannequinInstance;
  onRemove: (id: string) => void;
}

function MannequinObject({ instance, onRemove }: MannequinObjectProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...instance.position);
      groupRef.current.rotation.y = instance.rotation;
    }
  });

  const geometry = createMannequinGeometry(instance.pose);

  return (
    <primitive
      ref={groupRef}
      object={geometry}
      position={instance.position}
      rotation={[0, instance.rotation, 0]}
      onClick={() => onRemove(instance.id)}
    />
  );
}

interface PropObjectProps {
  definition: PropDefinition;
  position: [number, number, number];
  rotation?: number;
}

function PropObject({ definition, position, rotation = 0 }: PropObjectProps) {
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
  const texture = useRef<THREE.Texture | null>(null);

  const loader = new THREE.TextureLoader();
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  texture.current = tex;

  return (
    <mesh>
      <sphereGeometry args={[50, 60, 40]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} />
    </mesh>
  );
}

// --- Camera preset transition ---

function CameraController({ preset }: { preset: CameraPreset | null }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 1.6, 5));
  const targetLookAt = useRef(new THREE.Vector3(0, 1, 0));

  useFrame(() => {
    if (preset) {
      targetPos.current.set(...preset.position);
      targetLookAt.current.set(...preset.target);
    }
    camera.position.lerp(targetPos.current, 0.05);
    if (camera instanceof THREE.PerspectiveCamera && preset?.fov) {
      camera.fov += (preset.fov - camera.fov) * 0.05;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

// --- Main scene component ---

export interface Director3dSceneProps {
  backgroundUrl: string | null;
  mannequins: MannequinInstance[];
  placedProps: { definition: PropDefinition; position: [number, number, number]; rotation: number }[];
  onAddMannequin: (pose: MannequinPose) => void;
  onRemoveMannequin: (id: string) => void;
  onAddProp: (definition: PropDefinition) => void;
  onExportViewport: (dataUrl: string) => void;
  onExportDepth: (dataUrl: string) => void;
}

export function Director3dScene({
  backgroundUrl,
  mannequins,
  placedProps,
  onAddMannequin,
  onRemoveMannequin,
  onAddProp,
  onExportViewport,
  onExportDepth,
}: Director3dSceneProps) {
  const { t } = useTranslation();
  const [activePreset, setActivePreset] = useState<CameraPreset | null>(CAMERA_PRESETS[0]);
  const [selectedCategory, setSelectedCategory] = useState<PropCategory>('indoor-furniture');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExportViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onExportViewport(canvas.toDataURL('image/png'));
  }, [onExportViewport]);

  const handleExportDepth = useCallback(() => {
    // Depth export will be triggered from the 3D context
    onExportDepth('');
  }, [onExportDepth]);

  return (
    <div className="flex h-full w-full flex-col">
      {/* 3D Canvas */}
      <div className="relative flex-1">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 1.6, 5], fov: 50, near: 0.1, far: 100 }}
          shadows
          gl={{ preserveDrawingBuffer: true }}
        >
          <SceneEnvironment />
          <CameraController preset={activePreset} />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            minDistance={1}
            maxDistance={30}
            target={[0, 1, 0]}
          />

          {backgroundUrl && <PanoramaSphere url={backgroundUrl} />}

          {mannequins.map((m) => (
            <MannequinObject key={m.id} instance={m} onRemove={onRemoveMannequin} />
          ))}

          {placedProps.map((p, i) => (
            <PropObject
              key={`${p.definition.id}-${i}`}
              definition={p.definition}
              position={p.position}
              rotation={p.rotation}
            />
          ))}
        </Canvas>
      </div>

      {/* Control panels */}
      <div className="flex gap-1 border-t border-white/10 bg-surface-dark/90 p-2 text-xs">
        {/* Camera presets */}
        <div className="flex flex-col gap-1">
          <span className="text-text-muted">{t('node.director3d.cameraPresets')}</span>
          <div className="flex flex-wrap gap-1">
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`rounded px-1.5 py-0.5 ${activePreset?.id === preset.id ? 'bg-accent text-white' : 'bg-white/10 text-text-muted hover:bg-white/20'}`}
                onClick={() => setActivePreset(preset)}
              >
                {t(preset.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Mannequin controls */}
        <div className="flex flex-col gap-1 border-l border-white/10 pl-2">
          <span className="text-text-muted">{t('node.director3d.mannequin')}</span>
          <div className="flex gap-1">
            {ALL_POSES.map((pose) => (
              <button
                key={pose}
                className="rounded bg-white/10 px-1.5 py-0.5 text-text-muted hover:bg-accent hover:text-white"
                onClick={() => onAddMannequin(pose)}
              >
                {pose === 'stand' ? t('node.director3d.poseStand') : pose === 'sit-chair' ? t('node.director3d.poseSit') : pose === 'lean-45' ? t('node.director3d.poseLean') : t('node.director3d.poseLie')}
              </button>
            ))}
          </div>
        </div>

        {/* Props */}
        <div className="flex flex-col gap-1 border-l border-white/10 pl-2">
          <span className="text-text-muted">{t('node.director3d.props')}</span>
          <div className="flex gap-1">
            {PROP_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`rounded px-1.5 py-0.5 ${selectedCategory === cat.id ? 'bg-accent text-white' : 'bg-white/10 text-text-muted hover:bg-white/20'}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {getPropsByCategory(selectedCategory).map((prop) => (
              <button
                key={prop.id}
                className="rounded bg-white/10 px-1.5 py-0.5 text-text-muted hover:bg-accent hover:text-white"
                onClick={() => onAddProp(prop)}
              >
                {prop.label}
              </button>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="flex flex-col gap-1 border-l border-white/10 pl-2">
          <span className="text-text-muted">{t('node.director3d.export')}</span>
          <div className="flex gap-1">
            <button
              className="rounded bg-white/10 px-1.5 py-0.5 text-text-muted hover:bg-accent hover:text-white"
              onClick={handleExportViewport}
            >
              {t('node.director3d.exportViewport')}
            </button>
            <button
              className="rounded bg-white/10 px-1.5 py-0.5 text-text-muted hover:bg-accent hover:text-white"
              onClick={handleExportDepth}
            >
              {t('node.director3d.exportDepth')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
