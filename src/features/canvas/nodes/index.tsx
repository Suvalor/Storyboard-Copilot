import type { NodeTypes } from '@xyflow/react';
import { Component, lazy, Suspense, type ErrorInfo } from 'react';

import { CANVAS_NODE_TYPES } from '@/features/canvas/domain/canvasNodes';
import { GroupNode } from './GroupNode';
import { ImageEditNode } from './ImageEditNode';
import { ImageNode } from './ImageNode';
import { StoryboardGenNode } from './StoryboardGenNode';
import { StoryboardNode } from './StoryboardNode';
import { TextAnnotationNode } from './TextAnnotationNode';
import { UploadNode } from './UploadNode';

// 3D nodes use lazy imports to avoid loading three.js at startup
const LazyDirector3dNode = lazy(() => import('./Director3dNode'));
const LazyVr360Node = lazy(() => import('./Vr360Node'));

// Error boundary for 3D nodes — catches WebGL/three.js init errors
class NodeErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[3D Node] render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-4 text-xs text-text-muted">
          3D module failed to load
        </div>
      );
    }
    return this.props.children;
  }
}

function Director3dNodeWrapper(props: any) {
  return (
    <NodeErrorBoundary>
      <Suspense fallback={<div className="p-2 text-xs text-text-muted">Loading 3D...</div>}>
        <LazyDirector3dNode {...props} />
      </Suspense>
    </NodeErrorBoundary>
  );
}

function Vr360NodeWrapper(props: any) {
  return (
    <NodeErrorBoundary>
      <Suspense fallback={<div className="p-2 text-xs text-text-muted">Loading VR360...</div>}>
        <LazyVr360Node {...props} />
      </Suspense>
    </NodeErrorBoundary>
  );
}

export const nodeTypes: NodeTypes = {
  [CANVAS_NODE_TYPES.exportImage]: ImageNode,
  [CANVAS_NODE_TYPES.group]: GroupNode,
  [CANVAS_NODE_TYPES.imageEdit]: ImageEditNode,
  [CANVAS_NODE_TYPES.storyboardGen]: StoryboardGenNode,
  [CANVAS_NODE_TYPES.storyboardSplit]: StoryboardNode,
  [CANVAS_NODE_TYPES.textAnnotation]: TextAnnotationNode,
  [CANVAS_NODE_TYPES.upload]: UploadNode,
  [CANVAS_NODE_TYPES.director3d]: Director3dNodeWrapper,
  [CANVAS_NODE_TYPES.vr360]: Vr360NodeWrapper,
};

export {
  GroupNode,
  ImageEditNode,
  ImageNode,
  StoryboardGenNode,
  StoryboardNode,
  TextAnnotationNode,
  UploadNode,
};