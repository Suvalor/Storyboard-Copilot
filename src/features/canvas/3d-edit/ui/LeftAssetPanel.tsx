/**
 * Left asset panel for the 3D director edit mode.
 *
 * Two tabs: Characters / Props.
 *   Characters tab: 4 pose buttons (stand/sit/lean/lie), click -> addMannequin
 *   Props tab: categorized prop list, click -> addProp; search filter
 *
 * @since v0.1.14
 */

import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';

import { useDirector3dEditStore } from '../editStore';
import { ALL_POSES, MANNEQUIN_PALETTE } from '@/features/canvas/3d/mannequin';
import type { MannequinPose } from '@/features/canvas/3d/mannequin';
import { PROP_CATEGORIES, getPropsByCategory } from '@/features/canvas/3d/props';
import type { PropCategory } from '@/features/canvas/3d/props';
import type { SceneMannequin, SceneProp } from '../domain/sceneSchema';

// ---------------------------------------------------------------------------
// Pose label helper
// ---------------------------------------------------------------------------

const POSE_LABELS: Record<MannequinPose, string> = {
  stand: 'director3dEdit.poseStand',
  'sit-chair': 'director3dEdit.poseSit',
  'lean-45': 'director3dEdit.poseLean',
  'lie-flat': 'director3dEdit.poseLie',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const LeftAssetPanel = memo(function LeftAssetPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'characters' | 'props'>('characters');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab header */}
      <div className="flex shrink-0 border-b border-white/10">
        <TabButton
          active={activeTab === 'characters'}
          onClick={() => setActiveTab('characters')}
          label={t('director3dEdit.tabCharacters')}
        />
        <TabButton
          active={activeTab === 'props'}
          onClick={() => setActiveTab('props')}
          label={t('director3dEdit.tabProps')}
        />
      </div>

      {/* Tab content */}
      <div className="flex flex-1 overflow-y-auto">
        {activeTab === 'characters' ? (
          <CharactersTab />
        ) : (
          <PropsTab searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'bg-white/10 text-white border-b-2 border-accent'
          : 'text-white/50 hover:text-white/70'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Characters tab
// ---------------------------------------------------------------------------

function CharactersTab() {
  const { t } = useTranslation();
  const addMannequin = useDirector3dEditStore((s) => s.addMannequin);

  const handleAddPose = useCallback(
    (pose: MannequinPose) => {
      // Pick a color from the palette cycling by existing count
      const scene = useDirector3dEditStore.getState().scene;
      const idx = scene.mannequins.length % MANNEQUIN_PALETTE.length;
      const color = MANNEQUIN_PALETTE[idx] ?? MANNEQUIN_PALETTE[0];

      const mannequin: SceneMannequin = {
        id: uuid(),
        pose,
        position: [(Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4],
        rotationY: 0,
        scale: 1,
        color,
      };
      addMannequin(mannequin);
    },
    [addMannequin],
  );

  return (
    <div className="p-3 space-y-2">
      <div className="text-xs text-white/50 mb-2">
        {t('director3dEdit.addCharacterHint')}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ALL_POSES.map((pose) => (
          <button
            key={pose}
            className="px-3 py-2 text-xs bg-white/8 text-white/80 rounded hover:bg-white/15 transition-colors"
            onClick={() => handleAddPose(pose)}
          >
            {t(POSE_LABELS[pose])}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props tab
// ---------------------------------------------------------------------------

function PropsTab({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const { t } = useTranslation();
  const addProp = useDirector3dEditStore((s) => s.addProp);

  const [selectedCategory, setSelectedCategory] = useState<PropCategory>('indoor-furniture');

  const handleAddProp = useCallback(
    (definitionId: string) => {
      const prop: SceneProp = {
        id: uuid(),
        definitionId,
        position: [(Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4],
        rotationY: 0,
        scale: 1,
      };
      addProp(prop);
    },
    [addProp],
  );

  // Filter props by category + search query
  const categoryProps = getPropsByCategory(selectedCategory);
  const filteredProps = searchQuery
    ? categoryProps.filter((p) =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : categoryProps;

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="shrink-0 p-2">
        <input
          type="text"
          className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          placeholder={t('director3dEdit.searchProps')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Category selector */}
      <div className="shrink-0 flex flex-wrap gap-1 px-2 pb-2">
        {PROP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedCategory === cat.id
                ? 'bg-accent/20 text-white'
                : 'bg-white/5 text-white/50 hover:text-white/70'
            }`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {t(cat.labelKey)}
          </button>
        ))}
      </div>

      {/* Prop list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="grid grid-cols-2 gap-1">
          {filteredProps.map((prop) => (
            <button
              key={prop.id}
              className="px-2 py-1.5 text-xs bg-white/8 text-white/80 rounded hover:bg-white/15 transition-colors truncate"
              onClick={() => handleAddProp(prop.id)}
              title={prop.label}
            >
              {prop.label}
            </button>
          ))}
        </div>
        {filteredProps.length === 0 && (
          <div className="text-xs text-white/40 py-4 text-center">
            {t('director3dEdit.noPropsFound')}
          </div>
        )}
      </div>
    </div>
  );
}