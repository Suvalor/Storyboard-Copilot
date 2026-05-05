# PRD：3D导演节点控制面板外移至左侧抽屉

## 项目概述

将【3D导演】(director3dNode) 中底部的机位预设、人物添加、道具添加、导出操作控制面板，从节点内部迁移至画布全局视图的左侧抽屉导航。迁移后，3D导演节点仅保留 3D Canvas 全高预览区域与节点头标题，所有操作控件完全外移至抽屉。同时建立通用的 `NodePropertyPanel` 框架，使不同节点类型可注册自己的面板内容。

## 目标用户与使用场景

### 目标用户
- 漫画创作者、分镜师，使用「灰豆AI漫剧神器」的 3D 导演功能进行场景构图预览

### 使用场景
1. 用户在节点画布上选中一个 3D 导演节点 -> 左侧抽屉自动展开，显示该节点类型的专属面板（机位 / 人物 / 道具 / 导出）
2. 用户在抽屉中切换机位预设 -> 3D Canvas 实时响应摄像机位置变化
3. 用户在抽屉中添加人物/道具 -> 3D Canvas 实时渲染新增对象
4. 用户取消选中 3D 导演节点 -> 左侧抽屉自动关闭
5. 用户选中其他类型节点（如 VR360）-> 左侧抽屉展示该节点类型注册的面板内容
6. 用户未选中任何节点 -> 左侧抽屉关闭

## 核心功能列表

### P0 — MVP 必须

| 编号 | 功能 | 描述 |
|------|------|------|
| F1 | 通用 NodePropertyDrawer 组件 | 画布左侧可滑入/滑出的抽屉容器，支持 CSS 动画（translateX），包含 Tab 导航区域 |
| F2 | DrawerPanelRegistry 注册机制 | 不同节点类型可注册自己的面板内容组件；抽屉根据当前选中节点类型动态渲染对应面板 |
| F3 | 选中/取消选中联动 | 选中 3D 导演节点时抽屉自动打开；取消选中或选中其他非抽屉节点类型时抽屉自动关闭；多选时抽屉关闭 |
| F4 | 3D 导演面板 — 机位预设 | 将 Director3dScene 底部的 10 个机位预设按钮迁移至抽屉面板，状态从 Store 读取 |
| F5 | 3D 导演面板 — 人物添加 | 将人物 pose 选择按钮（stand/sit/lean/lie）迁移至抽屉面板，通过 Store action 添加人物 |
| F6 | 3D 导演面板 — 道具添加 | 将道具分类 Tab + 道具按钮迁移至抽屉面板，通过 Store action 添加道具 |
| F7 | 3D 导演面板 — 导出 | 将 viewport/depth 导出按钮迁移至抽屉面板，触发导出动作 |
| F8 | Director3dNode 重构 | 移除所有 useState（mannequins, placedProps, showScene）和操作 handler；改为从 canvasStore 读取数据；节点仅保留 NodeHeader + 3D Canvas |
| F9 | Director3dScene 重构 | 移除底部控制面板区块；activePreset / selectedCategory 改为从 props 接收；保留 canvasRef（用于导出）；保留纯 3D 渲染逻辑 |
| F10 | canvasStore 扩展 | 新增 director3dState（mannequins, placedProps, activePreset）+ drawer 开关状态 + CRUD actions |

### P1 — 应有

| 编号 | 功能 | 描述 |
|------|------|------|
| F11 | 画布布局适配 | 抽屉展开时，画布区域需给抽屉预留空间，避免抽屉遮挡节点内容 |
| F12 | 抽屉防抖 | 用户快速切换节点时，抽屉开关需防抖处理，避免闪烁 |
| F13 | 节点删除时抽屉清理 | 删除当前选中且抽屉已打开的 3D 导演节点时，关闭抽屉并清理对应状态 |
| F14 | i18n 文案补充 | 抽屉面板所有新增文案补充到 zh.json / en.json |

### P2 — 后续迭代

| 编号 | 功能 | 描述 |
|------|------|------|
| F15 | VR360 节点注册同一抽屉 | VR360 节点使用同一 NodePropertyDrawer 框架，注册自己的面板内容 |
| F16 | director3dState 持久化 | 将 mannequins / placedProps / activePreset 序列化到 Director3dNodeData |
| F17 | Director3dNodeData 字段扩展 | 在 canvasNodes.ts 中扩展 Director3dNodeData 接口 |

## 功能边界（明确不做的事）

