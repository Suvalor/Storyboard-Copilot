import { useRef, useMemo } from 'react';
import * as THREE from 'three';

interface SceneEnvironmentProps {
  fogNear?: number;
  fogFar?: number;
  fogColor?: string;
  groundColor?: string;
  gridVisible?: boolean;
}

export function SceneEnvironment({
  fogNear = 30,
  fogFar = 80,
  fogColor = '#1a1a2e',
  groundColor = '#2a2a3e',
  gridVisible = true,
}: SceneEnvironmentProps) {
  const groundRef = useRef<THREE.Mesh>(null);

  const groundMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: groundColor,
        roughness: 0.9,
        metalness: 0.0,
      }),
    [groundColor],
  );

  return (
    <>
      {/* Ambient light — soft fill */}
      <ambientLight intensity={0.4} color="#e8e8f0" />

      {/* Directional light — main sun-like light */}
      <directionalLight
        position={[5, 8, 3]}
        intensity={0.8}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Fill light — opposite side */}
      <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#c8d0e0" />

      {/* Point light — accent */}
      <pointLight position={[0, 3, 0]} intensity={0.2} color="#f0e0ff" distance={15} decay={2} />

      {/* Fog */}
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      {/* Ground plane */}
      <mesh
        ref={groundRef}
        rotation-x={-Math.PI / 2}
        position-y={0}
        receiveShadow
        material={groundMaterial}
      >
        <planeGeometry args={[50, 50]} />
      </mesh>

      {/* Grid helper */}
      {gridVisible && (
        <gridHelper args={[20, 20, '#444466', '#333355']} position-y={0.005} />
      )}
    </>
  );
}
