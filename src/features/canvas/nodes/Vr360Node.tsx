import { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CANVAS_NODE_TYPES, type Vr360NodeData } from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { useCanvasStore } from '@/stores/canvasStore';
import { Vr360Scene } from '@/features/canvas/3d/Vr360Scene';

type Vr360NodeProps = NodeProps & {
  id: string;
  data: Vr360NodeData;
  selected?: boolean;
};

const DEFAULT_WIDTH = 480;
const MIN_HEIGHT = 320;

export const Vr360Node = memo(({ id, data, selected }: Vr360NodeProps) => {
  const { t } = useTranslation();
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolvedTitle = resolveNodeDisplayName(CANVAS_NODE_TYPES.vr360, data);

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

  const handleExportImage = useCallback((_dataUrl: string, mode: 'single' | '4-grid' | '12-grid') => {
    // In a full implementation, this would create a new upload node with the exported image
    console.log('Export from vr360 node', id, mode);
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
        icon={<Globe className="h-4 w-4" />}
        titleText={resolvedTitle}
        editable
        onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
      />

      <div className="pt-8 pb-1" style={{ height: MIN_HEIGHT - 40 }}>
        {data.backgroundUrl || showScene ? (
          <Vr360Scene
            backgroundUrl={data.backgroundUrl}
            onExportImage={handleExportImage}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-white/20 px-6 py-8 transition-colors hover:border-accent/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Globe className="h-8 w-8 text-text-muted" />
              <span className="text-sm text-text-muted">{t('node.vr360.uploadPanorama')}</span>
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

Vr360Node.displayName = 'Vr360Node';

export default Vr360Node;
