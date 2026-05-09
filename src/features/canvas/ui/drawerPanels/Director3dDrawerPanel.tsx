import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, PenLine } from 'lucide-react';

import { registerDrawerPanel } from '@/features/canvas/domain/drawerPanelRegistry';
import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';
import { canvasEventBus } from '@/features/canvas/application/canvasServices';
import { UiButton } from '@/components/ui/primitives';

interface Director3dDrawerPanelProps {
  nodeId: string;
}

/** Simplified drawer panel for director3d — entry hint + open editor button only. */
export const Director3dDrawerPanel = memo(function Director3dDrawerPanel({ nodeId }: Director3dDrawerPanelProps) {
  const { t } = useTranslation();

  const handleOpenEditor = useCallback(() => {
    canvasEventBus.publish('director3d/enter-edit', { nodeId });
  }, [nodeId]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4">
      <p className="text-xs text-text-muted text-center leading-relaxed">
        {t('director3dEdit.drawer.hint')}
      </p>
      <UiButton variant="primary" size="sm" onClick={handleOpenEditor}>
        <PenLine className="h-3.5 w-3.5 mr-1.5" />
        {t('director3dEdit.drawer.openEditor')}
      </UiButton>
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
