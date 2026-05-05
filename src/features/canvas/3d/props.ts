import * as THREE from 'three';

export type PropCategory =
  | 'indoor-furniture'
  | 'outdoor-props'
  | 'ancient-props'
  | 'architecture'
  | 'decoration'
  | 'geometry';

export interface PropDefinition {
  id: string;
  label: string;
  category: PropCategory;
  createMesh: () => THREE.Mesh | THREE.Group;
}

export interface PropCategoryInfo {
  id: PropCategory;
  labelKey: string;
}

export const PROP_CATEGORIES: PropCategoryInfo[] = [
  { id: 'indoor-furniture', labelKey: 'node.director3d.propCategoryIndoor' },
  { id: 'outdoor-props', labelKey: 'node.director3d.propCategoryOutdoor' },
  { id: 'ancient-props', labelKey: 'node.director3d.propCategoryAncient' },
  { id: 'architecture', labelKey: 'node.director3d.propCategoryArchitecture' },
  { id: 'decoration', labelKey: 'node.director3d.propCategoryDecoration' },
  { id: 'geometry', labelKey: 'node.director3d.propCategoryGeometry' },
];

function box(w: number, h: number, d: number, color: string, y?: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  if (y !== undefined) mesh.position.y = y;
  return mesh;
}

function cylinder(
  rTop: number, rBot: number, h: number, segs: number, color: string, y?: number,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15 });
  const mesh = new THREE.Mesh(geo, mat);
  if (y !== undefined) mesh.position.y = y;
  return mesh;
}

// --- Indoor Furniture ---
const indoorFurniture: PropDefinition[] = [
  {
    id: 'chair',
    label: '椅子',
    category: 'indoor-furniture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(0.45, 0.04, 0.45, '#8B7355', 0.45));
      g.add(box(0.45, 0.5, 0.04, '#8B7355', 0.72));
      for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
        g.add(box(0.04, 0.45, 0.04, '#8B7355', 0.225).translateX(x).translateZ(z));
      }
      return g;
    },
  },
  {
    id: 'table',
    label: '桌子',
    category: 'indoor-furniture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(1.2, 0.05, 0.7, '#A0522D', 0.75));
      for (const [x, z] of [[-0.5, -0.28], [0.5, -0.28], [-0.5, 0.28], [0.5, 0.28]]) {
        g.add(box(0.05, 0.75, 0.05, '#A0522D', 0.375).translateX(x).translateZ(z));
      }
      return g;
    },
  },
  {
    id: 'sofa',
    label: '沙发',
    category: 'indoor-furniture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(1.8, 0.35, 0.8, '#4a5568', 0.2));
      g.add(box(1.8, 0.5, 0.12, '#4a5568', 0.55).translateZ(-0.34));
      g.add(box(0.12, 0.35, 0.8, '#4a5568', 0.35).translateX(-0.84));
      g.add(box(0.12, 0.35, 0.8, '#4a5568', 0.35).translateX(0.84));
      return g;
    },
  },
  {
    id: 'bed',
    label: '床',
    category: 'indoor-furniture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(1.6, 0.3, 2.2, '#e2e8f0', 0.2));
      g.add(box(1.6, 0.6, 0.08, '#718096', 0.55).translateZ(-1.06));
      return g;
    },
  },
  {
    id: 'bookshelf',
    label: '书架',
    category: 'indoor-furniture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(1.0, 1.8, 0.35, '#8B7355', 0.9));
      for (let i = 0; i < 4; i++) {
        g.add(box(0.96, 0.03, 0.32, '#6B5B45', 0.3 + i * 0.45));
      }
      return g;
    },
  },
  {
    id: 'desk-lamp',
    label: '台灯',
    category: 'indoor-furniture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.12, 0.15, 0.03, 16, '#2d3748', 0.015));
      g.add(cylinder(0.015, 0.015, 0.5, 8, '#718096', 0.28));
      g.add(cylinder(0.12, 0.0, 0.15, 12, '#fbd38d', 0.58));
      return g;
    },
  },
];

