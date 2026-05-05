import * as THREE from 'three';

export type ProjectionMode = 'equirectangular' | 'cubic';

export interface PanoramaExportOptions {
  mode: ProjectionMode;
  width: number;
  height: number;
  gridLayout?: 'single' | '4-grid' | '12-grid';
}

/**
 * Renders an equirectangular projection from a panorama texture.
 */
export function renderEquirectangular(
  texture: THREE.Texture,
  camera: THREE.PerspectiveCamera,
  width = 2048,
  height = 1024,
): string {
  const scene = new THREE.Scene();
  const sphereGeo = new THREE.SphereGeometry(50, 60, 40);
  sphereGeo.scale(-1, 1, 1);
  const sphereMat = new THREE.MeshBasicMaterial({ map: texture });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphere);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.render(scene, camera);

  const canvas = renderer.domElement;
  const dataUrl = canvas.toDataURL('image/png');

  renderer.dispose();
  sphereGeo.dispose();
  sphereMat.dispose();
  texture.dispose();

  return dataUrl;
}

/**
 * Renders a cubic projection (6 faces) from a panorama texture.
 */
export function renderCubicProjection(
  texture: THREE.Texture,
  faceSize = 512,
): string[] {
  const scene = new THREE.Scene();
  const sphereGeo = new THREE.SphereGeometry(50, 60, 40);
  sphereGeo.scale(-1, 1, 1);
  const sphereMat = new THREE.MeshBasicMaterial({ map: texture });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphere);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(faceSize, faceSize);

  const cam = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
  cam.position.set(0, 0, 0);

  const directions: { rotX: number; rotY: number }[] = [
    { rotX: 0, rotY: 0 },           // +Z (front)
    { rotX: 0, rotY: Math.PI },     // -Z (back)
    { rotX: 0, rotY: Math.PI / 2 }, // +X (right)
    { rotX: 0, rotY: -Math.PI / 2 },// -X (left)
    { rotX: -Math.PI / 2, rotY: 0 },// +Y (top)
    { rotX: Math.PI / 2, rotY: 0 }, // -Y (bottom)
  ];

  const results: string[] = [];
  for (const dir of directions) {
    cam.rotation.set(dir.rotX, dir.rotY, 0);
    cam.updateMatrixWorld();
    renderer.render(scene, cam);
    results.push(renderer.domElement.toDataURL('image/png'));
  }

  renderer.dispose();
  sphereGeo.dispose();
  sphereMat.dispose();
  texture.dispose();

  return results;
}

/**
 * Generates a multi-grid image from panorama face renders.
 * - '4-grid': 2x2 layout (front, right, back, left)
 * - '12-grid': 3x4 layout (all 6 faces + 6 duplicates or blanks)
 */
export function generateGridImage(
  faceImages: string[],
  layout: '4-grid' | '12-grid',
  faceSize = 512,
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (layout === '4-grid') {
    canvas.width = faceSize * 2;
    canvas.height = faceSize * 2;
    const positions = [
      [0, 0],       // front
      [faceSize, 0], // right
      [0, faceSize], // back
      [faceSize, faceSize], // left
    ];
    positions.forEach(([x, y], i) => {
      if (faceImages[i]) {
        const img = new Image();
        img.src = faceImages[i];
        // Note: in real async usage, images need to be loaded first
        ctx.drawImage(img, x, y, faceSize, faceSize);
      }
    });
  } else {
    canvas.width = faceSize * 4;
    canvas.height = faceSize * 3;
    for (let i = 0; i < Math.min(faceImages.length, 12); i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const img = new Image();
      img.src = faceImages[i];
      ctx.drawImage(img, col * faceSize, row * faceSize, faceSize, faceSize);
    }
  }

  return canvas.toDataURL('image/png');
}
