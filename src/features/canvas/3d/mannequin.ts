import * as THREE from 'three';

export type MannequinPose = 'stand' | 'sit-chair' | 'lean-45' | 'lie-flat';

export interface MannequinInstance {
  id: string;
  position: [number, number, number];
  rotation: number;
  pose: MannequinPose;
  color: string;
}

const MANNEQUIN_COLORS = {
  body: '#b0b8c8',
  head: '#c8cdd8',
  joint: '#8a92a4',
};

const BODY_RADIUS = 0.18;
const HEAD_RADIUS = 0.14;

interface BodySegment {
  height: number;
  radius: number;
  yOffset: number;
}

const POSE_SEGMENTS: Record<MannequinPose, BodySegment[]> = {
  stand: [
    { height: 0.55, radius: BODY_RADIUS, yOffset: 0.9 },
    { height: 0.35, radius: BODY_RADIUS * 0.9, yOffset: 1.4 },
    { height: 0.8, radius: BODY_RADIUS * 0.7, yOffset: 0.4 },
    { height: 0.7, radius: BODY_RADIUS * 0.6, yOffset: 1.75 },
  ],
  'sit-chair': [
    { height: 0.55, radius: BODY_RADIUS, yOffset: 0.9 },
    { height: 0.35, radius: BODY_RADIUS * 0.9, yOffset: 1.4 },
    { height: 0.5, radius: BODY_RADIUS * 0.7, yOffset: 0.4 },
    { height: 0.7, radius: BODY_RADIUS * 0.6, yOffset: 1.75 },
  ],
  'lean-45': [
    { height: 0.55, radius: BODY_RADIUS, yOffset: 0.9 },
    { height: 0.35, radius: BODY_RADIUS * 0.9, yOffset: 1.4 },
    { height: 0.8, radius: BODY_RADIUS * 0.7, yOffset: 0.4 },
    { height: 0.7, radius: BODY_RADIUS * 0.6, yOffset: 1.75 },
  ],
  'lie-flat': [
    { height: 0.55, radius: BODY_RADIUS, yOffset: 0.18 },
    { height: 0.35, radius: BODY_RADIUS * 0.9, yOffset: 0.18 },
    { height: 0.8, radius: BODY_RADIUS * 0.7, yOffset: 0.18 },
    { height: 0.7, radius: BODY_RADIUS * 0.6, yOffset: 0.18 },
  ],
};

const POSE_ROTATIONS: Record<MannequinPose, { torso: number; legs: number; arms: number }> = {
  stand: { torso: 0, legs: 0, arms: 0 },
  'sit-chair': { torso: 0, legs: -Math.PI / 2, arms: 0 },
  'lean-45': { torso: -Math.PI / 4, legs: 0, arms: Math.PI / 6 },
  'lie-flat': { torso: -Math.PI / 2, legs: -Math.PI / 2, arms: -Math.PI / 2 },
};

export function createMannequinGeometry(pose: MannequinPose): THREE.Group {
  const group = new THREE.Group();
  const segments = POSE_SEGMENTS[pose];
  const rotations = POSE_ROTATIONS[pose];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: MANNEQUIN_COLORS.body,
    roughness: 0.6,
    metalness: 0.1,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: MANNEQUIN_COLORS.head,
    roughness: 0.5,
    metalness: 0.1,
  });
  const jointMat = new THREE.MeshStandardMaterial({
    color: MANNEQUIN_COLORS.joint,
    roughness: 0.7,
    metalness: 0.05,
  });

  // Torso
  const torsoGeo = new THREE.CapsuleGeometry(segments[0].radius, segments[0].height, 4, 8);
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  torso.position.y = segments[0].yOffset;
  torso.rotation.x = rotations.torso;
  group.add(torso);

  // Head
  const headGeo = new THREE.SphereGeometry(HEAD_RADIUS, 12, 8);
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = segments[1].yOffset;
  group.add(head);

  // Neck joint
  const neckGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const neck = new THREE.Mesh(neckGeo, jointMat);
  neck.position.y = segments[1].yOffset - HEAD_RADIUS - 0.04;
  group.add(neck);

  // Legs
  for (const side of [-1, 1]) {
    const legGeo = new THREE.CapsuleGeometry(segments[2].radius, segments[2].height, 4, 8);
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(side * 0.15, segments[2].yOffset, 0);
    leg.rotation.x = rotations.legs;
    group.add(leg);

    // Knee joint
    const kneeGeo = new THREE.SphereGeometry(0.07, 8, 6);
    const knee = new THREE.Mesh(kneeGeo, jointMat);
    knee.position.set(side * 0.15, segments[2].yOffset + 0.15, 0);
    group.add(knee);
  }

  // Arms
  for (const side of [-1, 1]) {
    const armGeo = new THREE.CapsuleGeometry(segments[3].radius, segments[3].height, 4, 8);
    const arm = new THREE.Mesh(armGeo, bodyMat);
    arm.position.set(side * 0.38, segments[3].yOffset, 0);
    arm.rotation.x = rotations.arms;
    arm.rotation.z = side * 0.15;
    group.add(arm);

    // Shoulder joint
    const shoulderGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const shoulder = new THREE.Mesh(shoulderGeo, jointMat);
    shoulder.position.set(side * 0.28, segments[0].yOffset + 0.2, 0);
    group.add(shoulder);
  }

  return group;
}

export const ALL_POSES: MannequinPose[] = ['stand', 'sit-chair', 'lean-45', 'lie-flat'];
