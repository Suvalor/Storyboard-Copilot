import type { ImageModelDefinition } from '../../types';

const MAAS_ASTRON_MODEL_ID = 'maas/astron-code-latest';

const MAAS_ASTRON_ASPECT_RATIOS = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '21:9',
] as const;

export const imageModel: ImageModelDefinition = {
  id: MAAS_ASTRON_MODEL_ID,
  mediaType: 'image',
  displayName: '星火 Astron',
  providerId: 'maas',
  description: 'MAAS · 讯飞星火 Astron 图像生成',
  eta: '2min',
  expectedDurationMs: 120000,
  defaultAspectRatio: '1:1',
  defaultResolution: '2K',
  aspectRatios: MAAS_ASTRON_ASPECT_RATIOS.map((value) => ({ value, label: value })),
  resolutions: [
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
    { value: '4K', label: '4K' },
  ],
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: MAAS_ASTRON_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '编辑模式' : '生成模式',
  }),
};