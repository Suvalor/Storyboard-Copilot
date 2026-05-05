import * as THREE from 'three';

/**
 * Renders a depth map from the given scene and camera.
 * Uses MeshDepthMaterial to capture depth, then applies gamma correction.
 */
export function exportDepthMap(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width = 1024,
  height = 768,
  gamma = 0.8,
): string {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.BasicDepthPacking,
  });

  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      originalMaterials.set(child, child.material);
      child.material = depthMaterial;
    }
  });

  renderer.render(scene, camera);

  const gl = renderer.getContext();
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  // Apply gamma correction and flip vertically
  const corrected = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = ((height - 1 - y) * width + x) * 4;
      const dstIdx = (y * width + x) * 4;
      corrected[dstIdx] = Math.min(255, Math.pow(pixels[srcIdx] / 255, gamma) * 255);
      corrected[dstIdx + 1] = Math.min(255, Math.pow(pixels[srcIdx + 1] / 255, gamma) * 255);
      corrected[dstIdx + 2] = Math.min(255, Math.pow(pixels[srcIdx + 2] / 255, gamma) * 255);
      corrected[dstIdx + 3] = 255;
    }
  }

  // Restore original materials
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const original = originalMaterials.get(child);
      if (original !== undefined) {
        child.material = original;
      }
    }
  });

  // Create canvas and export
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(corrected);
  ctx.putImageData(imageData, 0, 0);

  renderer.dispose();

  return canvas.toDataURL('image/png');
}
