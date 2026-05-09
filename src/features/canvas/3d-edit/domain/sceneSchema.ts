/**
 * Domain types for the 3D director scene.
 *
 * These types define the persisted shape of a Director3dNode's scene data.
 * No React / R3F dependencies -- pure TypeScript.
 *
 * @since v0.1.14
 */

// ---------------------------------------------------------------------------
// Mannequin pose
// ---------------------------------------------------------------------------

/** The four mannequin poses supported by the 3D director. */
export type MannequinPose = 'stand' | 'sit-chair' | 'lean-45' | 'lie-flat';

// ---------------------------------------------------------------------------
// Scene background
// ---------------------------------------------------------------------------

/** Panorama-sphere background configuration. */
export interface SceneBackground {
  /** Panorama image URL (goes through image pool); null = no background. */
  url: string | null;
  /** Exposure multiplier 0.0 - 2.0; default 1.0. */
  exposure: number;
}

// ---------------------------------------------------------------------------
// Scene mannequin
// ---------------------------------------------------------------------------

/** A mannequin placed in the 3D scene. */
export interface SceneMannequin {
  id: string;
  pose: MannequinPose;
  position: [number, number, number];
  /** Y-axis rotation in radians. */
  rotationY: number;
  /** Uniform scale; range 0.5 - 3, default 1. */
  scale: number;
  /** Hex color string, e.g. '#e05555'. */
  color: string;
  /** Optional user semantic label (e.g. "protagonist"). */
  label?: string;
}

// ---------------------------------------------------------------------------
// Scene prop
// ---------------------------------------------------------------------------

/** A prop placed in the 3D scene. */
export interface SceneProp {
  id: string;
  /** References a prop definition ID from props.ts. */
  definitionId: string;
  position: [number, number, number];
  /** Y-axis rotation in radians. */
  rotationY: number;
  /** Uniform scale; default 1. */
  scale: number;
  /** Optional user semantic label. */
  label?: string;
}

// ---------------------------------------------------------------------------
// Shot camera
// ---------------------------------------------------------------------------

/** A named camera position for multi-shot workflows. */
export interface ShotCamera {
  id: string;
  name: string;
  position: [number, number, number];
  /** Look-at target point. */
  target: [number, number, number];
  /** Field of view in degrees. */
  fov: number;
  /** Rendered thumbnail data URL (goes through image pool); null = not yet rendered. */
  thumbnailDataUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Scene annotation
// ---------------------------------------------------------------------------

/** An AI-hint annotation attached to a mannequin or prop. */
export interface SceneAnnotation {
  id: string;
  attachTo: { kind: 'mannequin' | 'prop'; id: string };
  /** Free-text AI prompt fragment, e.g. "wearing red trench coat". */
  text: string;
  language?: 'zh' | 'en';
}

// ---------------------------------------------------------------------------
// Edit-mode helper types
// ---------------------------------------------------------------------------

/** Identifies which object is selected in the 3D edit mode. */
export interface SelectedObject {
  kind: 'mannequin' | 'prop' | 'shot';
  id: string;
}

/** Attachment target for an annotation -- mirrors SceneAnnotation.attachTo. */
export type AnnotationTarget = { kind: 'mannequin' | 'prop'; id: string };

/** Gizmo transform mode for the 3D edit mode. */
export type GizmoMode = 'translate' | 'rotate' | 'scale';

// ---------------------------------------------------------------------------
// Top-level scene
// ---------------------------------------------------------------------------

/** Complete 3D scene data attached to a director3dNode. Versioned for forward-compat. */
export interface Director3dScene {
  /** Schema version; always 1 for now. */
  schemaVersion: 1;
  background: SceneBackground;
  /** World units; MVP = 'meter'. */
  units: 'meter';
  ground: { visible: boolean; gridVisible: boolean };
  mannequins: SceneMannequin[];
  props: SceneProp[];
  /** Multi-shot cameras. */
  shots: ShotCamera[];
  /** Currently active shot; null = free editing camera. */
  activeShotId: string | null;
  /** AI-hint annotations on scene objects. */
  annotations: SceneAnnotation[];
}
