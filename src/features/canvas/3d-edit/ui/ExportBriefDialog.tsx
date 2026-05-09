/**
 * Scene Brief preview + copy + derive export node dialog.
 *
 * Three tabs: JSON / Text / Thumbnails.
 * JSON tab: formatted briefJson, one-click copy.
 * Text tab: briefText, one-click copy.
 * Thumbnails tab: each shot's thumbnail.
 * "Derive Export Node" button creates a derived exportImageNode with brief data.
 *
 * @since v0.1.14
 */

import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, FileDown } from 'lucide-react';

import { UiButton } from '@/components/ui/primitives';
import { useCanvasStore } from '@/stores/canvasStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportBriefDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  briefJson: string;
  briefText: string;
  thumbnails: { shotId: string; dataUrl: string }[];
}

type TabKey = 'json' | 'text' | 'thumbnails';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ExportBriefDialog = memo(function ExportBriefDialog({
  isOpen,
  onClose,
  nodeId,
  briefJson,
  briefText,
  thumbnails,
}: ExportBriefDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('json');
  const [copied, setCopied] = useState(false);

  const addDerivedExportNode = useCanvasStore((s) => s.addDerivedExportNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: no-op if clipboard write fails
    }
  }, []);

  const handleDeriveNode = useCallback(() => {
    // Use the first thumbnail as the node image, or a blank placeholder
    const thumbnail = thumbnails.length > 0 ? thumbnails[0].dataUrl : '';

    const createdNodeId = addDerivedExportNode(
      nodeId,
      thumbnail,
      '16:9',
      undefined,
      {
        defaultTitle: 'Scene Brief',
        resultKind: 'generic',
      },
    );

    // Inject brief data into the derived node
    if (createdNodeId) {
      updateNodeData(createdNodeId, {
        briefJson,
        briefText,
      } as Record<string, unknown>);
    }

    onClose();
  }, [nodeId, thumbnails, addDerivedExportNode, updateNodeData, briefJson, briefText, onClose]);

  if (!isOpen) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'json', label: t('director3dEdit.briefDialog.tabJson') },
    { key: 'text', label: t('director3dEdit.briefDialog.tabText') },
    { key: 'thumbnails', label: t('director3dEdit.briefDialog.tabThumbnails') },
  ];

  return (
    <div
      role="dialog"
      aria-label={t('director3dEdit.briefDialog.title')}
      className="fixed inset-0 z-[60] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex max-h-[80vh] w-[640px] flex-col rounded-lg border border-white/10 bg-surface-dark shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">
            {t('director3dEdit.briefDialog.title')}
          </h2>
          <button
            className="text-white/50 hover:text-white"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-accent text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'json' && (
            <JsonContent json={briefJson} onCopy={() => handleCopy(briefJson)} copied={copied} />
          )}
          {activeTab === 'text' && (
            <TextContent text={briefText} onCopy={() => handleCopy(briefText)} copied={copied} />
          )}
          {activeTab === 'thumbnails' && (
            <ThumbnailsContent thumbnails={thumbnails} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          <UiButton variant="ghost" size="sm" onClick={onClose}>
            {t('common.close')}
          </UiButton>
          <UiButton variant="primary" size="sm" onClick={handleDeriveNode}>
            <FileDown className="mr-1 h-4 w-4" />
            {t('director3dEdit.briefDialog.deriveNode')}
          </UiButton>
        </div>
      </div>
    </div>
  );
});

ExportBriefDialog.displayName = 'ExportBriefDialog';

// ---------------------------------------------------------------------------
// Tab content sub-components
// ---------------------------------------------------------------------------

function JsonContent({
  json,
  onCopy,
  copied,
}: {
  json: string;
  onCopy: () => void;
  copied: boolean;
}) {
  let formatted: string;
  try {
    formatted = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    formatted = json;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <CopyButton onCopy={onCopy} copied={copied} />
      </div>
      <pre className="max-h-[50vh] overflow-auto rounded border border-white/10 bg-black/40 p-3 text-xs text-white/80">
        {formatted}
      </pre>
    </div>
  );
}

function TextContent({
  text,
  onCopy,
  copied,
}: {
  text: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <CopyButton onCopy={onCopy} copied={copied} />
      </div>
      <pre className="max-h-[50vh] whitespace-pre-wrap overflow-auto rounded border border-white/10 bg-black/40 p-3 text-xs text-white/80">
        {text}
      </pre>
    </div>
  );
}

function ThumbnailsContent({
  thumbnails,
}: {
  thumbnails: { shotId: string; dataUrl: string }[];
}) {
  if (thumbnails.length === 0) {
    return <p className="text-xs text-white/40">No thumbnails available.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {thumbnails.map((thumb) => (
        <div key={thumb.shotId} className="space-y-1">
          <img
            src={thumb.dataUrl}
            alt={`Shot ${thumb.shotId}`}
            className="w-full rounded border border-white/10"
          />
          <span className="text-xs text-white/40">{thumb.shotId}</span>
        </div>
      ))}
    </div>
  );
}

function CopyButton({
  onCopy,
  copied,
}: {
  onCopy: () => void;
  copied: boolean;
}) {
  const { t } = useTranslation();

  return (
    <button
      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      onClick={onCopy}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          {t('director3dEdit.briefDialog.copySuccess')}
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {t('director3dEdit.briefDialog.copy')}
        </>
      )}
    </button>
  );
}
