/**
 * Top toolbar for the 3D director edit mode.
 *
 * Provides Gizmo mode toggle (W/E/R), Undo/Redo, and Apply/Cancel buttons.
 * Keyboard shortcuts: W=Translate, E=Rotate, R=Scale, Cmd+Enter=Apply, Esc=Cancel.
 * Shortcuts are suppressed when an input/textarea is focused (isTypingTarget check).
 *
 * @since v0.1.14
 */

import { memo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Move3d, RotateCcw, Maximize2, Undo2, Redo2, Check, X, FileText } from 'lucide-react';

import { useDirector3dEditStore } from '../editStore';
import type { GizmoMode } from '../domain/sceneSchema';
import { UiButton, UiIconButton } from '@/components/ui/primitives';
import { canvasEventBus } from '@/features/canvas/application/canvasServices';

/** Check if the current focus target is a text input element. */
function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || element.isContentEditable;
}

/** Toolbar for the 3D director edit modal. */
interface TopToolbarProps {
  onApply: () => void;
  onCancel: () => void;
}

export const TopToolbar = memo(function TopToolbar({ onApply, onCancel }: TopToolbarProps) {
  const { t } = useTranslation();

  const gizmoMode = useDirector3dEditStore((s) => s.gizmoMode);
  const editHistory = useDirector3dEditStore((s) => s.editHistory);
  const setGizmoMode = useDirector3dEditStore((s) => s.setGizmoMode);
  const undo = useDirector3dEditStore((s) => s.undo);
  const redo = useDirector3dEditStore((s) => s.redo);

  const canUndo = editHistory.past.length > 0;
  const canRedo = editHistory.future.length > 0;

  const handleGizmoMode = useCallback(
    (mode: GizmoMode) => setGizmoMode(mode),
    [setGizmoMode],
  );

  const handleUndo = useCallback(() => undo(), [undo]);
  const handleRedo = useCallback(() => redo(), [redo]);

  const bindNodeId = useDirector3dEditStore((s) => s.bindNodeId);

  const handleExportBrief = useCallback(() => {
    const nodeId = bindNodeId;
    if (!nodeId) return;
    canvasEventBus.publish('director3d/export-brief', { nodeId });
  }, [bindNodeId]);

  // Keyboard shortcuts for Gizmo mode + Undo/Redo + Apply/Cancel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const cmd = event.ctrlKey || event.metaKey;

      // Gizmo shortcuts: W / E / R
      if (key === 'w') {
        event.preventDefault();
        setGizmoMode('translate');
        return;
      }
      if (key === 'e') {
        event.preventDefault();
        setGizmoMode('rotate');
        return;
      }
      if (key === 'r') {
        event.preventDefault();
        setGizmoMode('scale');
        return;
      }

      // Undo / Redo
      if (cmd && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (cmd && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setGizmoMode, undo, redo]);

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {/* Gizmo mode buttons */}
      <div className="flex items-center gap-1">
        <UiIconButton
          active={gizmoMode === 'translate'}
          onClick={() => handleGizmoMode('translate')}
          title={t('director3dEdit.gizmo.translate') + ' (W)'}
          className="h-8 w-8"
        >
          <Move3d className="h-4 w-4" />
        </UiIconButton>
        <UiIconButton
          active={gizmoMode === 'rotate'}
          onClick={() => handleGizmoMode('rotate')}
          title={t('director3dEdit.gizmo.rotate') + ' (E)'}
          className="h-8 w-8"
        >
          <RotateCcw className="h-4 w-4" />
        </UiIconButton>
        <UiIconButton
          active={gizmoMode === 'scale'}
          onClick={() => handleGizmoMode('scale')}
          title={t('director3dEdit.gizmo.scale') + ' (R)'}
          className="h-8 w-8"
        >
          <Maximize2 className="h-4 w-4" />
        </UiIconButton>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-white/10" />

      {/* Undo / Redo */}
      <UiIconButton
        disabled={!canUndo}
        onClick={handleUndo}
        title={t('director3dEdit.toolbar.undo')}
        className="h-8 w-8"
      >
        <Undo2 className="h-4 w-4" />
      </UiIconButton>
      <UiIconButton
        disabled={!canRedo}
        onClick={handleRedo}
        title={t('director3dEdit.toolbar.redo')}
        className="h-8 w-8"
      >
        <Redo2 className="h-4 w-4" />
      </UiIconButton>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export Scene Brief */}
      <UiButton variant="ghost" size="sm" onClick={handleExportBrief} title={t('director3dEdit.toolbar.exportBrief')}>
        <FileText className="h-4 w-4 mr-1" />
        {t('director3dEdit.toolbar.exportBrief')}
      </UiButton>

      {/* Apply / Cancel */}
      <UiButton variant="primary" size="sm" onClick={onApply} title={t('director3dEdit.toolbar.apply') + ' (Cmd+Enter)'}>
        <Check className="h-4 w-4 mr-1" />
        {t('director3dEdit.toolbar.apply')}
      </UiButton>
      <UiButton variant="ghost" size="sm" onClick={onCancel} title={t('director3dEdit.toolbar.cancel') + ' (Esc)'}>
        <X className="h-4 w-4 mr-1" />
        {t('director3dEdit.toolbar.cancel')}
      </UiButton>
    </div>
  );
});

TopToolbar.displayName = 'TopToolbar';