/**
 * Right sidebar panel for the 3D director edit mode.
 *
 * Nothing selected -> global scene settings (background, exposure, grid toggle)
 * Mannequin selected -> pose / position / rotationY / scale / color / label / delete
 * Prop selected -> position / rotationY / scale / label / delete
 *
 * All mutations go through editStore actions.
 *
 * @since v0.1.14
 */

import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useDirector3dEditStore } from '../editStore';
import type { SceneMannequin, SceneProp } from '../domain/sceneSchema';
import type { MannequinPose } from '@/features/canvas/3d/mannequin';
import { AnnotationSection } from './AnnotationOverlay';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.1;
const MIN_ROTATION_DEG = 0;
const MAX_ROTATION_DEG = 360;
const ROTATION_STEP = 1;
const POSITION_STEP = 0.1;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const RightInspectorPanel = memo(function RightInspectorPanel() {
  const selectedObject = useDirector3dEditStore((s) => s.selectedObject);
  const scene = useDirector3dEditStore((s) => s.scene);

  // Resolve selected data
  const selectedMannequin =
    selectedObject?.kind === 'mannequin'
      ? scene.mannequins.find((m) => m.id === selectedObject.id) ?? null
      : null;

  const selectedProp =
    selectedObject?.kind === 'prop'
      ? scene.props.find((p) => p.id === selectedObject.id) ?? null
      : null;

  return (
    <div className="h-full overflow-y-auto bg-surface-dark/95">
      {selectedMannequin && (
        <>
          <MannequinInspector data={selectedMannequin} />
          <div className="px-3 pb-3">
            <AnnotationSection target={{ kind: 'mannequin', id: selectedMannequin.id }} />
          </div>
        </>
      )}
      {selectedProp && (
        <>
          <PropInspector data={selectedProp} />
          <div className="px-3 pb-3">
            <AnnotationSection target={{ kind: 'prop', id: selectedProp.id }} />
          </div>
        </>
      )}
      {!selectedObject && <SceneSettingsSection />}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Scene settings (nothing selected)
// ---------------------------------------------------------------------------

function SceneSettingsSection() {
  const { t } = useTranslation();
  const scene = useDirector3dEditStore((s) => s.scene);
  const setBackground = useDirector3dEditStore((s) => s.setBackground);
  const setExposure = useDirector3dEditStore((s) => s.setExposure);
  const setGridVisible = useDirector3dEditStore((s) => s.setGridVisible);

  return (
    <div className="space-y-3 p-3">
      <SectionTitle label={t('director3dEdit.sceneSettings')} />

      {/* Background URL */}
      <LabeledField label={t('director3dEdit.backgroundUrl')}>
        <input
          type="text"
          className="w-full rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          value={scene.background.url ?? ''}
          placeholder="https://..."
          onChange={(e) => setBackground(e.target.value || null)}
        />
      </LabeledField>

      {/* Exposure */}
      <LabeledField label={t('director3dEdit.exposure')}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1 accent-accent"
            value={scene.background.exposure}
            min={0}
            max={3}
            step={0.1}
            onChange={(e) => setExposure(parseFloat(e.target.value))}
          />
          <span className="w-8 text-right text-xs text-white/60">
            {scene.background.exposure.toFixed(1)}
          </span>
        </div>
      </LabeledField>

      {/* Grid toggle */}
      <LabeledField label={t('director3dEdit.showGrid')}>
        <input
          type="checkbox"
          className="accent-accent"
          checked={scene.ground.gridVisible}
          onChange={(e) => setGridVisible(e.target.checked)}
        />
      </LabeledField>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mannequin inspector
// ---------------------------------------------------------------------------

function MannequinInspector({ data }: { data: SceneMannequin }) {
  const { t } = useTranslation();
  const updateMannequin = useDirector3dEditStore((s) => s.updateMannequin);
  const removeMannequin = useDirector3dEditStore((s) => s.removeMannequin);

  const handlePositionChange = useCallback(
    (axis: 0 | 1 | 2, val: number) => {
      const pos: [number, number, number] = [...data.position];
      pos[axis] = val;
      updateMannequin(data.id, { position: pos });
    },
    [data.id, data.position, updateMannequin],
  );

  const handleRotationY = useCallback(
    (deg: number) => updateMannequin(data.id, { rotationY: deg * DEG2RAD }),
    [data.id, updateMannequin],
  );

  const handleScale = useCallback(
    (s: number) => updateMannequin(data.id, { scale: s }),
    [data.id, updateMannequin],
  );

  const handleColor = useCallback(
    (color: string) => updateMannequin(data.id, { color }),
    [data.id, updateMannequin],
  );

  const handleLabel = useCallback(
    (label: string) => updateMannequin(data.id, { label: label || undefined }),
    [data.id, updateMannequin],
  );

  const handlePose = useCallback(
    (pose: MannequinPose) => updateMannequin(data.id, { pose }),
    [data.id, updateMannequin],
  );

  const handleDelete = useCallback(() => {
    removeMannequin(data.id);
  }, [data.id, removeMannequin]);

  const rotationDeg = data.rotationY * RAD2DEG;

  return (
    <div className="space-y-3 p-3">
      <SectionTitle label={t('director3dEdit.mannequin')} />

      {/* Pose */}
      <LabeledField label={t('director3dEdit.pose')}>
        <div className="grid grid-cols-2 gap-1">
          {(['stand', 'sit-chair', 'lean-45', 'lie-flat'] as MannequinPose[]).map((pose) => (
            <button
              key={pose}
              className={`rounded border px-2 py-1 text-xs transition-colors ${
                data.pose === pose
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white/70'
              }`}
              onClick={() => handlePose(pose)}
            >
              {t(`director3dEdit.pose_${pose}`)}
            </button>
          ))}
        </div>
      </LabeledField>

      {/* Position */}
      <PositionField position={data.position} onChange={handlePositionChange} />

      {/* Rotation Y */}
      <LabeledField label={t('director3dEdit.rotationY')}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1 accent-accent"
            value={rotationDeg}
            min={MIN_ROTATION_DEG}
            max={MAX_ROTATION_DEG}
            step={ROTATION_STEP}
            onChange={(e) => handleRotationY(parseFloat(e.target.value))}
          />
          <span className="w-10 text-right text-xs text-white/60">
            {Math.round(rotationDeg)}&deg;
          </span>
        </div>
      </LabeledField>

      {/* Scale */}
      <LabeledField label={t('director3dEdit.scale')}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1 accent-accent"
            value={data.scale}
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={SCALE_STEP}
            onChange={(e) => handleScale(parseFloat(e.target.value))}
          />
          <span className="w-8 text-right text-xs text-white/60">
            {data.scale.toFixed(1)}
          </span>
        </div>
      </LabeledField>

      {/* Color */}
      <LabeledField label={t('director3dEdit.color')}>
        <input
          type="color"
          className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent"
          value={data.color}
          onChange={(e) => handleColor(e.target.value)}
        />
      </LabeledField>

      {/* Label */}
      <LabeledField label={t('director3dEdit.label')}>
        <input
          type="text"
          className="w-full rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          value={data.label ?? ''}
          placeholder={t('director3dEdit.labelPlaceholder')}
          onChange={(e) => handleLabel(e.target.value)}
        />
      </LabeledField>

      {/* Delete */}
      <DeleteButton onClick={handleDelete} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prop inspector
// ---------------------------------------------------------------------------

function PropInspector({ data }: { data: SceneProp }) {
  const { t } = useTranslation();
  const updateProp = useDirector3dEditStore((s) => s.updateProp);
  const removeProp = useDirector3dEditStore((s) => s.removeProp);

  const handlePositionChange = useCallback(
    (axis: 0 | 1 | 2, val: number) => {
      const pos: [number, number, number] = [...data.position];
      pos[axis] = val;
      updateProp(data.id, { position: pos });
    },
    [data.id, data.position, updateProp],
  );

  const handleRotationY = useCallback(
    (deg: number) => updateProp(data.id, { rotationY: deg * DEG2RAD }),
    [data.id, updateProp],
  );

  const handleScale = useCallback(
    (s: number) => updateProp(data.id, { scale: s }),
    [data.id, updateProp],
  );

  const handleLabel = useCallback(
    (label: string) => updateProp(data.id, { label: label || undefined }),
    [data.id, updateProp],
  );

  const handleDelete = useCallback(() => {
    removeProp(data.id);
  }, [data.id, removeProp]);

  const rotationDeg = data.rotationY * RAD2DEG;

  return (
    <div className="space-y-3 p-3">
      <SectionTitle label={t('director3dEdit.prop')} />

      {/* Position */}
      <PositionField position={data.position} onChange={handlePositionChange} />

      {/* Rotation Y */}
      <LabeledField label={t('director3dEdit.rotationY')}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1 accent-accent"
            value={rotationDeg}
            min={MIN_ROTATION_DEG}
            max={MAX_ROTATION_DEG}
            step={ROTATION_STEP}
            onChange={(e) => handleRotationY(parseFloat(e.target.value))}
          />
          <span className="w-10 text-right text-xs text-white/60">
            {Math.round(rotationDeg)}&deg;
          </span>
        </div>
      </LabeledField>

      {/* Scale */}
      <LabeledField label={t('director3dEdit.scale')}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1 accent-accent"
            value={data.scale}
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={SCALE_STEP}
            onChange={(e) => handleScale(parseFloat(e.target.value))}
          />
          <span className="w-8 text-right text-xs text-white/60">
            {data.scale.toFixed(1)}
          </span>
        </div>
      </LabeledField>

      {/* Label */}
      <LabeledField label={t('director3dEdit.label')}>
        <input
          type="text"
          className="w-full rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          value={data.label ?? ''}
          placeholder={t('director3dEdit.labelPlaceholder')}
          onChange={(e) => handleLabel(e.target.value)}
        />
      </LabeledField>

      {/* Delete */}
      <DeleteButton onClick={handleDelete} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared field components
// ---------------------------------------------------------------------------

function SectionTitle({ label }: { label: string }) {
  return (
    <h3 className="border-b border-white/10 pb-1 text-xs font-semibold uppercase tracking-wider text-white/60">
      {label}
    </h3>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-white/50">{label}</label>
      {children}
    </div>
  );
}

function PositionField({
  position,
  onChange,
}: {
  position: [number, number, number];
  onChange: (axis: 0 | 1 | 2, val: number) => void;
}) {
  const axes: [0 | 1 | 2, string][] = [
    [0, 'X'],
    [1, 'Y'],
    [2, 'Z'],
  ];

  return (
    <div className="grid grid-cols-3 gap-1">
      {axes.map(([idx, label]) => (
        <label key={label} className="flex items-center gap-1 text-xs text-white/50">
          <span className="w-3">{label}</span>
          <input
            type="number"
            className="w-full rounded border border-white/10 bg-white/5 px-1 py-0.5 text-xs text-white focus:outline-none focus:border-white/30"
            value={Number(position[idx].toFixed(2))}
            step={POSITION_STEP}
            onChange={(e) => onChange(idx, parseFloat(e.target.value) || 0)}
          />
        </label>
      ))}
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  return (
    <button
      className="w-full rounded border border-red-400/30 py-1.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors"
      onClick={onClick}
    >
      {t('director3dEdit.delete')}
    </button>
  );
}