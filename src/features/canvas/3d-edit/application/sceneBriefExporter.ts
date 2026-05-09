/**
 * Scene Brief exporter for the 3D director edit mode.
 *
 * Exports:
 *   - structured SceneBriefJson
 *   - deterministic natural-language text (zh / en)
 *
 * No React or i18n dependency. Language is injected by caller.
 *
 * @since v0.1.14
 */

import type { Director3dScene, SceneAnnotation, SceneMannequin, SceneProp, ShotCamera } from '../domain/sceneSchema';
import { generateZhBriefText, generateEnBriefText } from './sceneBriefTemplates';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SceneBriefSubject {
  id: string;
  kind: 'character' | 'prop';
  label: string;
  type: string;
  transform: {
    position: [number, number, number];
    rotationY: number;
    scale: number;
  };
  annotations: string[];
}

export interface SceneBriefCamera {
  id: string;
  name: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  semanticDescriptor: string;
}

export interface SceneBriefJson {
  schemaVersion: 1;
  generatedAt: number;
  language: 'zh' | 'en';
  scene: {
    units: 'meter';
    cameraSystem: 'right-handed';
    yUp: true;
    ground: { plane: 'XZ'; visible: boolean };
  };
  subjects: SceneBriefSubject[];
  cameras: SceneBriefCamera[];
  metadata: {
    appVersion: string;
    sourceProjectId: string;
    sourceNodeId: string;
  };
}

export interface GenerateSceneBriefOptions {
  language: 'zh' | 'en';
  appVersion: string;
  sourceProjectId: string;
  sourceNodeId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampText(value: string): string {
  return value.trim();
}

function getAnnotationsFor(
  annotations: SceneAnnotation[],
  kind: 'mannequin' | 'prop',
  id: string,
): string[] {
  return annotations
    .filter((annotation) => annotation.attachTo.kind === kind && annotation.attachTo.id === id)
    .map((annotation) => clampText(annotation.text))
    .filter((text) => text.length > 0);
}

function getMannequinLabel(subject: SceneMannequin): string {
  const label = subject.label?.trim();
  return label && label.length > 0 ? label : 'mannequin';
}

function getPropLabel(subject: SceneProp): string {
  const label = subject.label?.trim();
  return label && label.length > 0 ? label : subject.definitionId;
}

function subjectTypeForMannequin(subject: SceneMannequin): string {
  return `mannequin/${subject.pose}`;
}

function subjectTypeForProp(subject: SceneProp): string {
  return `prop/${subject.definitionId}`;
}

function describeCameraSemanticZh(camera: ShotCamera): string {
  const [x, y, z] = camera.position;
  const parts: string[] = [];

  if (Math.abs(z) < 0.5) parts.push('居中');
  else if (z < 0) parts.push('前方');
  else parts.push('后方');

  if (Math.abs(x) >= 0.5) {
    parts.push(x > 0 ? '右侧' : '左侧');
  }

  if (y < 0.8) parts.push('低机位');
  else if (y < 2.2) parts.push('平视');
  else parts.push('高机位');

  if (camera.fov < 30) parts.push('特写');
  else if (camera.fov < 60) parts.push('中景');
  else parts.push('全景');

  return parts.join('，');
}

function describeCameraSemanticEn(camera: ShotCamera): string {
  const [x, y, z] = camera.position;
  const parts: string[] = [];

  if (Math.abs(z) < 0.5) parts.push('center');
  else if (z < 0) parts.push('front');
  else parts.push('back');

  if (Math.abs(x) >= 0.5) {
    parts.push(x > 0 ? 'right' : 'left');
  }

  if (y < 0.8) parts.push('low angle');
  else if (y < 2.2) parts.push('eye level');
  else parts.push('high angle');

  if (camera.fov < 30) parts.push('close-up');
  else if (camera.fov < 60) parts.push('medium shot');
  else parts.push('wide shot');

  return parts.join(', ');
}

function toSubjectFromMannequin(scene: Director3dScene, subject: SceneMannequin): SceneBriefSubject {
  return {
    id: subject.id,
    kind: 'character',
    label: getMannequinLabel(subject),
    type: subjectTypeForMannequin(subject),
    transform: {
      position: subject.position,
      rotationY: subject.rotationY,
      scale: subject.scale,
    },
    annotations: getAnnotationsFor(scene.annotations, 'mannequin', subject.id),
  };
}

function toSubjectFromProp(scene: Director3dScene, subject: SceneProp): SceneBriefSubject {
  return {
    id: subject.id,
    kind: 'prop',
    label: getPropLabel(subject),
    type: subjectTypeForProp(subject),
    transform: {
      position: subject.position,
      rotationY: subject.rotationY,
      scale: subject.scale,
    },
    annotations: getAnnotationsFor(scene.annotations, 'prop', subject.id),
  };
}

function toCameraBrief(language: 'zh' | 'en', camera: ShotCamera): SceneBriefCamera {
  return {
    id: camera.id,
    name: camera.name,
    position: camera.position,
    lookAt: camera.target,
    fov: camera.fov,
    semanticDescriptor:
      language === 'zh'
        ? describeCameraSemanticZh(camera)
        : describeCameraSemanticEn(camera),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateSceneBriefJson(
  scene: Director3dScene,
  options: GenerateSceneBriefOptions,
): SceneBriefJson {
  const subjects: SceneBriefSubject[] = [
    ...scene.mannequins.map((subject) => toSubjectFromMannequin(scene, subject)),
    ...scene.props.map((subject) => toSubjectFromProp(scene, subject)),
  ];

  const cameras = scene.shots.map((camera) => toCameraBrief(options.language, camera));

  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    language: options.language,
    scene: {
      units: 'meter',
      cameraSystem: 'right-handed',
      yUp: true,
      ground: {
        plane: 'XZ',
        visible: scene.ground.visible,
      },
    },
    subjects,
    cameras,
    metadata: {
      appVersion: options.appVersion,
      sourceProjectId: options.sourceProjectId,
      sourceNodeId: options.sourceNodeId,
    },
  };
}

export function generateSceneBriefText(
  scene: Director3dScene,
  language: 'zh' | 'en',
): string {
  return language === 'zh'
    ? generateZhBriefText(scene)
    : generateEnBriefText(scene);
}
