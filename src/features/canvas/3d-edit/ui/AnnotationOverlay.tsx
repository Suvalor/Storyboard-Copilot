/**
 * Annotation overlay for the 3D viewport.
 *
 * Renders floating HTML labels on mannequins/props that have annotations.
 * Uses drei's <Html> component to project 3D positions into screen space.
 * Also provides the annotation management UI in RightInspectorPanel.
 *
 * @since v0.1.14
 */

import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Html } from '@react-three/drei';
import { v4 as uuid } from 'uuid';

import { useDirector3dEditStore } from '../editStore';
import type { SceneAnnotation, AnnotationTarget } from '../domain/sceneSchema';

// ---------------------------------------------------------------------------
// 3D Viewport overlay: renders annotation labels floating above objects
// ---------------------------------------------------------------------------

/** Renders all annotations as HTML overlays in the 3D viewport. */
export function AnnotationLabelsOverlay() {
  const scene = useDirector3dEditStore((s) => s.scene);

  // Build a map of object positions for annotation placement
  const objectPositions = buildObjectPositionMap(scene);

  return (
    <>
      {scene.annotations.map((annotation) => {
        const pos = objectPositions.get(annotation.attachTo.id);
        if (!pos) return null;

        return (
          <Html
            key={annotation.id}
            position={[pos[0], pos[1] + 0.3, pos[2]]}
            center
            distanceFactor={8}
            style={{ pointerEvents: 'none' }}
          >
            <div className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] leading-tight text-white/90 whitespace-nowrap">
              {annotation.text}
            </div>
          </Html>
        );
      })}
    </>
  );
}

/** Build a map from object ID to its world position. */
function buildObjectPositionMap(
  scene: ReturnType<typeof useDirector3dEditStore.getState>['scene'],
): Map<string, [number, number, number]> {
  const map = new Map<string, [number, number, number]>();
  for (const m of scene.mannequins) {
    map.set(m.id, m.position);
  }
  for (const p of scene.props) {
    map.set(p.id, p.position);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Right Inspector Panel section: annotation management
// ---------------------------------------------------------------------------

interface AnnotationSectionProps {
  target: AnnotationTarget;
}

/** Section shown in RightInspectorPanel when an object is selected. */
export const AnnotationSection = memo(function AnnotationSection({ target }: AnnotationSectionProps) {
  const { t } = useTranslation();
  const scene = useDirector3dEditStore((s) => s.scene);
  const addAnnotation = useDirector3dEditStore((s) => s.addAnnotation);
  const removeAnnotation = useDirector3dEditStore((s) => s.removeAnnotation);

  const [newText, setNewText] = useState('');
  const [newLang, setNewLang] = useState<'zh' | 'en'>('zh');

  const annotations = scene.annotations.filter(
    (a) => a.attachTo.kind === target.kind && a.attachTo.id === target.id,
  );

  const handleAdd = useCallback(() => {
    const trimmed = newText.trim();
    if (trimmed.length === 0) return;

    const annotation: SceneAnnotation = {
      id: uuid(),
      attachTo: { kind: target.kind, id: target.id },
      text: trimmed,
      language: newLang,
    };
    addAnnotation(annotation);
    setNewText('');
  }, [newText, newLang, target, addAnnotation]);

  const handleRemove = useCallback(
    (id: string) => removeAnnotation(id),
    [removeAnnotation],
  );

  return (
    <div className="space-y-2 border-t border-white/10 pt-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {t('director3dEdit.annotation.title')}
      </h4>

      {/* Existing annotations */}
      {annotations.length === 0 && (
        <p className="text-xs text-white/30">
          {t('director3dEdit.annotation.empty')}
        </p>
      )}
      {annotations.map((a) => (
        <div key={a.id} className="flex items-start gap-1">
          <span className="flex-1 text-xs text-white/70">{a.text}</span>
          <button
            className="shrink-0 text-xs text-red-400/70 hover:text-red-400"
            onClick={() => handleRemove(a.id)}
            title={t('director3dEdit.annotation.delete')}
          >
            &times;
          </button>
        </div>
      ))}

      {/* Add annotation form */}
      <div className="space-y-1">
        <input
          type="text"
          className="w-full rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          value={newText}
          placeholder={t('director3dEdit.annotation.textPlaceholder')}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-white/50">
            <input
              type="radio"
              className="accent-accent"
              checked={newLang === 'zh'}
              onChange={() => setNewLang('zh')}
            />
            {t('director3dEdit.annotation.languageZh')}
          </label>
          <label className="flex items-center gap-1 text-xs text-white/50">
            <input
              type="radio"
              className="accent-accent"
              checked={newLang === 'en'}
              onChange={() => setNewLang('en')}
            />
            {t('director3dEdit.annotation.languageEn')}
          </label>
          <div className="flex-1" />
          <button
            className="rounded bg-accent/80 px-2 py-0.5 text-xs text-white hover:bg-accent disabled:opacity-40"
            disabled={newText.trim().length === 0}
            onClick={handleAdd}
          >
            {t('director3dEdit.annotation.add')}
          </button>
        </div>
      </div>
    </div>
  );
});

AnnotationSection.displayName = 'AnnotationSection';
