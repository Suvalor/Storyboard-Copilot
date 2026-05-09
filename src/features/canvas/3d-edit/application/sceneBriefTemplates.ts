/**
 * Deterministic natural-language templates for Scene Brief export.
 *
 * Two languages: zh (Chinese) and en (English).
 * Positions are described relative to scene center using方位 language.
 * No LLM dependency -- pure string templates.
 *
 * @since v0.1.14
 */

import type { Director3dScene, SceneAnnotation, ShotCamera } from '../domain/sceneSchema';

// ---------------------------------------------------------------------------
// Utility: describe position relative to scene center
// ---------------------------------------------------------------------------

/** Describe a world-space XZ position relative to origin in Chinese. */
function describePositionZh(x: number, y: number, z: number): string {
  const parts: string[] = [];

  // Horizontal (X axis): left/right
  if (Math.abs(x) < 0.05) {
    parts.push('场景中央');
  } else if (x > 0) {
    parts.push(`偏右 ${x.toFixed(1)}m`);
  } else {
    parts.push(`偏左 ${(-x).toFixed(1)}m`);
  }

  // Depth (Z axis): forward/backward
  if (Math.abs(z) >= 0.05) {
    if (z < 0) {
      parts.push(`前方 ${(-z).toFixed(1)}m`);
    } else {
      parts.push(`后方 ${z.toFixed(1)}m`);
    }
  }

  // Height (Y axis)
  if (Math.abs(y - 0) > 0.05 && Math.abs(y - 1) > 0.05) {
    parts.push(`高度 ${y.toFixed(1)}m`);
  } else if (Math.abs(y - 1) < 0.05) {
    parts.push('站立高度');
  }

  return parts.join('、');
}

