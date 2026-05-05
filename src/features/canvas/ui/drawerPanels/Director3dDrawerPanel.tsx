import { useState, useCallback, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, X, Loader2 } from 'lucide-react';

import { registerDrawerPanel } from '@/features/canvas/domain/drawerPanelRegistry';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';
import { useCanvasStore } from '@/stores/canvasStore';
import { CAMERA_PRESETS, type CameraPreset } from '@/features/canvas/3d/cameraPresets';
import { ALL_POSES, type MannequinPose } from '@/features/canvas/3d/mannequin';
import { PROP_CATEGORIES, getPropsByCategory, getPropById, type PropCategory } from '@/features/canvas/3d/props';
import { UiChipButton, UiButton, UiSelect } from '@/components/ui/primitives';
import { canvasEventBus } from '@/features/canvas/application/canvasServices';

type DrawerTab = 'camera' | 'figures' | 'props' | 'export';

interface Director3dDrawerPanelProps {
  nodeId: string;
}

const TAB_KEYS: { id: DrawerTab; labelKey: string }[] = [
  { id: 'camera', labelKey: 'node.director3d.drawer.tabCamera' },
  { id: 'figures', labelKey: 'node.director3d.drawer.tabFigures' },
  { id: 'props', labelKey: 'node.director3d.drawer.tabProps' },
  { id: 'export', labelKey: 'node.director3d.drawer.tabExport' },
];

function getPoseLabelKey(pose: MannequinPose): string {
  switch (pose) {
    case 'stand': return 'node.director3d.poseStand';
    case 'sit-chair': return 'node.director3d.poseSit';
    case 'lean-45': return 'node.director3d.poseLean';
    case 'lie-flat': return 'node.director3d.poseLie';
  }
}

