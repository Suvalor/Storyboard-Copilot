/**
 * Zustand store for the Director3D edit mode.
 *
 * Implements the API contract from architecture-spec §7.3:
 *   - Lifecycle:  isOpen / bindNodeId / scene
 *   - Edit temp:  selectedObject / gizmoMode / isDragging / isDirty / editHistory
 *   - Actions:    open / close / selectObject / setGizmoMode / setIsDragging
 *   - Scene ops:  addMannequin / removeMannequin / updateMannequin / ...
 *   - Undo stack: pushSnapshot / undo / redo
 *
 * @since v0.1.14
 */

import { create } from 'zustand';

import type {
  Director3dScene,
  SceneMannequin,
  SceneProp,
  ShotCamera,
  SceneAnnotation,
  SelectedObject,
  GizmoMode,
} from './domain/sceneSchema';
import { createDefaultScene } from './domain/sceneCodec';
import { createSnapshot, restoreSnapshot, MAX_UNDO_STACK_SIZE } from './domain/sceneSnapshot';

// ---------------------------------------------------------------------------
// Edit history
// ---------------------------------------------------------------------------

export interface EditHistory {
  past: Director3dScene[];
  future: Director3dScene[];
}

// ---------------------------------------------------------------------------
// Store state shape
// ---------------------------------------------------------------------------

export interface Director3dEditState {
  /** Whether the edit modal is open. */
  isOpen: boolean;
  /** The nodeId being edited; null when closed. */
  bindNodeId: string | null;
  /** Deep-copied scene being edited; defaults to a blank scene. */
  scene: Director3dScene;

  /** Currently selected 3D object in the viewport. */
  selectedObject: SelectedObject | null;
  /** Active Gizmo transform mode. */
  gizmoMode: GizmoMode;
  /** True while a Gizmo drag is in progress. */
  isDragging: boolean;
  /** True after any mutation since open(); used for dirty-check on close. */
  isDirty: boolean;
  /** Isolated undo/redo stack for the edit session. */
  editHistory: EditHistory;
}

// ---------------------------------------------------------------------------
// Store actions
// ---------------------------------------------------------------------------

export interface Director3dEditActions {
  // -- lifecycle --
  open(nodeId: string, initialScene: Director3dScene): void;
  close(reason: 'apply' | 'discard'): void;

  // -- selection / gizmo --
  selectObject(obj: SelectedObject | null): void;
  setGizmoMode(mode: GizmoMode): void;
  setIsDragging(dragging: boolean): void;

  // -- scene mutations (each auto-pushes snapshot before mutating) --
  addMannequin(mannequin: SceneMannequin): void;
  removeMannequin(id: string): void;
  updateMannequin(id: string, patch: Partial<SceneMannequin>): void;
  addProp(prop: SceneProp): void;
  removeProp(id: string): void;
  updateProp(id: string, patch: Partial<SceneProp>): void;
  addShot(shot: ShotCamera): void;
  removeShot(id: string): void;
  updateShot(id: string, patch: Partial<ShotCamera>): void;
  setActiveShot(id: string | null): void;
  addAnnotation(annotation: SceneAnnotation): void;
  removeAnnotation(id: string): void;
  setBackground(url: string | null): void;
  setExposure(value: number): void;
  setGridVisible(visible: boolean): void;
  setGroundVisible(visible: boolean): void;

  // -- undo / redo --
  undo(): void;
  redo(): void;
}

// ---------------------------------------------------------------------------
// Internal helper: push a snapshot before mutating
// ---------------------------------------------------------------------------

