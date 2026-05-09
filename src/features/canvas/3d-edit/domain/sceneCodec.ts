/**
 * Codec / factory for Director3dScene.
 *
 * Pure functions: no side effects, no React / R3F dependencies.
 *
 * @since v0.1.14
 */

import { v4 as uuid } from 'uuid';
import type {
  Director3dScene,
  SceneBackground,
  SceneMannequin,
  SceneProp,
  ShotCamera,
  SceneAnnotation,
} from './sceneSchema';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_BACKGROUND: SceneBackground = {
  url: null,
  exposure: 1,
};

const DEFAULT_SCENE: Omit<Director3dScene, 'mannequins' | 'props' | 'shots' | 'annotations' | 'activeShotId'> = {
  schemaVersion: 1,
  background: DEFAULT_BACKGROUND,
  units: 'meter',
  ground: { visible: true, gridVisible: true },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create a brand-new scene with sensible defaults. */
export function createDefaultScene(): Director3dScene {
  return {
    ...DEFAULT_SCENE,
    mannequins: [],
    props: [],
    shots: [],
    activeShotId: null,
    annotations: [],
  };
}

/**
 * Migrate legacy Director3dNodeData that stored `backgroundUrl` at the top
 * level into the new `scene.background.url` structure.
 *
 * If the node already has a `scene` we return it as-is (idempotent).
 * Otherwise we promote `backgroundUrl` (if present) into the scene.
 */
export function migrateFromLegacy(data: {
  backgroundUrl?: string | null;
  scene?: Director3dScene | null;
}): Director3dScene {
  // Already migrated -- return as-is.
  if (data.scene) return data.scene;

  const scene = createDefaultScene();
  scene.background.url = data.backgroundUrl ?? null;
  return scene;
}

/**
 * Regenerate all UUIDs inside a scene so a duplicated node does not share
 * IDs with the original.
 *
 * Returns a **new** scene object; the original is not mutated.
 */
export function regenerateSceneIds(scene: Director3dScene): Director3dScene {
  // Build a lookup old-id -> new-id for all entities that carry an id.
  const idMap = new Map<string, string>();

  const remappedMannequins = scene.mannequins.map((m): SceneMannequin => {
    const newId = uuid();
    idMap.set(m.id, newId);
    return { ...m, id: newId };
  });

  const remappedProps = scene.props.map((p): SceneProp => {
    const newId = uuid();
    idMap.set(p.id, newId);
    return { ...p, id: newId };
  });

  const remappedShots = scene.shots.map((s): ShotCamera => {
    const newId = uuid();
    idMap.set(s.id, newId);
    return { ...s, id: newId };
  });

  // Annotations reference mannequin/prop IDs via attachTo -- must remap.
  const remappedAnnotations = scene.annotations.map((a): SceneAnnotation => {
    const mapped = idMap.get(a.attachTo.id);
    if (mapped) {
      return { ...a, attachTo: { ...a.attachTo, id: mapped } };
    }
    return { ...a };
  });

  // Determine new activeShotId.
  const newActiveShotId = scene.activeShotId
    ? (idMap.get(scene.activeShotId) ?? null)
    : null;

  return {
    ...scene,
    mannequins: remappedMannequins,
    props: remappedProps,
    shots: remappedShots,
    activeShotId: newActiveShotId,
    annotations: remappedAnnotations,
  };
}