1. **不做 director3dState 持久化** — MVP 阶段 3D 场景状态不持久化到项目文件，刷新后丢失
2. **不做 VR360 节点面板** — 本次仅实施 3D 导演节点面板
3. **不做 Director3dNodeData 持久化字段扩展** — 不修改序列化结构
4. **不做 3D 对象拖拽编辑** — 抽屉面板仅提供添加/删除操作
5. **不做抽屉手动开关** — 抽屉仅通过选中/取消选中节点联动

## 技术约束与交付形式

### 技术栈
- 前端：React 18 + TypeScript + Zustand + @xyflow/react + TailwindCSS
- 3D 渲染：@react-three/fiber + @react-three/drei + three.js
- 状态管理：canvasStore（Zustand）扩展，不新建独立 store

### 架构约束
1. 状态提升到 canvasStore
2. 通用面板注册机制：DrawerPanelRegistry 使用 Map 结构
3. 抽屉组件位于 Canvas 层级
4. 3D Canvas export 回调链路需确保 ref 稳定

### 影响范围

| 操作 | 文件路径 |
|------|----------|
| NEW | src/features/canvas/ui/NodePropertyDrawer.tsx |
| NEW | src/features/canvas/ui/drawerPanels/Director3dDrawerPanel.tsx |
| MODIFY | src/stores/canvasStore.ts |
| MODIFY | src/features/canvas/Canvas.tsx |
| MODIFY | src/features/canvas/nodes/Director3dNode.tsx |
| MODIFY | src/features/canvas/3d/Director3dScene.tsx |
| MODIFY | src/features/canvas/domain/nodeRegistry.ts |
| MODIFY | src/i18n/locales/zh.json + en.json |

## 验收标准（AC 列表）

| AC 编号 | 验收条件 | 验证方式 |
|---------|----------|----------|
| AC1 | 选中 3D 导演节点时，左侧抽屉自动滑入，显示机位/人物/道具/导出四个分区 | 手动测试 |
| AC2 | 取消选中 3D 导演节点时，左侧抽屉自动滑出关闭 | 手动测试 |
| AC3 | 在抽屉中点击机位预设按钮，3D Canvas 摄像机平滑过渡 | 手动测试 |
| AC4 | 在抽屉中添加人物，3D Canvas 实时出现对应人偶 | 手动测试 |
| AC5 | 在抽屉中添加道具，3D Canvas 实时出现对应道具 | 手动测试 |
| AC6 | 在抽屉中点击导出按钮，导出功能正常 | 手动测试 |
| AC7 | 3D 导演节点内部不再显示任何控制面板，3D Canvas 占满节点高度 | 代码审查 |
| AC8 | 多选节点时抽屉关闭 | 手动测试 |
| AC9 | 删除选中中的 3D 导演节点时抽屉关闭 | 手动测试 |
| AC10 | 选中非 3D 导演节点时抽屉不打开 | 手动测试 |
| AC11 | TS 类型检查通过 | 命令行验证 |
| AC12 | i18n 中英文切换后，抽屉面板文案无未翻译 key 泄露 | 手动切换语言 |
| AC13 | DrawerPanelRegistry 可注册新面板类型 | 代码审查 |

## Sprint 规划建议

### Sprint 1：状态层 + 抽屉框架
- F10: canvasStore 扩展
- F1: NodePropertyDrawer 通用抽屉容器
- F2: DrawerPanelRegistry 注册机制
- F3: 选中/取消选中联动

### Sprint 2：3D 导演面板 + 节点重构
- F4-F7: 3D 导演面板四个分区
- F8: Director3dNode 重构
- F9: Director3dScene 重构

### Sprint 3：边界处理 + 文案 + 验收
- F11: 画布布局适配
- F12: 抽屉防抖
- F13: 节点删除时抽屉清理
- F14: i18n 文案补充

## 风险识别

| 风险 | 严重程度 | 缓解措施 |
|------|----------|----------|
| 3D 场景状态刷新丢失 | 中 | MVP 阶段接受，后续迭代解决 |
| 抽屉与节点内容 z-index 重叠 | 低 | Canvas 布局给抽屉预留空间 |
| 3D Canvas export 回调链路断裂 | 中 | 确保 ref 在重渲染间稳定 |
| 快速切换节点导致抽屉闪烁 | 低 | 对 selectedNodeId 变化做防抖 |

---

value_review_ref: docs/cognition/value-review.md