function pushBeforeMutate(state: Director3dEditState): Partial<Director3dEditState> {
  const snapshot = createSnapshot(state.scene);
  const past = [...state.editHistory.past, snapshot];
  // Enforce stack size limit
  if (past.length > MAX_UNDO_STACK_SIZE) {
    past.shift();
  }
  return {
    editHistory: { past, future: [] },
    isDirty: true,
  };
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useDirector3dEditStore = create<Director3dEditState & Director3dEditActions>(
  (set, get) => ({
    // -- lifecycle defaults --
    isOpen: false,
    bindNodeId: null,
    scene: createDefaultScene(),

    // -- edit temporary defaults --
    selectedObject: null,
    gizmoMode: 'translate',
    isDragging: false,
    isDirty: false,
    editHistory: { past: [], future: [] },

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    open(nodeId, initialScene) {
      set({
        isOpen: true,
        bindNodeId: nodeId,
        scene: structuredClone(initialScene), // deep copy so edits don't leak
        selectedObject: null,
        gizmoMode: 'translate',
        isDragging: false,
        isDirty: false,
        editHistory: { past: [], future: [] },
      });
    },

    close() {
      // Reset all edit state including history and scene so stale data
      // cannot leak between sessions. commitToNode reads scene synchronously
      // before close(), so clearing here is safe.
      set({
        isOpen: false,
        bindNodeId: null,
        scene: createDefaultScene(),
        selectedObject: null,
        isDragging: false,
        isDirty: false,
        editHistory: { past: [], future: [] },
      });
    },

    // -----------------------------------------------------------------------
    // Selection / gizmo
    // -----------------------------------------------------------------------

    selectObject(obj) {
      set({ selectedObject: obj });
    },

    setGizmoMode(mode) {
      set({ gizmoMode: mode });
    },

    setIsDragging(dragging) {
      const state = get();
      // Auto-push snapshot when drag ends (user finished a transform)
      if (!dragging && state.isDragging) {
        set({ ...pushBeforeMutate(state), isDragging: false });
        return;
      }
      set({ isDragging: dragging });
    },

    // -----------------------------------------------------------------------
    // Scene mutations
    // -----------------------------------------------------------------------

    addMannequin(mannequin) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, mannequins: [...state.scene.mannequins, mannequin] },
      });
    },

    removeMannequin(id) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: {
          ...state.scene,
          mannequins: state.scene.mannequins.filter((m) => m.id !== id),
        },
      });
    },

    updateMannequin(id, patch) {
      const state = get();
      // During drag, skip snapshot push -- setIsDragging(false) will push one
      // consolidated snapshot when the drag ends, preventing undo-stack explosion.
      const mutation = {
        scene: {
          ...state.scene,
          mannequins: state.scene.mannequins.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        },
      };
      if (state.isDragging) {
        set({ ...mutation, isDirty: true });
      } else {
        set({ ...pushBeforeMutate(state), ...mutation });
      }
    },

    addProp(prop) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, props: [...state.scene.props, prop] },
      });
    },

    removeProp(id) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, props: state.scene.props.filter((p) => p.id !== id) },
      });
    },

    updateProp(id, patch) {
      const state = get();
      // During drag, skip snapshot push -- setIsDragging(false) will push one
      // consolidated snapshot when the drag ends, preventing undo-stack explosion.
      const mutation = {
        scene: {
          ...state.scene,
          props: state.scene.props.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        },
      };
      if (state.isDragging) {
        set({ ...mutation, isDirty: true });
      } else {
        set({ ...pushBeforeMutate(state), ...mutation });
      }
    },

    addShot(shot) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, shots: [...state.scene.shots, shot] },
      });
    },

    removeShot(id) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, shots: state.scene.shots.filter((s) => s.id !== id) },
      });
    },

    updateShot(id, patch) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: {
          ...state.scene,
          shots: state.scene.shots.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        },
      });
    },

    setActiveShot(id) {
      const state = get();
      set({ ...pushBeforeMutate(state), scene: { ...state.scene, activeShotId: id } });
    },

    addAnnotation(annotation) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, annotations: [...state.scene.annotations, annotation] },
      });
    },

    removeAnnotation(id) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: {
          ...state.scene,
          annotations: state.scene.annotations.filter((a) => a.id !== id),
        },
      });
    },

    setBackground(url) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, background: { ...state.scene.background, url } },
      });
    },

    setExposure(value) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, background: { ...state.scene.background, exposure: value } },
      });
    },

    setGridVisible(visible) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, ground: { ...state.scene.ground, gridVisible: visible } },
      });
    },

    setGroundVisible(visible) {
      const state = get();
      set({
        ...pushBeforeMutate(state),
        scene: { ...state.scene, ground: { ...state.scene.ground, visible } },
      });
    },

    // -----------------------------------------------------------------------
    // Undo / Redo
    // -----------------------------------------------------------------------

    undo() {
      const state = get();
      if (state.editHistory.past.length === 0) return;

      const previous = state.editHistory.past[state.editHistory.past.length - 1];
      const newPast = state.editHistory.past.slice(0, -1);

      set({
        scene: restoreSnapshot(previous),
        editHistory: {
          past: newPast,
          future: [createSnapshot(state.scene), ...state.editHistory.future],
        },
        isDirty: true,
      });
    },

    redo() {
      const state = get();
      if (state.editHistory.future.length === 0) return;

      const next = state.editHistory.future[0];
      const newFuture = state.editHistory.future.slice(1);

      set({
        scene: restoreSnapshot(next),
        editHistory: {
          past: [...state.editHistory.past, createSnapshot(state.scene)],
          future: newFuture,
        },
        isDirty: true,
      });
    },
  }),
);