// --- Outdoor Props ---
const outdoorProps: PropDefinition[] = [
  {
    id: 'tree',
    label: '树',
    category: 'outdoor-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.08, 0.12, 1.5, 8, '#5D4037', 0.75));
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#2E7D32', roughness: 0.8 }),
      );
      crown.position.y = 1.8;
      g.add(crown);
      return g;
    },
  },
  {
    id: 'rock',
    label: '石头',
    category: 'outdoor-props',
    createMesh: () => {
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.3, 1),
        new THREE.MeshStandardMaterial({ color: '#78909C', roughness: 0.9 }),
      );
      mesh.position.y = 0.2;
      mesh.scale.set(1, 0.6, 0.8);
      return mesh;
    },
  },
  {
    id: 'bench',
    label: '长椅',
    category: 'outdoor-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(1.5, 0.05, 0.4, '#8D6E63', 0.45));
      g.add(box(1.5, 0.4, 0.04, '#8D6E63', 0.65).translateZ(-0.18));
      for (const x of [-0.6, 0, 0.6]) {
        g.add(box(0.05, 0.45, 0.35, '#5D4037', 0.225).translateX(x));
      }
      return g;
    },
  },
  {
    id: 'street-lamp',
    label: '路灯',
    category: 'outdoor-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.03, 0.05, 3.0, 8, '#37474F', 1.5));
      g.add(box(0.3, 0.04, 0.04, '#37474F', 2.95).translateZ(0.12));
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#FFF9C4', emissive: '#FFF176', emissiveIntensity: 0.5 }),
      );
      bulb.position.set(0, 2.9, 0.25);
      g.add(bulb);
      return g;
    },
  },
  {
    id: 'fence',
    label: '栅栏',
    category: 'outdoor-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(2.0, 0.04, 0.04, '#8D6E63', 0.6));
      g.add(box(2.0, 0.04, 0.04, '#8D6E63', 0.35));
      for (let i = -4; i <= 4; i++) {
        g.add(box(0.04, 0.8, 0.04, '#8D6E63', 0.4).translateX(i * 0.22));
      }
      return g;
    },
  },
  {
    id: 'bush',
    label: '灌木',
    category: 'outdoor-props',
    createMesh: () => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#388E3C', roughness: 0.85 }),
      );
      mesh.position.y = 0.3;
      mesh.scale.set(1.2, 0.7, 1.0);
      return mesh;
    },
  },
  {
    id: 'mailbox',
    label: '邮筒',
    category: 'outdoor-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.06, 0.06, 1.0, 8, '#455A64', 0.5));
      g.add(cylinder(0.15, 0.15, 0.35, 12, '#1565C0', 1.15));
      return g;
    },
  },
  {
    id: 'trash-can',
    label: '垃圾桶',
    category: 'outdoor-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.18, 0.16, 0.6, 12, '#546E7A', 0.3));
      g.add(cylinder(0.19, 0.19, 0.03, 12, '#455A64', 0.62));
      return g;
    },
  },
  {
    id: 'hydrant',
    label: '消防栓',
    category: 'outdoor-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.1, 0.12, 0.5, 10, '#C62828', 0.25));
      g.add(cylinder(0.05, 0.05, 0.15, 8, '#B71C1C', 0.45).rotateZ(Math.PI / 2).translateX(0.12));
      return g;
    },
  },
  {
    id: 'barrel',
    label: '木桶',
    category: 'outdoor-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.25, 0.22, 0.6, 12, '#6D4C41', 0.3));
      g.add(cylinder(0.26, 0.26, 0.03, 12, '#5D4037', 0.62));
      return g;
    },
  },
];