/** Describe a world-space XZ position relative to origin in English. */
function describePositionEn(x: number, y: number, z: number): string {
  const parts: string[] = [];

  if (Math.abs(x) < 0.05) {
    parts.push('center');
  } else if (x > 0) {
    parts.push(`right ${x.toFixed(1)}m`);
  } else {
    parts.push(`left ${(-x).toFixed(1)}m`);
  }

  if (Math.abs(z) >= 0.05) {
    if (z < 0) {
      parts.push(`front ${(-z).toFixed(1)}m`);
    } else {
      parts.push(`back ${z.toFixed(1)}m`);
    }
  }

  if (Math.abs(y) > 0.05 && Math.abs(y - 1) > 0.05) {
    parts.push(`height ${y.toFixed(1)}m`);
  } else if (Math.abs(y - 1) < 0.05) {
    parts.push('standing height');
  }

  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Utility: rotation in degrees to direction label
// ---------------------------------------------------------------------------

const RAD2DEG = 180 / Math.PI;

function directionLabelZh(rotationY: number): string {
  const deg = ((rotationY * RAD2DEG) % 360 + 360) % 360;
  if (deg < 22.5 || deg >= 337.5) return '前方';
  if (deg < 67.5) return '右前方';
  if (deg < 112.5) return '右侧';
  if (deg < 157.5) return '右后方';
  if (deg < 202.5) return '后方';
  if (deg < 247.5) return '左后方';
  if (deg < 292.5) return '左侧';
  return '左前方';
}

function directionLabelEn(rotationY: number): string {
  const deg = ((rotationY * RAD2DEG) % 360 + 360) % 360;
  if (deg < 22.5 || deg >= 337.5) return 'forward';
  if (deg < 67.5) return 'front-right';
  if (deg < 112.5) return 'right';
  if (deg < 157.5) return 'back-right';
  if (deg < 202.5) return 'backward';
  if (deg < 247.5) return 'back-left';
  if (deg < 292.5) return 'left';
  return 'front-left';
}

// ---------------------------------------------------------------------------
// Utility: collect annotations for a given object
// ---------------------------------------------------------------------------

function getAnnotationsFor(
  annotations: SceneAnnotation[],
  kind: 'mannequin' | 'prop',
  id: string,
): string[] {
  return annotations
    .filter((a) => a.attachTo.kind === kind && a.attachTo.id === id)
    .map((a) => a.text);
}

// ---------------------------------------------------------------------------
// Pose label
// ---------------------------------------------------------------------------

const POSE_ZH: Record<string, string> = {
  'stand': '站姿',
  'sit-chair': '坐姿',
  'lean-45': '倚靠',
  'lie-flat': '卧姿',
};

const POSE_EN: Record<string, string> = {
  'stand': 'standing',
  'sit-chair': 'sitting',
  'lean-45': 'leaning',
  'lie-flat': 'lying down',
};

// ---------------------------------------------------------------------------
// Camera semantic descriptor
// ---------------------------------------------------------------------------

function cameraSemanticZh(shot: ShotCamera): string {
  const [x, y, z] = shot.position;
  const parts: string[] = [];

  // Vertical position
  if (y < 0.5) parts.push('地面视角');
  else if (y < 1.2) parts.push('平视');
  else if (y < 2.5) parts.push('略高视角');
  else parts.push('俯视');

  // Horizontal position
  if (Math.abs(x) < 0.5 && Math.abs(z) < 0.5) parts.push('正中');
  else if (z < 0) parts.push('正面');
  else parts.push('侧面');

  // FOV category
  if (shot.fov < 30) parts.push('特写');
  else if (shot.fov < 60) parts.push('中景');
  else parts.push('全景');

  return parts.join('，');
}

function cameraSemanticEn(shot: ShotCamera): string {
  const [x, y, z] = shot.position;
  const parts: string[] = [];

  if (y < 0.5) parts.push('ground level');
  else if (y < 1.2) parts.push('eye level');
  else if (y < 2.5) parts.push('slightly elevated');
  else parts.push('high angle');

  if (Math.abs(x) < 0.5 && Math.abs(z) < 0.5) parts.push('center');
  else if (z < 0) parts.push('front');
  else parts.push('side');

  if (shot.fov < 30) parts.push('close-up');
  else if (shot.fov < 60) parts.push('medium shot');
  else parts.push('wide shot');

  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Chinese template
// ---------------------------------------------------------------------------

export function generateZhBriefText(scene: Director3dScene): string {
  const subjectCount = scene.mannequins.length + scene.props.length;
  const shotCount = scene.shots.length;
  const lines: string[] = [];

  // Scene description
  lines.push(`场景由 ${subjectCount} 个主体和 ${shotCount} 个机位组成。`);
  lines.push(`背景：${scene.background.url ? '已设置全景背景' : '无'}`);
  lines.push(`地面网格：${scene.ground.gridVisible ? '显示' : '隐藏'}`);
  lines.push('');

  // Subject list
  lines.push('【主体清单】');
  let idx = 1;

  for (const m of scene.mannequins) {
    const label = m.label ?? `人物 ${idx}`;
    const pose = POSE_ZH[m.pose] ?? m.pose;
    const pos = describePositionZh(m.position[0], m.position[1], m.position[2]);
    const dir = directionLabelZh(m.rotationY);
    const anns = getAnnotationsFor(scene.annotations, 'mannequin', m.id);

    let line = `${idx}. ${label}：${pose}，位于${pos}，面朝${dir}。`;
    if (anns.length > 0) {
      line += `\n   备注：${anns.join('；')}`;
    }
    lines.push(line);
    idx++;
  }

  for (const p of scene.props) {
    const label = p.label ?? `道具 ${idx}`;
    const pos = describePositionZh(p.position[0], p.position[1], p.position[2]);
    const dir = directionLabelZh(p.rotationY);
    const anns = getAnnotationsFor(scene.annotations, 'prop', p.id);

    let line = `${idx}. 道具：${label}，位于${pos}，面朝${dir}。`;
    if (anns.length > 0) {
      line += `\n   备注：${anns.join('；')}`;
    }
    lines.push(line);
    idx++;
  }

  lines.push('');

  // Camera list
  lines.push('【机位清单】');
  for (const shot of scene.shots) {
    const pos = describePositionZh(shot.position[0], shot.position[1], shot.position[2]);
    const semantic = cameraSemanticZh(shot);
    const [tx, ty, tz] = shot.target;
    lines.push(
      `- ${shot.name}：位于${pos}，FOV ${shot.fov}°，看向 (${tx.toFixed(1)}, ${ty.toFixed(1)}, ${tz.toFixed(1)})。`,
    );
    lines.push(`  相对场景中心："${semantic}"`);
  }

  lines.push('');

  // Suggested camera moves (Phase 2 placeholder)
  lines.push('【建议运镜】');
  lines.push('（Phase 2 将提供：相机从 A → B 的推近 / 摇移 / 俯冲）');

  lines.push('');

  // Output intent
  lines.push('【输出意图】');
  lines.push('请基于以上空间布局生成视频，确保主角始终在画面中央，道具不遮挡视线。');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// English template
// ---------------------------------------------------------------------------

export function generateEnBriefText(scene: Director3dScene): string {
  const subjectCount = scene.mannequins.length + scene.props.length;
  const shotCount = scene.shots.length;
  const lines: string[] = [];

  // Scene description
  lines.push(`The scene contains ${subjectCount} subject(s) and ${shotCount} camera shot(s).`);
  lines.push(`Background: ${scene.background.url ? 'panorama background set' : 'none'}`);
  lines.push(`Ground grid: ${scene.ground.gridVisible ? 'visible' : 'hidden'}`);
  lines.push('');

  // Subject list
  lines.push('[Subjects]');
  let idx = 1;

  for (const m of scene.mannequins) {
    const label = m.label ?? `Character ${idx}`;
    const pose = POSE_EN[m.pose] ?? m.pose;
    const pos = describePositionEn(m.position[0], m.position[1], m.position[2]);
    const dir = directionLabelEn(m.rotationY);
    const anns = getAnnotationsFor(scene.annotations, 'mannequin', m.id);

    let line = `${idx}. ${label}: ${pose}, located at ${pos}, facing ${dir}.`;
    if (anns.length > 0) {
      line += `\n   Note: ${anns.join('; ')}`;
    }
    lines.push(line);
    idx++;
  }

  for (const p of scene.props) {
    const label = p.label ?? `Prop ${idx}`;
    const pos = describePositionEn(p.position[0], p.position[1], p.position[2]);
    const dir = directionLabelEn(p.rotationY);
    const anns = getAnnotationsFor(scene.annotations, 'prop', p.id);

    let line = `${idx}. Prop: ${label}, located at ${pos}, facing ${dir}.`;
    if (anns.length > 0) {
      line += `\n   Note: ${anns.join('; ')}`;
    }
    lines.push(line);
    idx++;
  }

  lines.push('');

  // Camera list
  lines.push('[Camera Shots]');
  for (const shot of scene.shots) {
    const pos = describePositionEn(shot.position[0], shot.position[1], shot.position[2]);
    const semantic = cameraSemanticEn(shot);
    const [tx, ty, tz] = shot.target;
    lines.push(
      `- ${shot.name}: at ${pos}, FOV ${shot.fov}°, looking at (${tx.toFixed(1)}, ${ty.toFixed(1)}, ${tz.toFixed(1)}).`,
    );
    lines.push(`  Relative to scene center: "${semantic}"`);
  }

  lines.push('');

  // Suggested camera moves (Phase 2 placeholder)
  lines.push('[Suggested Camera Moves]');
  lines.push('(Phase 2: camera push-in / pan / crane from A to B)');

  lines.push('');

  // Output intent
  lines.push('[Output Intent]');
  lines.push('Generate video based on the spatial layout above. Keep the main subject centered and ensure props do not obstruct the view.');

  return lines.join('\n');
}
