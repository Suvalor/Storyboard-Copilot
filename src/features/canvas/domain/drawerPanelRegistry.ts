import type { ComponentType } from 'react';
import type { CanvasNodeType } from './canvasNodes';

/** Registration entry for a drawer panel bound to a specific node type. */
export interface DrawerPanelRegistration {
  nodeType: CanvasNodeType;
  PanelComponent: ComponentType<{ nodeId: string }>;
  titleKey: string;
  icon: ComponentType<{ className?: string }>;
}

const registry = new Map<CanvasNodeType, DrawerPanelRegistration>();

/** Register a drawer panel for a given node type. */
export function registerDrawerPanel(registration: DrawerPanelRegistration): void {
  registry.set(registration.nodeType, registration);
}

/** Retrieve the drawer panel registration for a node type, if one exists. */
export function getDrawerPanel(nodeType: CanvasNodeType): DrawerPanelRegistration | undefined {
  return registry.get(nodeType);
}

/** Check whether a node type has a registered drawer panel. */
export function hasDrawerPanel(nodeType: CanvasNodeType): boolean {
  return registry.has(nodeType);
}