// --- Ancient Props ---
const ancientProps: PropDefinition[] = [
  {
    id: 'torii',
    label: '鸟居',
    category: 'ancient-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(0.12, 3.0, 0.12, '#B71C1C', 1.5).translateX(-1.2));
      g.add(box(0.12, 3.0, 0.12, '#B71C1C', 1.5).translateX(1.2));
      g.add(box(2.7, 0.1, 0.12, '#B71C1C', 2.9));
      g.add(box(2.5, 0.08, 0.08, '#C62828', 2.5));
      return g;
    },
  },
  {
    id: 'lantern',
    label: '灯笼',
    category: 'ancient-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.04, 0.06, 0.03, 8, '#5D4037', 0.015));
      g.add(cylinder(0.02, 0.02, 0.8, 6, '#5D4037', 0.43));
      const lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 0.25, 6),
        new THREE.MeshStandardMaterial({ color: '#FF8F00', emissive: '#FF6F00', emissiveIntensity: 0.3, roughness: 0.5 }),
      );
      lamp.position.y = 0.95;
      g.add(lamp);
      return g;
    },
  },
  {
    id: 'stone-tablet',
    label: '石碑',
    category: 'ancient-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(0.6, 1.2, 0.15, '#9E9E9E', 0.6));
      g.add(box(0.7, 0.1, 0.2, '#757575', 0.05));
      return g;
    },
  },
  {
    id: 'pagoda-tier',
    label: '塔层',
    category: 'ancient-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.4, 0.5, 0.3, 6, '#5D4037', 0.15));
      g.add(cylinder(0.3, 0.35, 0.5, 6, '#8D6E63', 0.55));
      g.add(cylinder(0.35, 0.45, 0.2, 6, '#5D4037', 0.85));
      return g;
    },
  },
  {
    id: 'zen-garden-rock',
    label: '枯山水石',
    category: 'ancient-props',
    createMesh: () => {
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.4, 0),
        new THREE.MeshStandardMaterial({ color: '#78909C', roughness: 0.95 }),
      );
      mesh.position.y = 0.25;
      mesh.scale.set(1.2, 0.7, 0.9);
      return mesh;
    },
  },
  {
    id: 'bamboo',
    label: '竹子',
    category: 'ancient-props',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.03, 0.04, 3.0, 8, '#558B2F', 1.5));
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 0.08),
          new THREE.MeshStandardMaterial({ color: '#689F38', side: THREE.DoubleSide }),
        );
        leaf.position.set(0.12, 2.0 + i * 0.4, 0);
        leaf.rotation.z = -0.3;
        g.add(leaf);
      }
      return g;
    },
  },
];

