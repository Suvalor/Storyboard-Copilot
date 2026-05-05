import * as THREE from 'three';

export type MannequinPose = 'stand' | 'sit-chair' | 'lean-45' | 'lie-flat';

export interface MannequinInstance {
  id: string;
  position: [number, number, number];
  rotation: number;
  pose: MannequinPose;
  color: string;
}

/** Palette for cycling mannequin colors on creation */
export const MANNEQUIN_PALETTE = [
  '#e05555', // red
  '#4488dd', // blue
  '#44aa66', // green
  '#ee8833', // orange
  '#8855cc', // purple
  '#33bbcc', // cyan
  '#dd6699', // pink
  '#ccbb33', // yellow
];

const HEAD_RADIUS = 0.13;
const NECK_RADIUS = 0.045;
const NECK_HEIGHT = 0.08;
const UPPER_TORSO_RADIUS = 0.16;
const UPPER_TORSO_HEIGHT = 0.32;
const LOWER_TORSO_RADIUS = 0.14;
const LOWER_TORSO_HEIGHT = 0.22;
const UPPER_ARM_RADIUS = 0.05;
const UPPER_ARM_HEIGHT = 0.24;
const FOREARM_RADIUS = 0.04;
const FOREARM_HEIGHT = 0.22;
const THIGH_RADIUS = 0.07;
const THIGH_HEIGHT = 0.34;
const CALF_RADIUS = 0.055;
const CALF_HEIGHT = 0.32;

/** Position and rotation for one body segment relative to the model origin */
interface SegmentPose {
  position: [number, number, number];
  rotation: [number, number, number];
}

/** Full body segment poses for a given mannequin pose */
interface BodyPoseData {
  head: SegmentPose;
  neck: SegmentPose;
  upperTorso: SegmentPose;
  lowerTorso: SegmentPose;
  leftUpperArm: SegmentPose;
  leftForearm: SegmentPose;
  rightUpperArm: SegmentPose;
  rightForearm: SegmentPose;
  leftThigh: SegmentPose;
  leftCalf: SegmentPose;
  rightThigh: SegmentPose;
  rightCalf: SegmentPose;
}

/** Short alias for segment pose — avoids ambiguity with MannequinPose type */
function seg(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): SegmentPose {
  return { position: [x, y, z], rotation: [rx, ry, rz] };
}

const BODY_POSES: Record<MannequinPose, BodyPoseData> = {
  stand: {
    head: seg(0, 1.72, 0),
    neck: seg(0, 1.58, 0),
    upperTorso: seg(0, 1.30, 0),
    lowerTorso: seg(0, 1.02, 0),
    leftUpperArm: seg(-0.26, 1.44, 0, 0, 0, 0.12),
    leftForearm: seg(-0.28, 1.18, 0, 0, 0, 0.05),
    rightUpperArm: seg(0.26, 1.44, 0, 0, 0, -0.12),
    rightForearm: seg(0.28, 1.18, 0, 0, 0, -0.05),
    leftThigh: seg(-0.1, 0.78, 0),
    leftCalf: seg(-0.1, 0.40, 0),
    rightThigh: seg(0.1, 0.78, 0),
    rightCalf: seg(0.1, 0.40, 0),
  },
  'sit-chair': {
    head: seg(0, 1.42, 0),
    neck: seg(0, 1.28, 0),
    upperTorso: seg(0, 1.00, 0),
    lowerTorso: seg(0, 0.72, 0),
    leftUpperArm: seg(-0.26, 1.14, 0, 0, 0, 0.12),
    leftForearm: seg(-0.28, 0.88, 0, 0, 0, 0.05),
    rightUpperArm: seg(0.26, 1.14, 0, 0, 0, -0.12),
    rightForearm: seg(0.28, 0.88, 0, 0, 0, -0.05),
    // Thighs horizontal (rotated -PI/2 around X)
    leftThigh: seg(-0.1, 0.48, 0.18, -Math.PI / 2, 0, 0),
    rightThigh: seg(0.1, 0.48, 0.18, -Math.PI / 2, 0, 0),
    // Calves vertical from end of thighs
    leftCalf: seg(-0.1, 0.18, 0.38),
    rightCalf: seg(0.1, 0.18, 0.38),
  },
  'lean-45': {
    head: seg(0.45, 1.45, 0),
    neck: seg(0.32, 1.35, 0, -Math.PI / 4, 0, 0),
    upperTorso: seg(0.18, 1.20, 0, -Math.PI / 4, 0, 0),
    lowerTorso: seg(0, 0.90, 0, -Math.PI / 6, 0, 0),
    leftUpperArm: seg(-0.10, 1.30, 0.20, 0, 0, 0.3),
    leftForearm: seg(-0.15, 1.05, 0.28, 0, 0, 0.2),
    rightUpperArm: seg(0.42, 1.30, -0.10, 0, 0, -0.5),
    rightForearm: seg(0.55, 1.05, -0.15, 0, 0, -0.3),
    leftThigh: seg(-0.1, 0.55, 0.10, 0.2, 0, 0),
    leftCalf: seg(-0.14, 0.20, 0.20, 0.3, 0, 0),
    rightThigh: seg(0.1, 0.55, 0.10, 0.2, 0, 0),
    rightCalf: seg(0.06, 0.20, 0.20, 0.3, 0, 0),
  },
  'lie-flat': {
    head: seg(0.85, 0.13, 0),
    neck: seg(0.72, 0.13, 0, -Math.PI / 2, 0, 0),
    upperTorso: seg(0.50, 0.13, 0, -Math.PI / 2, 0, 0),
    lowerTorso: seg(0.22, 0.13, 0, -Math.PI / 2, 0, 0),
    leftUpperArm: seg(0.55, 0.13, -0.24, 0, 0, -0.3),
    leftForearm: seg(0.30, 0.08, -0.26, 0, 0, -0.15),
    rightUpperArm: seg(0.55, 0.13, 0.24, 0, 0, 0.3),
    rightForearm: seg(0.30, 0.08, 0.26, 0, 0, 0.15),
    leftThigh: seg(-0.10, 0.13, -0.10, -Math.PI / 2, 0, 0),
    leftCalf: seg(-0.44, 0.13, -0.10, -Math.PI / 2, 0, 0),
    rightThigh: seg(-0.10, 0.13, 0.10, -Math.PI / 2, 0, 0),
    rightCalf: seg(-0.44, 0.13, 0.10, -Math.PI / 2, 0, 0),
  },
};

