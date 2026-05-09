/**
 * Full-screen modal for the 3D director edit mode.
 *
 * Three-column layout:
 *   - Left:  Asset panel (characters / props)
 *   - Center: 3D viewport (R3F + Gizmo)
 *   - Right:  Property inspector (selected object / scene settings)
 *   - Top:    TopToolbar (Gizmo, Undo/Redo, Apply/Cancel)
 *   - Bottom: Shot bar (BottomShotsBar)
 *
 * Enter/exit via canvasEventBus 'director3d/enter-edit' / 'director3d/exit-edit'.
 * Uses useDialogTransition for 180ms fade animation.
 * Esc = Cancel (with dirty-check confirm), Cmd+Enter = Apply.
 *
 * @since v0.1.14
 */

import { memo, useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDialogTransition } from '@/components/ui/useDialogTransition';
import { UI_DIALOG_TRANSITION_MS } from '@/components/ui/motion';
import { canvasEventBus } from '@/features/canvas/application/canvasServices';
import { useDirector3dEditStore } from './editStore';
import { loadFromNode, commitToNode, discard } from './application/editService';
import { TopToolbar } from './ui/TopToolbar';
import { LeftAssetPanel } from './ui/LeftAssetPanel';
import { EditViewport } from './ui/EditViewport';
import { RightInspectorPanel } from './ui/RightInspectorPanel';
import { BottomShotsBar } from './ui/BottomShotsBar';
import { ExportBriefDialog } from './ui/ExportBriefDialog';

const TRANSITION_MS = UI_DIALOG_TRANSITION_MS;

/** Full-screen modal for the 3D director edit mode. */
export const Director3dEditModal = memo(function Director3dEditModal() {
  const { t } = useTranslation();

  // Internal open state driven by the event bus
  const [isOpen, setIsOpen] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const isDirty = useDirector3dEditStore((s) => s.isDirty);
  const bindNodeId = useDirector3dEditStore((s) => s.bindNodeId);

  // --- Export Brief dialog state ---
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [briefResult, setBriefResult] = useState<{
    nodeId: string;
    briefJson: string;
    briefText: string;
    thumbnails: { shotId: string; dataUrl: string }[];
  } | null>(null);

  const { shouldRender, isVisible } = useDialogTransition(isOpen, TRANSITION_MS);

  // --- Subscribe to export-brief-result event ---
  useEffect(() => {
    const unsub = canvasEventBus.subscribe('director3d/export-brief-result', (payload: {
      nodeId: string;
      briefJson: string;
      briefText: string;
      thumbnails: { shotId: string; dataUrl: string }[];
    }) => {
      setBriefResult(payload);
      setBriefDialogOpen(true);
    });
    return () => { unsub(); };
  }, []);

  // --- Event bus subscriptions ---
  useEffect(() => {
    const handleEnter = (payload: { nodeId: string }) => {
      loadFromNode(payload.nodeId);
      setActiveNodeId(payload.nodeId);
      setIsOpen(true);
    };

    const handleExit = (_payload: { nodeId: string; reason: 'apply' | 'discard' }) => {
      setIsOpen(false);
      setActiveNodeId(null);
    };

    const unsubEnter = canvasEventBus.subscribe('director3d/enter-edit', handleEnter);
    const unsubExit = canvasEventBus.subscribe('director3d/exit-edit', handleExit);

    return () => {
      unsubEnter();
      unsubExit();
    };
  }, []);

  // --- Apply / Cancel handlers ---
  const handleApply = useCallback(() => {
    const nodeId = bindNodeId ?? activeNodeId;
    if (nodeId) {
      commitToNode(nodeId);
    }
    useDirector3dEditStore.getState().close('apply');
    if (activeNodeId) {
      canvasEventBus.publish('director3d/exit-edit', { nodeId: activeNodeId, reason: 'apply' });
    }
    setIsOpen(false);
    setActiveNodeId(null);
  }, [bindNodeId, activeNodeId]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(t('director3dEdit.confirm.discardMessage'));
      if (!confirmed) return;
    }
    discard();
    if (activeNodeId) {
      canvasEventBus.publish('director3d/exit-edit', { nodeId: activeNodeId, reason: 'discard' });
    }
    setIsOpen(false);
    setActiveNodeId(null);
  }, [isDirty, activeNodeId, t]);

  const handleBriefDialogClose = useCallback(() => {
    setBriefDialogOpen(false);
    setBriefResult(null);
  }, []);

  // --- Global keyboard shortcuts for Apply/Cancel ---
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const cmd = event.ctrlKey || event.metaKey;

      // Cmd+Enter = Apply
      if (cmd && event.key === 'Enter') {
        event.preventDefault();
        handleApply();
        return;
      }

      // Esc = Cancel
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleApply, handleCancel]);

  // --- Render ---
  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-label={t('director3dEdit.openEditor')}
      className={`fixed inset-0 z-50 flex flex-col transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ transitionDuration: `${TRANSITION_MS}ms` }}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleCancel}
      />

      {/* Content container */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top toolbar */}
        <div className="relative z-10 flex shrink-0 border-b border-white/10">
          <TopToolbar onApply={handleApply} onCancel={handleCancel} />
        </div>

        {/* Three-column layout */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Left panel: Asset panel */}
          <div className="flex shrink-0 flex-col border-r border-white/10" style={{ minWidth: 240, maxWidth: 280, width: '15%' }}>
            <LeftAssetPanel />
          </div>

          {/* Center: 3D Viewport */}
          <div className="flex flex-1 flex-col bg-black">
            <EditViewport />
          </div>

          {/* Right panel: Inspector */}
          <div className="flex shrink-0 flex-col border-l border-white/10" style={{ minWidth: 260, maxWidth: 300, width: '20%' }}>
            <RightInspectorPanel />
          </div>
        </div>

        {/* Bottom bar: Shot cameras */}
        <div className="relative z-10 flex shrink-0 border-t border-white/10 bg-surface-dark/95 h-20">
          <BottomShotsBar />
        </div>
      </div>
      {/* Export Brief Dialog */}
      {briefResult && (
        <ExportBriefDialog
          isOpen={briefDialogOpen}
          onClose={handleBriefDialogClose}
          nodeId={briefResult.nodeId}
          briefJson={briefResult.briefJson}
          briefText={briefResult.briefText}
          thumbnails={briefResult.thumbnails}
        />
      )}
    </div>
  );
});

Director3dEditModal.displayName = 'Director3dEditModal';

export default Director3dEditModal;