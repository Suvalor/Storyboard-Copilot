# 深度认知报告：3D导演节点控制面板外移抽屉

**任务**：将【3D导演】节点的机位/人物/道具/导出操作按钮，从节点内迁移至画布左侧全局抽屉导航
**审查者**：gemini-thinking-protocol（AI 技术合伙人）
**日期**：2026/05/05

---

## 一、第一性原理拆解（需求物理本质）

### 1.1 需求真正在做什么

剥去所有框架术语后，这个需求的物理本质是：

> **将 React 组件内部的一个 UI 控制面板（`Director3dScene` 底部的 `useState` 控制区），迁移到父级画布层，作为一个独立的抽屉组件来渲染。控制数据（mannequins、placedProps、activePreset）从组件局部状态，提升为全局可访问状态。**

### 1.2 当前数据流的真实状态

```
Director3dNode (useState: mannequins, placedProps, showScene)
  └── Director3dScene (useState: activePreset, selectedCategory)
        ├── <Canvas> (R3F 3D 渲染区)
        └── <div.control-panel> (机位/人物/道具/导出按钮 ← 目标移除区)
```

**关键发现**：
- `mannequins` 和 `placedProps` 完全是局部 `useState`，**没有任何持久化机制**
- 用户添加的人物和道具，**刷新页面或切换项目后全部丢失**
- `activePreset`（机位选择）和 `selectedCategory`（道具分类）同样是局部状态
- 这些数据目前**不存储在 `canvasStore` 节点数据中**

### 1.3 迁移后的目标数据流

```
canvasStore
  ├── selectedNodeId: string | null
  ├── director3dState: { mannequins, placedProps, activePreset } ← 新增
  └── drawer: { isOpen, nodeType }                               ← 新增

Canvas (画布层)
  └── <NodePropertyDrawer> (新抽屉组件)
        ├── 读取 canvasStore.director3dState
        └── 渲染机位/人物/道具/导出面板

Director3dNode (纯渲染节点)
  └── Director3dScene (纯3D渲染，无控制面板)
```

---

## 二、唯物辩证法分析（核心矛盾）

### 2.1 主要矛盾：状态位置之争

| 方案 | 状态位置 | 好处 | 坏处 |
|------|----------|------|------|
| **方案A（Store提升）** | `canvasStore` | 抽屉可访问；刷新可恢复 | Store膨胀；需要更新 `canvasNodes.ts` 数据序列化 |
| **方案B（Props穿透）** | 通过 React 透传 | 简单直接 | 需要 `Canvas.tsx → Director3dNode → Director3dScene` 三层透传；脆弱 |
| **方案C（Context）** | 独立 `Director3dContext` | 局部解耦 | 多一层抽象；Drawer 反而需要额外 Provider |

**推荐**：方案A（Store提升）。理由：
1. 抽屉与节点物理上分离，必须通过 Store 通信
2. 当前 `director3dState` 完全缺失持久化，Store 化本身就是**修复性工作**
3. 未来 VR360 节点注册同一抽屉时，可以服用同一套 Store 结构

### 2.2 次要矛盾：节点空间 vs. 抽屉空间

| 维度 | 当前节点内方案 | 抽屉方案 |
|------|----------------|----------|
| 3D Canvas 高度 | 受控制面板挤压（`flex-1` 剩余空间） | 节点内全高，**控制面板消失** |
| 画布布局 | 节点正常展示 | 左侧新增抽屉层（占用画布宽度） |
| 响应式 | 节点内局部 | 需考虑抽屉与节点重叠时的 z-index |

**辩证结论**：节点获得全高 3D 预览，代价是画布左侧多一个抽屉层。这是合理的 UX 交换——预览空间 > 工具栏空间。

### 2.3 潜在隐性矛盾

1. **3D Canvas export 问题**：`handleExportViewport` 依赖 `canvasRef.current.toDataURL()`，当前实现是空函数（`console.log`）。如果最终用户能导出，`canvasRef` 依然需要保留在某个组件中——可能是 `Director3dScene`（纯渲染组件）内部，但导出触发由抽屉按钮发起。需要在架构上明确「触发点」与「执行点」的分离。

2. **持久化缺失**：如果不同时解决 `director3dState` 的持久化，这个迁移只是**把丢失数据的 UI 移了个位置**。抽屉里的 mannequins 和 placedProps 刷新后依然清空。**建议：MVP 阶段接受这个限制，在报告中明确标注为已知缺陷。**

---

## 三、系统思维评估（连锁影响）

### 3.1 架构变更影响图谱