// --- Architecture ---
const architecture: PropDefinition[] = [
  {
    id: 'wall-straight',
    label: '直墙',
    category: 'architecture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(3.0, 2.5, 0.15, '#BDBDBD', 1.25));
      return g;
    },
  },
  {
    id: 'wall-corner',
    label: '转角墙',
    category: 'architecture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(1.5, 2.5, 0.15, '#BDBDBD', 1.25).translateX(0.68));
      g.add(box(0.15, 2.5, 1.5, '#BDBDBD', 1.25).translateZ(0.68));
      return g;
    },
  },
  {
    id: 'door-frame',
    label: '门框',
    category: 'architecture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(0.1, 2.1, 0.1, '#5D4037', 1.05).translateX(-0.5));
      g.add(box(0.1, 2.1, 0.1, '#5D4037', 1.05).translateX(0.5));
      g.add(box(1.1, 0.1, 0.1, '#5D4037', 2.1));
      return g;
    },
  },
  {
    id: 'window-frame',
    label: '窗框',
    category: 'architecture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(0.06, 1.2, 0.06, '#5D4037', 1.2).translateX(-0.5));
      g.add(box(0.06, 1.2, 0.06, '#5D4037', 1.2).translateX(0.5));
      g.add(box(1.06, 0.06, 0.06, '#5D4037', 1.8));
      g.add(box(1.06, 0.06, 0.06, '#5D4037', 0.6));
      return g;
    },
  },
  {
    id: 'stairs',
    label: '楼梯',
    category: 'architecture',
    createMesh: () => {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        g.add(box(1.2, 0.15, 0.3, '#9E9E9E', 0.075 + i * 0.15).translateZ(-i * 0.3));
      }
      return g;
    },
  },
  {
    id: 'pillar',
    label: '柱子',
    category: 'architecture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.15, 0.18, 3.0, 12, '#E0E0E0', 1.5));
      g.add(cylinder(0.22, 0.22, 0.1, 12, '#BDBDBD', 3.05));
      g.add(cylinder(0.22, 0.22, 0.1, 12, '#BDBDBD', -0.05));
      return g;
    },
  },
  {
    id: 'arch',
    label: '拱门',
    category: 'architecture',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(0.15, 2.0, 0.3, '#BDBDBD', 1.0).translateX(-0.85));
      g.add(box(0.15, 2.0, 0.3, '#BDBDBD', 1.0).translateX(0.85));
      const archGeo = new THREE.TorusGeometry(0.85, 0.08, 8, 16, Math.PI);
      const archMesh = new THREE.Mesh(archGeo, new THREE.MeshStandardMaterial({ color: '#BDBDBD', roughness: 0.7 }));
      archMesh.position.y = 2.0;
      g.add(archMesh);
      return g;
    },
  },
  {
    id: 'floor-tile',
    label: '地砖',
    category: 'architecture',
    createMesh: () => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshStandardMaterial({ color: '#E0E0E0', roughness: 0.8, side: THREE.DoubleSide }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.01;
      return mesh;
    },
  },
  {
    id: 'roof-gable',
    label: '人字屋顶',
    category: 'architecture',
    createMesh: () => {
      const g = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(-1.2, 0);
      shape.lineTo(0, 0.6);
      shape.lineTo(1.2, 0);
      shape.lineTo(-1.2, 0);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#795548', roughness: 0.8 }));
      mesh.position.set(0, 2.5, -1);
      g.add(mesh);
      return g;
    },
  },
  {
    id: 'curved-roof',
    label: '飞檐屋顶',
    category: 'architecture',
    createMesh: () => {
      const g = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(-1.5, 0);
      shape.quadraticCurveTo(-0.8, 0.5, 0, 0.7);
      shape.quadraticCurveTo(0.8, 0.5, 1.5, 0);
      shape.lineTo(-1.5, 0);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#3E2723', roughness: 0.7 }));
      mesh.position.set(0, 2.5, -1);
      g.add(mesh);
      return g;
    },
  },
];

// --- Decoration ---
const decoration: PropDefinition[] = [
  {
    id: 'flower-pot',
    label: '花盆',
    category: 'decoration',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.12, 0.15, 0.25, 10, '#8D6E63', 0.125));
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#E91E63', roughness: 0.7 }),
      );
      flower.position.y = 0.35;
      g.add(flower);
      return g;
    },
  },
  {
    id: 'candle',
    label: '蜡烛',
    category: 'decoration',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(cylinder(0.04, 0.04, 0.2, 8, '#FFF9C4', 0.1));
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.06, 6),
        new THREE.MeshStandardMaterial({ color: '#FF6F00', emissive: '#FF8F00', emissiveIntensity: 0.8 }),
      );
      flame.position.y = 0.23;
      g.add(flame);
      return g;
    },
  },
  {
    id: 'painting-frame',
    label: '画框',
    category: 'decoration',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(0.8, 0.6, 0.03, '#5D4037', 1.5));
      g.add(box(0.7, 0.5, 0.01, '#FFF8E1', 1.5).translateZ(0.02));
      return g;
    },
  },
  {
    id: 'rug',
    label: '地毯',
    category: 'decoration',
    createMesh: () => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 1.5),
        new THREE.MeshStandardMaterial({ color: '#880E4F', roughness: 0.9, side: THREE.DoubleSide }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.01;
      return mesh;
    },
  },
  {
    id: 'vase',
    label: '花瓶',
    category: 'decoration',
    createMesh: () => {
      const points: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const r = 0.08 + 0.1 * Math.sin(t * Math.PI) * (1 - 0.3 * t);
        points.push(new THREE.Vector2(r, t * 0.4));
      }
      const geo = new THREE.LatheGeometry(points, 12);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#1565C0', roughness: 0.4, metalness: 0.2 }));
      mesh.position.y = 0.2;
      return mesh;
    },
  },
  {
    id: 'curtain',
    label: '窗帘',
    category: 'decoration',
    createMesh: () => {
      const g = new THREE.Group();
      g.add(box(0.02, 2.0, 0.02, '#5D4037', 2.3).translateX(-0.6));
      g.add(box(0.02, 2.0, 0.02, '#5D4037', 2.3).translateX(0.6));
      g.add(box(1.22, 0.04, 0.04, '#5D4037', 2.8));
      g.add(box(0.5, 1.8, 0.02, '#E8EAF6', 1.8).translateX(-0.3).translateZ(0.02));
      g.add(box(0.5, 1.8, 0.02, '#E8EAF6', 1.8).translateX(0.3).translateZ(0.02));
      return g;
    },
  },
];