/** Complete 3D Director drawer panel with Camera, Figures, Props, and Export tabs. */
export const Director3dDrawerPanel = memo(function Director3dDrawerPanel({ nodeId }: Director3dDrawerPanelProps) {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<DrawerTab>('camera');
  const [exporting, setExporting] = useState<'viewport' | 'depth' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Store selectors - fine-grained to avoid unnecessary re-renders
  const activePreset = useCanvasStore((s) => s.director3dState.activePreset);
  const mannequins = useCanvasStore((s) => s.director3dState.mannequins);
  const placedProps = useCanvasStore((s) => s.director3dState.placedProps);
  const selectedPropCategory = useCanvasStore((s) => s.director3dState.selectedPropCategory);

  // Store actions
  const setActivePreset = useCanvasStore((s) => s.setActivePreset);
  const addMannequin = useCanvasStore((s) => s.addMannequin);
  const removeMannequin = useCanvasStore((s) => s.removeMannequin);
  const addPlacedProp = useCanvasStore((s) => s.addPlacedProp);
  const removePlacedProp = useCanvasStore((s) => s.removePlacedProp);
  const setSelectedPropCategory = useCanvasStore((s) => s.setSelectedPropCategory);
  const addDerivedExportNode = useCanvasStore((s) => s.addDerivedExportNode);

  // --- Export event bus subscriptions ---
  useEffect(() => {
    const handleExportResult = (payload: { nodeId: string; kind: 'viewport' | 'depth'; dataUrl: string }) => {
      if (payload.nodeId !== nodeId) {
        return;
      }
      setExporting(null);
      setExportError(null);
      const title = payload.kind === 'viewport' ? '3D Viewport' : '3D Depth';
      addDerivedExportNode(nodeId, payload.dataUrl, '16:9', undefined, {
        defaultTitle: title,
      });
    };

    const handleExportError = (payload: { nodeId: string; kind: 'viewport' | 'depth'; reason: string }) => {
      if (payload.nodeId !== nodeId) {
        return;
      }
      setExporting(null);
      setExportError(payload.reason);
    };

    const unsubResult = canvasEventBus.subscribe('director3d/export-result', handleExportResult);
    const unsubError = canvasEventBus.subscribe('director3d/export-error', handleExportError);

    return () => {
      unsubResult();
      unsubError();
    };
  }, [nodeId, addDerivedExportNode]);

  // Clear export error when panel unmounts (closed)
  useEffect(() => {
    return () => {
      setExportError(null);
    };
  }, []);

  // --- Tab A: Camera presets ---
  const handlePresetClick = useCallback((preset: CameraPreset) => {
    setActivePreset(preset);
  }, [setActivePreset]);

  // --- Tab B: Figures ---
  const handleAddMannequin = useCallback((pose: MannequinPose) => {
    addMannequin(pose);
  }, [addMannequin]);

  const handleRemoveMannequin = useCallback((mannequinId: string) => {
    removeMannequin(mannequinId);
  }, [removeMannequin]);

  // --- Tab C: Props ---
  const handleCategoryChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPropCategory(event.target.value as PropCategory);
  }, [setSelectedPropCategory]);

  const handleAddProp = useCallback((definitionId: string) => {
    const position: [number, number, number] = [
      (Math.random() - 0.5) * 4,
      0,
      (Math.random() - 0.5) * 4,
    ];
    addPlacedProp(definitionId, position);
  }, [addPlacedProp]);

  const handleRemoveProp = useCallback((propId: string) => {
    removePlacedProp(propId);
  }, [removePlacedProp]);

  // --- Tab D: Export ---
  const handleExportViewport = useCallback(() => {
    setExportError(null);
    setExporting('viewport');
    canvasEventBus.publish('director3d/export-viewport', { nodeId });
  }, [nodeId]);

  const handleExportDepth = useCallback(() => {
    setExportError(null);
    setExporting('depth');
    canvasEventBus.publish('director3d/export-depth', { nodeId });
  }, [nodeId]);

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar */}
      <nav
        className="flex shrink-0 gap-0 border-b"
        style={{ borderColor: 'var(--ui-border-soft)' }}
        role="tablist"
        onKeyDown={(e) => {
          const currentIndex = TAB_KEYS.findIndex((tab) => tab.id === activeTab);
          if (e.key === 'ArrowRight' && currentIndex < TAB_KEYS.length - 1) {
            setActiveTab(TAB_KEYS[currentIndex + 1].id);
          } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
            setActiveTab(TAB_KEYS[currentIndex - 1].id);
          }
        }}
      >
        {TAB_KEYS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </nav>

      {/* Tab panels */}
      {activeTab === 'camera' && (
        <div className="grid grid-cols-2 gap-2" role="tabpanel">
          {CAMERA_PRESETS.map((preset) => (
            <UiChipButton
              key={preset.id}
              active={activePreset?.id === preset.id}
              onClick={() => handlePresetClick(preset)}
            >
              {t(preset.labelKey)}
            </UiChipButton>
          ))}
        </div>
      )}

      {activeTab === 'figures' && (
        <div className="flex flex-col gap-3" role="tabpanel">
          <span className="text-xs font-medium text-text-muted">
            {t('node.director3d.drawer.addPose')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {ALL_POSES.map((pose) => (
              <UiButton key={pose} size="sm" onClick={() => handleAddMannequin(pose)}>
                {t(getPoseLabelKey(pose))}
              </UiButton>
            ))}
          </div>

          <span className="text-xs font-medium text-text-muted">
            {t('node.director3d.drawer.mannequinList')}
          </span>
          {mannequins.length === 0 ? (
            <span className="text-xs text-text-muted/70">
              {t('node.director3d.drawer.emptyMannequins')}
            </span>
          ) : (
            <ul className="flex flex-col gap-1">
              {mannequins.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded px-2 py-1 text-xs"
                  style={{ background: 'var(--ui-surface-field)' }}
                >
                  <span className="text-text">{t(getPoseLabelKey(m.pose))}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-text-muted transition-colors hover:text-text"
                    onClick={() => handleRemoveMannequin(m.id)}
                    aria-label={t('common.delete')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'props' && (
        <div className="flex flex-col gap-3" role="tabpanel">
          <UiSelect
            value={selectedPropCategory}
            onChange={handleCategoryChange}
            aria-label={t('node.director3d.drawer.propCategoryLabel')}
          >
            {PROP_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {t(cat.labelKey)}
              </option>
            ))}
          </UiSelect>

          <div className="grid grid-cols-2 gap-2">
            {getPropsByCategory(selectedPropCategory).map((prop) => (
              <UiButton key={prop.id} size="sm" onClick={() => handleAddProp(prop.id)}>
                {prop.label}
              </UiButton>
            ))}
          </div>

          <span className="text-xs font-medium text-text-muted">
            {t('node.director3d.drawer.propList')}
          </span>
          {placedProps.length === 0 ? (
            <span className="text-xs text-text-muted/70">
              {t('node.director3d.drawer.emptyProps')}
            </span>
          ) : (
            <ul className="flex flex-col gap-1">
              {placedProps.map((p) => {
                const propDef = getPropById(p.definitionId);
                const label = propDef?.label ?? p.definitionId;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs"
                    style={{ background: 'var(--ui-surface-field)' }}
                  >
                    <span className="text-text">{label}</span>
                    <button
                      type="button"
                      className="rounded p-0.5 text-text-muted transition-colors hover:text-text"
                      onClick={() => handleRemoveProp(p.id)}
                      aria-label={t('common.delete')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="flex flex-col gap-3" role="tabpanel">
          <UiButton
            variant="primary"
            size="md"
            disabled={exporting !== null}
            onClick={handleExportViewport}
          >
            {exporting === 'viewport' ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('node.director3d.drawer.exporting')}
              </span>
            ) : (
              t('node.director3d.exportViewport')
            )}
          </UiButton>
          <UiButton
            variant="primary"
            size="md"
            disabled={exporting !== null}
            onClick={handleExportDepth}
          >
            {exporting === 'depth' ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('node.director3d.drawer.exporting')}
              </span>
            ) : (
              t('node.director3d.exportDepth')
            )}
          </UiButton>
          {exportError && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded bg-red-500/15 px-3 py-2 text-xs text-red-400"
            >
              {t('node.director3d.drawer.exportError', { reason: exportError })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

Director3dDrawerPanel.displayName = 'Director3dDrawerPanel';

/* Register this panel so the drawer framework can find it. */
registerDrawerPanel({
  nodeType: CANVAS_NODE_TYPES.director3d,
  PanelComponent: Director3dDrawerPanel,
  titleKey: 'node.director3d.drawer.title',
  icon: Box,
});