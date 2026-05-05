import { useTranslation } from 'react-i18next';
import { useDialogTransition } from '@/components/ui/useDialogTransition';
import { useCanvasStore } from '@/stores/canvasStore';
import { getDrawerPanel } from '@/features/canvas/domain/drawerPanelRegistry';

const DRAWER_TRANSITION_MS = 180;
const REDUCED_MOTION_TRANSITION_MS = 1;

function getTransitionMs(): number {
  if (typeof window === 'undefined') {
    return DRAWER_TRANSITION_MS;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? REDUCED_MOTION_TRANSITION_MS
    : DRAWER_TRANSITION_MS;
}

/** Sliding drawer that renders the registered panel for the currently selected node type. */
export function NodePropertyDrawer() {
  const { t } = useTranslation();
  const isOpen = useCanvasStore((s) => s.drawerState.isOpen);
  const nodeId = useCanvasStore((s) => s.drawerState.nodeId);
  const nodeType = useCanvasStore((s) => s.drawerState.nodeType);
  const setDrawerClosed = useCanvasStore((s) => s.setDrawerClosed);

  const transitionMs = getTransitionMs();
  const { shouldRender, isVisible } = useDialogTransition(isOpen, transitionMs);

  if (!shouldRender || !nodeType || !nodeId) {
    return null;
  }

  const registration = getDrawerPanel(nodeType);
  if (!registration) {
    return null;
  }

  const { PanelComponent, titleKey, icon: Icon } = registration;
  const transitionStyle = `transform ${transitionMs}ms ease-out, opacity ${transitionMs}ms ease-out`;

  return (
    <aside
      role="complementary"
      aria-label={t(titleKey)}
      className="absolute left-0 top-0 bottom-0 flex flex-col overflow-hidden border-r"
      style={{
        width: 280,
        zIndex: 30,
        background: 'var(--ui-surface-panel)',
        borderColor: 'var(--ui-border-soft)',
        boxShadow: 'var(--ui-shadow-panel)',
        borderRadius: 'var(--ui-radius-xl)',
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
        opacity: isVisible ? 1 : 0,
        transition: transitionStyle,
      }}
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4" style={{ borderColor: 'var(--ui-border-soft)' }}>
        <Icon className="h-4 w-4 shrink-0 text-text-muted" />
        <span className="truncate text-sm font-medium text-text">{t(titleKey)}</span>
        <button
          type="button"
          className="ml-auto shrink-0 rounded p-1 text-text-muted transition-colors hover:text-text"
          onClick={setDrawerClosed}
          aria-label={t('common.close')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <PanelComponent nodeId={nodeId} />
      </div>
    </aside>
  );
}