function addSegment(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  seg: SegmentPose,
): void {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...seg.position);
  mesh.rotation.set(...seg.rotation);
  group.add(mesh);
}

export function createMannequinGeometry(pose: MannequinPose, bodyColor?: string): THREE.Group {
  const group = new THREE.Group();
  const data = BODY_POSES[pose];

  const mainColor = bodyColor ?? '#b0b8c8';
  const bodyMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.6, metalness: 0.1 });
  // Joint color: darken the main color for visual contrast
  const jointColor = new THREE.Color(mainColor).multiplyScalar(0.7);
  const jointMat = new THREE.MeshStandardMaterial({ color: jointColor, roughness: 0.7, metalness: 0.05 });

  // Head
  addSegment(group, new THREE.SphereGeometry(HEAD_RADIUS, 12, 8), bodyMat, data.head);

  // Neck
  addSegment(
    group,
    new THREE.CapsuleGeometry(NECK_RADIUS, NECK_HEIGHT, 4, 8),
    jointMat,
    data.neck,
  );

  // Upper torso
  addSegment(
    group,
    new THREE.CapsuleGeometry(UPPER_TORSO_RADIUS, UPPER_TORSO_HEIGHT, 4, 8),
    bodyMat,
    data.upperTorso,
  );

  // Lower torso
  addSegment(
    group,
    new THREE.CapsuleGeometry(LOWER_TORSO_RADIUS, LOWER_TORSO_HEIGHT, 4, 8),
    bodyMat,
    data.lowerTorso,
  );

  // Left arm
  addSegment(
    group,
    new THREE.CapsuleGeometry(UPPER_ARM_RADIUS, UPPER_ARM_HEIGHT, 4, 8),
    bodyMat,
    data.leftUpperArm,
  );
  addSegment(
    group,
    new THREE.CapsuleGeometry(FOREARM_RADIUS, FOREARM_HEIGHT, 4, 8),
    bodyMat,
    data.leftForearm,
  );

  // Right arm
  addSegment(
    group,
    new THREE.CapsuleGeometry(UPPER_ARM_RADIUS, UPPER_ARM_HEIGHT, 4, 8),
    bodyMat,
    data.rightUpperArm,
  );
  addSegment(
    group,
    new THREE.CapsuleGeometry(FOREARM_RADIUS, FOREARM_HEIGHT, 4, 8),
    bodyMat,
    data.rightForearm,
  );

  // Left leg
  addSegment(
    group,
    new THREE.CapsuleGeometry(THIGH_RADIUS, THIGH_HEIGHT, 4, 8),
    bodyMat,
    data.leftThigh,
  );
  addSegment(
    group,
    new THREE.CapsuleGeometry(CALF_RADIUS, CALF_HEIGHT, 4, 8),
    bodyMat,
    data.leftCalf,
  );

  // Right leg
  addSegment(
    group,
    new THREE.CapsuleGeometry(THIGH_RADIUS, THIGH_HEIGHT, 4, 8),
    bodyMat,
    data.rightThigh,
  );
  addSegment(
    group,
    new THREE.CapsuleGeometry(CALF_RADIUS, CALF_HEIGHT, 4, 8),
    bodyMat,
    data.rightCalf,
  );

  return group;
}

export const ALL_POSES: MannequinPose[] = ['stand', 'sit-chair', 'lean-45', 'lie-flat'];
