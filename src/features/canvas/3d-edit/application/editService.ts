/**
 * Application service for the 3D director edit lifecycle.
 *
 * Orchestrates: loadFromNode (read canvasStore → open editStore),
 *               commitToNode (write editStore → canvasStore),
 *               discard (close without writing).
 *
 * @since v0.1.14
 */

import type { Director3dScene } from '../domain/sceneSchema';
import type { Director3dNodeData } from '@/features/canvas/domain/canvasNodes';
import { migrateFromLegacy } from '../domain/sceneCodec';
import { useDirector3dEditStore } from '../editStore';
import { useCanvasStore } from '@/stores/canvasStore';

/**
 * Load scene data from a canvas node into the edit store.
 *
 * If the node has no `scene` field (legacy), uses migrateFromLegacy
 * to promote `backgroundUrl` into the new scene structure.
 * Then calls editStore.open() with the resolved scene.
 */
export function loadFromNode(nodeId: string): void {
  const nodes = useCanvasStore.getState().nodes;
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new Error(`[editService] Node not found: ${nodeId}`);
  }

  const data = node.data as Director3dNodeData;
  const scene: Director3dScene = migrateFromLegacy(data);

  useDirector3dEditStore.getState().open(nodeId, scene);
}

/**
 * Commit the edited scene back to the canvas node.
 *
 * Writes editStore.scene into canvasStore.updateNodeData,
 * synchronizing both the new `scene` field and the legacy
 * `backgroundUrl` for backward compatibility.
 */
export function commitToNode(nodeId: string): void {
  const { scene } = useDirector3dEditStore.getState();
  if (!scene) {
    throw new Error('[editService] No scene to commit; edit store is empty.');
  }

  const updateData: Partial<Director3dNodeData> = {
    scene: structuredClone(scene),
    // Keep legacy field in sync for backward compat
    backgroundUrl: scene.background.url,
  };

  useCanvasStore.getState().updateNodeData(nodeId, updateData);
}

/**
 * Discard edits -- close the edit store without writing back.
 *
 * The canvas node data remains unchanged.
 */
export function discard(): void {
  useDirector3dEditStore.getState().close('discard');
}