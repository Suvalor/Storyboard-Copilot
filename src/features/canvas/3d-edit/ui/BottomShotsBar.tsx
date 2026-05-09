/**
 * Bottom bar showing Shot Camera thumbnails.
 *
 * Features:
 *   - Horizontal scrollable thumbnail list (one per Shot)
 *   - "Add Shot" button: creates new Shot from current camera position
 *   - "Free Camera" button: setActiveShot(null) for free editing
 *   - Click thumbnail: setActiveShot(shotId) to switch to that shot
 *   - Active highlight when activeShotId matches
 *   - Delete button (visible on hover): removeShot(shotId)
 *   - Double-click name: inline rename via updateShot
 *
 * @since v0.1.14 — Sprint 3
 */

import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Video } from 'lucide-react';

import { useDirector3dEditStore } from '../editStore';
import type { ShotCamera } from '../domain/sceneSchema';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Thumbnail width in px. */
const THUMB_W = 96;
/** Thumbnail height in px. */
const THUMB_H = 54;

// ---------------------------------------------------------------------------
// Inline rename sub-component
// ---------------------------------------------------------------------------

interface InlineRenameProps {
  initialName: string;
  onCommit: (newName: string) => void;
  onCancel: () => void;
}

function InlineRename({ initialName, onCommit, onCancel }: InlineRenameProps) {
  const [value, setValue] = useState(initialName);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const trimmed = value.trim();
        if (trimmed) onCommit(trimmed);
        else onCancel();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [value, onCommit, onCancel],
  );

  const handleBlur = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialName) onCommit(trimmed);
    else onCancel();
  }, [value, initialName, onCommit, onCancel]);

  // Auto-focus on mount
  const handleRef = useCallback(
    (el: HTMLInputElement | null) => {
      el?.focus();
      el?.select();
    },
    [],
  );

  return (
    <input
      ref={handleRef}
      className="w-full border-none bg-transparent px-1 text-xs text-white outline-none ring-1 ring-accent"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
}

// ---------------------------------------------------------------------------
// Single shot thumbnail card
// ---------------------------------------------------------------------------

interface ShotCardProps {
  shot: ShotCamera;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

const ShotCard = memo(function ShotCard({
  shot,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: ShotCardProps) {
  const { t } = useTranslation();
  const [isRenaming, setIsRenaming] = useState(false);

  const handleDoubleClickName = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsRenaming(true);
    },
    [],
  );

  const handleRenameCommit = useCallback(
    (newName: string) => {
      onRename(shot.id, newName);
      setIsRenaming(false);
    },
    [shot.id, onRename],
  );

  const handleRenameCancel = useCallback(() => {
    setIsRenaming(false);
  }, []);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(shot.id);
    },
    [shot.id, onDelete],
  );

  return (
    <button
      className={`group relative flex shrink-0 flex-col items-stretch overflow-hidden rounded-md border transition-colors ${
        isActive
          ? 'border-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)]'
          : 'border-white/15 hover:border-white/30'
      }`}
      style={{ width: THUMB_W }}
      onClick={() => onSelect(shot.id)}
      title={shot.name}
    >
      {/* Thumbnail preview */}
      <div
        className="relative overflow-hidden bg-black/40"
        style={{ height: THUMB_H }}
      >
        {shot.thumbnailDataUrl ? (
          <img
            src={shot.thumbnailDataUrl}
            alt={shot.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/30">
            <Video className="h-5 w-5" />
          </div>
        )}

        {/* Delete button — visible on hover */}
        <button
          className="absolute right-0.5 top-0.5 hidden rounded bg-black/60 p-0.5 text-white/70 transition-opacity hover:text-white group-hover:block"
          onClick={handleDelete}
          aria-label={t('director3dEdit.shotsBar.deleteShot')}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Name */}
      <div className="truncate px-1 py-0.5 text-[10px] leading-tight text-white/80">
        {isRenaming ? (
          <InlineRename
            initialName={shot.name}
            onCommit={handleRenameCommit}
            onCancel={handleRenameCancel}
          />
        ) : (
          <span onDoubleClick={handleDoubleClickName}>{shot.name}</span>
        )}
      </div>
    </button>
  );
});

ShotCard.displayName = 'ShotCard';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/** Bottom bar with Shot Camera thumbnails. */
export const BottomShotsBar = memo(function BottomShotsBar() {
  const { t } = useTranslation();

  const shots = useDirector3dEditStore((s) => s.scene.shots);
  const activeShotId = useDirector3dEditStore((s) => s.scene.activeShotId);
  const setActiveShot = useDirector3dEditStore((s) => s.setActiveShot);
  const removeShot = useDirector3dEditStore((s) => s.removeShot);
  const updateShot = useDirector3dEditStore((s) => s.updateShot);

  const handleSelectShot = useCallback(
    (id: string) => setActiveShot(id),
    [setActiveShot],
  );

  const handleDeleteShot = useCallback(
    (id: string) => removeShot(id),
    [removeShot],
  );

  const handleRenameShot = useCallback(
    (id: string, newName: string) => updateShot(id, { name: newName }),
    [updateShot],
  );

  /** Add a new shot from the current camera (dispatch custom event to read camera). */
  const handleAddShot = useCallback(() => {
    // Dispatch event so EditViewport's CameraController reads the current
    // camera position and calls addShot with it.
    window.dispatchEvent(new CustomEvent('director3d-edit/add-shot-from-camera'));
  }, []);

  const handleFreeCamera = useCallback(() => {
    setActiveShot(null);
  }, [setActiveShot]);

  return (
    <div className="flex h-full items-center gap-2 px-3">
      {/* Free camera button */}
      <button
        className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
          activeShotId === null
            ? 'bg-accent/20 text-accent'
            : 'bg-white/8 text-white/60 hover:bg-white/12 hover:text-white/80'
        }`}
        onClick={handleFreeCamera}
        title={t('director3dEdit.shotsBar.freeCamera')}
      >
        <Video className="h-3.5 w-3.5" />
        {t('director3dEdit.shotsBar.freeCamera')}
      </button>

      {/* Separator */}
      <div className="h-6 w-px shrink-0 bg-white/10" />

      {/* Scrollable shot list */}
      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto py-1 ui-scrollbar">
        {shots.map((shot) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            isActive={activeShotId === shot.id}
            onSelect={handleSelectShot}
            onDelete={handleDeleteShot}
            onRename={handleRenameShot}
          />
        ))}
      </div>

      {/* Add shot button */}
      <button
        className="flex shrink-0 items-center gap-1 rounded bg-white/8 px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/12 hover:text-white/80"
        onClick={handleAddShot}
        title={t('director3dEdit.shotsBar.addShot')}
      >
        <Plus className="h-3.5 w-3.5" />
        {t('director3dEdit.shotsBar.addShot')}
      </button>
    </div>
  );
});

BottomShotsBar.displayName = 'BottomShotsBar';
