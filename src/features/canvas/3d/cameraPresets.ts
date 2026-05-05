export interface CameraPreset {
  id: string;
  labelKey: string;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'front', labelKey: 'node.director3d.cameraFront', position: [0, 1.6, 5], target: [0, 1, 0] },
  { id: 'right', labelKey: 'node.director3d.cameraRight', position: [5, 1.6, 0], target: [0, 1, 0] },
  { id: 'back', labelKey: 'node.director3d.cameraBack', position: [0, 1.6, -5], target: [0, 1, 0] },
  { id: 'left', labelKey: 'node.director3d.cameraLeft', position: [-5, 1.6, 0], target: [0, 1, 0] },
  { id: 'top', labelKey: 'node.director3d.cameraTop', position: [0, 8, 0.01], target: [0, 0, 0] },
  { id: 'bottom', labelKey: 'node.director3d.cameraBottom', position: [0, -2, 5], target: [0, 1, 0] },
  { id: 'three-quarter', labelKey: 'node.director3d.cameraThreeQuarter', position: [3.5, 2.5, 3.5], target: [0, 1, 0] },
  { id: 'close-up', labelKey: 'node.director3d.cameraCloseUp', position: [0, 1.6, 2], target: [0, 1.4, 0], fov: 50 },
  { id: 'wide', labelKey: 'node.director3d.cameraWide', position: [0, 3, 10], target: [0, 0, 0], fov: 90 },
  { id: 'dutch', labelKey: 'node.director3d.cameraDutch', position: [3, 2, 4], target: [0, 1, 0], fov: 65 },
];

export function getPresetById(id: string): CameraPreset | undefined {
  return CAMERA_PRESETS.find((p) => p.id === id);
}