```
影响范围（按文件）
───────────────────────────────────────────────────────────────
NEW        src/features/canvas/ui/NodePropertyDrawer.tsx  ← 新增
NEW        src/stores/director3dStore.ts                   ← 新增（或扩展 canvasStore）
MODIFY     src/stores/canvasStore.ts                       ← 扩展 selectedNodeId 联动逻辑
MODIFY     src/features/canvas/Canvas.tsx                  ← 集成抽屉 + selectedNodeId 联动
MODIFY     src/features/canvas/nodes/Director3dNode.tsx    ← 移除 useState + 移除控制面板
MODIFY     src/features/canvas/3d/Director3dScene.tsx     ← 移除控制面板 + 保留 canvasRef export
MODIFY     src/features/canvas/domain/canvasNodes.ts     ← Director3dNodeData 需要扩展存储 3D state
MODIFY     src/features/canvas/domain/nodeRegistry.ts      ← capabilities 可扩展（新增 drawerCapability 字段）
MODIFY     src/i18n/locales/zh.json / en.json              ← 抽屉面板文案

影响范围（按架构层级）
───────────────────────────────────────────────────────────────
持久化层    canvasStore / nodeData 序列化（新增 director3d state 存储）
状态层      canvasStore 新增 director3dState / drawerOpen 状态
展示层      Canvas.tsx + NodePropertyDrawer.tsx
组件层      Director3dNode.tsx（减负） + Director3dScene.tsx（减负）
```

### 3.2 API 契约破坏风险

**不会破坏的契约**：
- `canvasStore` 的 `setSelectedNode`、`updateNodeData` 等现有方法签名不变
- `nodeRegistry` 的类型定义扩展而非修改
- `canvasNodes.ts` 的 `Director3dNodeData` 接口通过 `Partial` 扩展而非破坏性修改

**需要新增的契约**：
- `director3dStore` 需要定义 `mannequin CRUD` / `prop CRUD` / `activePreset` 的标准化 actions
- `DrawerPanelRegistry`：不同节点类型注册不同面板内容的机制（PM 三问中已明确）

### 3.3 性能影响评估

| 操作 | 当前（局部状态） | 迁移后（Store） | 评估 |
|------|------------------|-----------------|------|
| 添加人物 | `setMannequins(prev=>[...])` | `store.addMannequin()` | 相同量级 |
| 切换机位 | `setActivePreset()` | `store.setActivePreset()` | 相同量级 |
| 抽屉开关 | N/A | `selectedNodeId` 联动 | 仅触发重渲染抽屉，节点本身不变 |
| 3D Canvas 渲染 | 不受影响 | 不受影响（只是 props 传入方式变） | 无差异 |

**风险点**：`selectedNodeId` 变化时抽屉开关会有 1 次重渲染，但 `Director3dNode` 本身不会因此重新渲染（因为 `mannequins`/`placedProps` 移到了 Store，不在 node 内部）。

---

## 四、批判性思维（XY 问题 + 更轻方案）

### 4.1 这是 XY 问题吗？

**不是 XY 问题**。用户需求（控制面板外移）背后的真实问题（节点内 UI 空间不足）确实存在，且 PM 三问澄清了触发时机和通用性设计，这是一个合理的需求。

### 4.2 更轻方案对比

| 方案 | 描述 | 优点 | 缺点 | 推荐度 |
|------|------|------|------|--------|
| **A. 抽屉外移（完整方案）** | 新建 `NodePropertyDrawer` + Store 提升 + 节点重构成纯渲染 | 通用可扩展；彻底解决空间问题 | 工作量最大；涉及 Store 设计 | **PM 确认方案** |
| **B. 节点内折叠面板** | 保持现有结构，将控制面板改为可折叠 / Tab 切换 | 改动最小；无需 Store 改造 | 不解决「3D Canvas 全高」问题；通用性差 | 可作为 MVP 过渡 |
| **C. 节点全屏编辑模式** | 双击节点进入全屏编辑，退出后回到画布 | 3D Canvas 全高；交互直观 | 需要全新的全屏编辑层；路由/状态管理复杂 | 过于复杂，不推荐 |
| **D. 浮动工具栏（替代抽屉）** | 选中节点时在节点上方出现浮动工具栏 | 实现简单；不需要画布布局改造 | 占用节点上方空间；多节点时遮挡 | 不推荐 |

### 4.3 最小可行方案（MVP 建议）

如果资源受限，可以分两阶段实施：

**第一阶段（快速见效）**：
- 不新建抽屉，只将 `Director3dScene` 的控制面板改为**折叠态**（默认收起，hover/点击展开）
- 这样 `3D Canvas` 默认获得最大高度，同时保留所有控制功能
- 改动范围：仅 `Director3dScene.tsx` 一个文件

**第二阶段（完整方案）**：
- 第一阶段验收通过后，再实施抽屉 + Store 提升

**但 PM 已明确选择「完全外移」方案**，因此应直接实施完整方案。

### 4.4 Edge Cases（最坏情况识别）

1. **用户快速切换节点**：Drawer 开关时机的防抖处理（避免选中一个节点后又立即取消选中导致的闪烁）
2. **3D Canvas ref 丢失**：`Director3dScene` 导出功能依赖 `canvasRef`，但 ref 在 React 重渲染间保持，理论上安全
3. **多节点同时选中**：目前抽屉触发条件是「选中单个3D导演节点」，多选时应关闭抽屉
4. **节点删除时抽屉状态**：需要监听 `deleteNode` 事件，清除对应抽屉状态

---

## 五、实施路线图（技术建议）

### 5.1 第一阶段：Store 基础（必须先做）

**目标**：建立抽屉与节点共享的 3D 状态层

