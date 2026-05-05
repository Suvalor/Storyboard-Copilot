import { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CANVAS_NODE_TYPES, type Director3dNodeData } from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { useCanvasStore } from '@/stores/canvasStore';
import { Director3dScene } from '@/features/canvas/3d/Director3dScene';
import { type MannequinInstance, type MannequinPose } from '@/features/canvas/3d/mannequin';
import { type PropDefinition } from '@/features/canvas/3d/props';

type Director3dNodeProps = NodeProps & {
  id: string;
  data: Director3dNodeData;
  selected?: boolean;
};

const DEFAULT_WIDTH = 480;
const MIN_HEIGHT = 320;

let mannequinCounter = 0;

export const Director3dNode = memo(({ id, data, selected }: Director3dNodeProps) => {
  const { t } = useTranslation();
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolvedTitle = resolveNodeDisplayName(CANVAS_NODE_TYPES.director3d, data);

  const [mannequins, setMannequins] = useState<MannequinInstance[]>([]);
  const [placedProps, setPlacedProps] = useState<{ definition: PropDefinition; position: [number, number, number]; rotation: number }[]>([]);
  const [showScene, setShowScene] = useState(false);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      updateNodeData(id, { backgroundUrl: url });
      setShowScene(true);
    },
    [id, updateNodeData],
  );

  const handleAddMannequin = useCallback((pose: MannequinPose) => {
    const newMannequin: MannequinInstance = {
      id: `mannequin-${++mannequinCounter}`,
      position: [(Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3],
      rotation: Math.random() * Math.PI * 2,
      pose,
      color: '#b0b8c8',
    };
    setMannequins((prev) => [...prev, newMannequin]);
  }, []);

  const handleRemoveMannequin = useCallback((mannequinId: string) => {
    setMannequins((prev) => prev.filter((m) => m.id !== mannequinId));
  }, []);

  const handleAddProp = useCallback((definition: PropDefinition) => {
    setPlacedProps((prev) => [
      ...prev,
      {
        definition,
        position: [(Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4],
        rotation: Math.random() * Math.PI * 2,
      },
    ]);
  }, []);

  const handleExportViewport = useCallback((_dataUrl: string) => {
    // In a full implementation, this would create a new upload node with the exported image
    console.log('Export viewport from director3d node', id);
  }, [id]);

  const handleExportDepth = useCallback((_dataUrl: string) => {
    console.log('Export depth from director3d node', id);
  }, [id]);

  return (
    <div
      className={`
        group relative overflow-visible rounded-[var(--node-radius)] border bg-surface-dark/85 p-1.5 transition-colors duration-150
        ${selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(15,23,42,0.22)] hover:border-[rgba(15,23,42,0.34)] dark:border-[rgba(255,255,255,0.22)] dark:hover:border-[rgba(255,255,255,0.34)]'}
      `}
      style={{ width: DEFAULT_WIDTH, minHeight: MIN_HEIGHT }}
      onClick={() => setSelectedNode(id)}
    >
      <NodeHeader
        className={NODE_HEADER_FLOATING_POSITION_CLASS}
        icon={<Box className="h-4 w-4" />}
        titleText={resolvedTitle}
        editable
        onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
      />

      <div className="pt-8 pb-1" style={{ height: MIN_HEIGHT - 40 }}>
        {data.backgroundUrl || showScene ? (
          <Director3dScene
            backgroundUrl={data.backgroundUrl}
            mannequins={mannequins}
            placedProps={placedProps}
            onAddMannequin={handleAddMannequin}
            onRemoveMannequin={handleRemoveMannequin}
            onAddProp={handleAddProp}
            onExportViewport={handleExportViewport}
            onExportDepth={handleExportDepth}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-white/20 px-6 py-8 transition-colors hover:border-accent/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Box className="h-8 w-8 text-text-muted" />
              <span className="text-sm text-text-muted">{t('node.director3d.uploadBackground')}</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Handle
        type="target"
        id="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
      <Handle
        type="source"
        id="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
    </div>
  );
});

Director3dNode.displayName = 'Director3dNode';

export default Director3dNode;
