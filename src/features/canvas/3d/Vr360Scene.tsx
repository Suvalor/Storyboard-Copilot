import { useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';

// --- Panorama sphere ---

function PanoramaSphere({ url }: { url: string }) {
  const loader = new THREE.TextureLoader();
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh>
      <sphereGeometry args={[50, 60, 40]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} />
    </mesh>
  );
}

// --- Hover parallax camera controller ---

function HoverParallaxController({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const mousePos = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;
      mousePos.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mousePos.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    [enabled],
  );

  useFrame(() => {
    if (!enabled) return;
    targetRotation.current.y = mousePos.current.x * 0.3;
    targetRotation.current.x = mousePos.current.y * 0.15;

    camera.rotation.y += (targetRotation.current.y - camera.rotation.y) * 0.03;
    camera.rotation.x += (targetRotation.current.x - camera.rotation.x) * 0.03;
  });

  // Register mouse listener
  useState(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  });

  return null;
}

// --- Immersive mode camera ---

function ImmersiveCamera({ active }: { active: boolean }) {
  const { camera } = useThree();

  useFrame(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = active ? 90 : 75;
      camera.fov += (targetFov - camera.fov) * 0.05;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

// --- Main VR360 scene ---

export interface Vr360SceneProps {
  backgroundUrl: string | null;
  onExportImage: (dataUrl: string, mode: 'single' | '4-grid' | '12-grid') => void;
}

export function Vr360Scene({ backgroundUrl, onExportImage }: Vr360SceneProps) {
  const { t } = useTranslation();
  const [parallaxEnabled, setParallaxEnabled] = useState(true);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExportSingle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onExportImage(canvas.toDataURL('image/png'), 'single');
  }, [onExportImage]);

  const handleExportGrid = useCallback((layout: '4-grid' | '12-grid') => {
    if (!backgroundUrl) return;
    // For grid export, we use the panorama projection module
    onExportImage('', layout);
  }, [backgroundUrl, onExportImage]);

  return (
    <div className="flex h-full w-full flex-col">
      {/* 3D Canvas */}
      <div className="relative flex-1">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 0, 0.01], fov: 75, near: 0.1, far: 100 }}
          gl={{ preserveDrawingBuffer: true }}
        >
          <ambientLight intensity={0.5} />
          {backgroundUrl && <PanoramaSphere url={backgroundUrl} />}
          <HoverParallaxController enabled={parallaxEnabled} />
          <ImmersiveCamera active={immersiveMode} />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            enableZoom={false}
            enablePan={false}
            rotateSpeed={-0.3}
          />
        </Canvas>

        {/* Immersive mode overlay */}
        {immersiveMode && (
          <button
            className="absolute right-3 top-3 rounded bg-black/60 px-3 py-1.5 text-sm text-white hover:bg-black/80"
            onClick={() => setImmersiveMode(false)}
          >
            {t('node.vr360.exitImmersive')}
          </button>
        )}
      </div>

      {/* Controls */}
      {!immersiveMode && (
        <div className="flex items-center gap-2 border-t border-white/10 bg-surface-dark/90 p-2 text-xs">
          <button
            className={`rounded px-2 py-1 ${parallaxEnabled ? 'bg-accent text-white' : 'bg-white/10 text-text-muted hover:bg-white/20'}`}
            onClick={() => setParallaxEnabled(!parallaxEnabled)}
          >
            {parallaxEnabled ? t('node.vr360.parallaxOn') : t('node.vr360.parallaxOff')}
          </button>

          <button
            className="rounded bg-white/10 px-2 py-1 text-text-muted hover:bg-accent hover:text-white"
            onClick={() => setImmersiveMode(true)}
          >
            {t('node.vr360.immersiveMode')}
          </button>

          <div className="mx-1 h-4 w-px bg-white/20" />

          <span className="text-text-muted">{t('node.vr360.export')}</span>
          <button
            className="rounded bg-white/10 px-2 py-1 text-text-muted hover:bg-accent hover:text-white"
            onClick={handleExportSingle}
          >
            {t('node.vr360.exportSingle')}
          </button>
          <button
            className="rounded bg-white/10 px-2 py-1 text-text-muted hover:bg-accent hover:text-white"
            onClick={() => handleExportGrid('4-grid')}
          >
            {t('node.vr360.export4Grid')}
          </button>
          <button
            className="rounded bg-white/10 px-2 py-1 text-text-muted hover:bg-accent hover:text-white"
            onClick={() => handleExportGrid('12-grid')}
          >
            {t('node.vr360.export12Grid')}
          </button>
        </div>
      )}
    </div>
  );
}