```
新增 / 修改：src/stores/canvasStore.ts
  - 扩展 CanvasState：
    - director3dDrawer: { isOpen: boolean }
    - director3dState: {
        mannequins: MannequinInstance[],
        placedProps: PlacedProp[],
        activePreset: CameraPreset | null
      }
  - 新增 actions：
    - setDirector3dDrawerOpen(nodeId: string | null)
    - addMannequin(pose: MannequinPose)
    - removeMannequin(id: string)
    - addProp(definition: PropDefinition)
    - removeProp(index: number)
    - setActivePreset(preset: CameraPreset)
```

**注意**：`director3dState` 的持久化需要扩展到节点数据序列化（`canvasNodes.ts`），但 MVP 阶段可暂不实现。

### 5.2 第二阶段：Drawer 组件

**目标**：创建通用抽屉框架

```
新增：src/features/canvas/ui/NodePropertyDrawer.tsx
  - 组件结构：
    - 抽屉容器（CSS 动画：translateX 滑入）
    - Tab 导航（机位 / 人物 / 道具 / 导出）
    - 各 Tab 内容面板（从 Store 读取状态 + dispatch actions）
  - 触发逻辑：
    - useEffect 监听 selectedNodeId
    - 如果是 director3d 节点：openDrawer
    - 否则：closeDrawer
```

### 5.3 第三阶段：节点重构

**目标**：将 `Director3dNode` 变成纯渲染组件

```
修改：Director3dNode.tsx
  - 移除：useState (mannequins, placedProps, showScene)
  - 移除：handleAddMannequin, handleRemoveMannequin, handleAddProp, handleExportViewport, handleExportDepth
  - 改用：从 canvasStore 读取 mannequins/placedProps
  - 节点尺寸：MIN_HEIGHT 可以适当增加（因为控制面板移走了）

修改：Director3dScene.tsx
  - 移除：activePreset useState（改为从 props 接收）
  - 移除：底部 <div.control-panel> 区块
  - 保留：canvasRef（用于导出）
  - 保留：CameraController, MannequinObject, PropObject 等 3D 渲染逻辑
```

---

## 六、潜在风险（明确标注）

| 风险 | 严重程度 | 缓解措施 |
|------|----------|----------|
| **3D state 刷新丢失** | 中 | MVP 阶段接受，明确告知用户；后续迭代加持久化 |
| **Drawer 与节点内容重叠** | 低 | Canvas 布局需给抽屉预留空间（paddingLeft），Drawer z-index 高于节点 |
| **多节点选中时抽屉行为不确定** | 低 | 明确规则：仅单个 director3d/vr360 节点选中时打开 |
| **3D Canvas export 功能断连** | 中 | 确保 `handleExportViewport`/`handleExportDepth` callback 仍然从 Store 调用链传到 Scene |
| **VR360 节点面板注册遗漏** | 低 | 通用框架预留 `DrawerPanelRegistry`，VR360 后续接入 |

---

## 七、交付物清单

### 已确认范围（PM 三问后定稿）

1. `NodePropertyDrawer.tsx` — 通用抽屉框架（支持 Tab 导航）
2. `canvasStore` 扩展 — 新增 director3dState + drawer 状态
3. `Director3dNode.tsx` 重构 — 移除局部状态，变成纯渲染节点
4. `Director3dScene.tsx` 重构 — 移除控制面板，变成纯 3D 渲染组件
5. i18n 文案补充 — 抽屉面板中文/英文 key
6. Canvas 布局适配 — 抽屉展开时的画布 padding 处理

### 不在范围（MVP）

- `director3dState` 的项目持久化（刷新丢失 3D 内容）
- VR360 节点注册同一抽屉（后续迭代）
- `Director3dNodeData` 的持久化字段扩展

---

## 八、总结判定

### 本质

这是一个**UI 布局迁移 + 状态架构重构**的需求。物理本质是将 React 组件内部的控制面板搬到父级，并通过 Store 提升实现跨组件状态共享。

### 核心矛盾

**局部状态 vs. 全局可访问**的矛盾。`mannequins`/`placedProps`/`activePreset` 目前锁在 `Director3dNode` 内部，抽屉无权访问。解决矛盾的唯一路径是状态提升到 Store，而这本身也是修复持久化缺失问题的必经之路。

### 系统影响

涉及 Store 设计（新增状态和 actions）、Canvas 布局（抽屉层）、两个核心 3D 组件重构、持久化数据模型扩展。影响链清晰，无架构层面的"意外惊喜"。

### 推荐结论

**VERDICT: PASS**

理由：
1. PM 三问已明确需求边界（选中即开、通用面板、完全外移）
2. 技术路径清晰（Store 提升 → Drawer 组件 → 节点重构）
3. 改动范围可控（6 个文件，涉及清晰的边界）
4. 架构收益明确（为 VR360 复用同一抽屉框架）
5. 已知缺陷（3D state 不持久化）已明确标注，MVP 阶段可接受

---

*报告生成：gemini-thinking-protocol v4.0 | 项目：灰豆AI漫剧神器 | 日期：2026/05/05*

VERDICT: PASS