// --- Geometry ---
const geometry: PropDefinition[] = [
  {
    id: 'cube',
    label: '立方体',
    category: 'geometry',
    createMesh: () => new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: '#42A5F5', roughness: 0.5 }),
    ),
  },
  {
    id: 'sphere',
    label: '球体',
    category: 'geometry',
    createMesh: () => new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#EF5350', roughness: 0.5 }),
    ),
  },
  {
    id: 'cylinder-geo',
    label: '圆柱',
    category: 'geometry',
    createMesh: () => new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: '#66BB6A', roughness: 0.5 }),
    ),
  },
  {
    id: 'cone',
    label: '圆锥',
    category: 'geometry',
    createMesh: () => new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: '#FFA726', roughness: 0.5 }),
    ),
  },
  {
    id: 'torus',
    label: '圆环',
    category: 'geometry',
    createMesh: () => new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.08, 12, 24),
      new THREE.MeshStandardMaterial({ color: '#AB47BC', roughness: 0.5 }),
    ),
  },
  {
    id: 'plane',
    label: '平面',
    category: 'geometry',
    createMesh: () => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshStandardMaterial({ color: '#78909C', roughness: 0.6, side: THREE.DoubleSide }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.01;
      return mesh;
    },
  },
  {
    id: 'pyramid',
    label: '金字塔',
    category: 'geometry',
    createMesh: () => new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.6, 4),
      new THREE.MeshStandardMaterial({ color: '#FFCA28', roughness: 0.6 }),
    ),
  },
  {
    id: 'icosahedron',
    label: '二十面体',
    category: 'geometry',
    createMesh: () => new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ color: '#26C6DA', roughness: 0.4, metalness: 0.3 }),
    ),
  },
  {
    id: 'octahedron',
    label: '八面体',
    category: 'geometry',
    createMesh: () => new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ color: '#EC407A', roughness: 0.4, metalness: 0.3 }),
    ),
  },
  {
    id: 'capsule',
    label: '胶囊体',
    category: 'geometry',
    createMesh: () => new THREE.Mesh(
      new THREE.CapsuleGeometry(0.15, 0.4, 4, 8),
      new THREE.MeshStandardMaterial({ color: '#8D6E63', roughness: 0.5 }),
    ),
  },
];

export const ALL_PROPS: PropDefinition[] = [
  ...indoorFurniture,
  ...outdoorProps,
  ...ancientProps,
  ...architecture,
  ...decoration,
  ...geometry,
];

export function getPropsByCategory(category: PropCategory): PropDefinition[] {
  return ALL_PROPS.filter((p) => p.category === category);
}

export function getPropById(id: string): PropDefinition | undefined {
  return ALL_PROPS.find((p) => p.id === id);
}
