/**
 * Snapshot utilities for the 3D director edit-mode undo stack.
 *
 * Pure functions: no side effects, no React / R3F dependencies.
 * Uses structuredClone for deep copy (supported in all modern browsers).
 *
 * @since v0.1.14
 */

import type { Director3dScene } from './sceneSchema';

/** Maximum number of snapshots stored in the undo stack. */
export const MAX_UNDO_STACK_SIZE = 30;

/**
 * Create a deep-copy snapshot of a scene for the undo stack.
 * The original scene is not mutated.
 */
export function createSnapshot(scene: Director3dScene): Director3dScene {
  return structuredClone(scene);
}

/**
 * Restore a snapshot by returning a deep-copy of it.
 * This prevents the undo stack from sharing references with the live scene.
 */
export function restoreSnapshot(snapshot: Director3dScene): Director3dScene {
  return structuredClone(snapshot);
}