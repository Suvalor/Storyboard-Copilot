# 深度认知报告 — 3D 导演节点编辑模式

> 审查日期：2026-05-08
> 审查对象：`docs/3d-director-edit-mode-proposal.md` v1.0
> 审查方法：第一性原理 / 唯物辩证法 / 系统思维 / 批判性思维 四重过滤器
> 关联 PRD：`source_repo/requirements.md`（已实施的抽屉面板 PRD）

---

## 一、本质解构 (First Principles)

### 1.1 需求的物理形态

剥离所有框架和流行词后，这个需求的本质是：

```
用户在 3D 画布上拖拽人偶/道具 → 定义相机视角 → 导出结构化场景描述 → 喂给 AI 视频模型
```

翻译成纯数据流：
```
鼠标拖拽事件 → [x,y,z] 坐标数组 → JSON Schema + 自然语言文本 → Sora/Kling/Veo 的 prompt 输入
```

**核心洞察**：这不是一个 3D 编辑器。这是一个 **场景元数据生成器**，其输出是 AI 视频模型的结构化 prompt。3D 编辑器只是输入方式，不是产品。

### 1.2 对 AI 视频创作者的核心价值

| 价值维度 | 当前状态 | 提案实现后 |
|---------|---------|-----------|
| 空间关系表达 | 无法表达（人偶位置由 `Math.random()` 随机生成——`canvasStore.ts:1675`） | 精确到 (x,y,z) 米，Gizmo 所见即所得 |
| 多机位定义 | 不存在 | 每个机位有 position/target/fov，底栏缩略图 |
| AI 模型输入 | 仅导出 PNG 图片 | JSON（精确坐标）+ 自然语言（可粘贴到 Sora prompt）双通道 |
| 场景复用 | 项目重开全部丢失（A2 bug——`projectStore.ts:286-305` 不含 director3dState） | 完整持久化，嵌入 `Director3dNodeData.scene` |
| 多节点隔离 | 所有 director3d 节点共享同一份 mannequins（A1 bug——`canvasStore.ts:603-608` 全局单例） | 每个节点独立 scene，互不污染 |

**第一性原理判断**：需求合理性成立——修复 A1+A2 是必须做的 bug 修复，Scene Brief 是差异化价值。但"合理性成立"不等于"全量 Modal 编辑器方案是最佳路径"——见合题部分。

### 1.3 复杂度梯度

对比不同方案的成本和收益：

| 方案 | 代码量 | 开发时间 | UX | 核心价值（Scene Brief） |
|------|--------|---------|-----|------------------------|
| ① 纯表单：下拉选角色位置（左/中/右）+ 相机角度预设 + 文本框 → 一键导出 JSON | ~200 行 | 1 天 | 枯燥但可用 | 完整交付 |
| ② 抽屉增强：现有抽屉新增 Scene Brief tab + Director3dScene 嵌入单个 TransformControls | ~400 行改造 | 3 天 | 基于现有 UI 渐进式增强 | 完整交付 |
| ③ 提案全量：14 新文件 + 8 处改造 + 全屏 Modal + 独立 editStore + 撤销栈 | ~1900 行 | 2-3 周 | 沉浸式、专业感 | 完整交付 |

**方案③的复杂度约是方案②的 5 倍，方案①的 10 倍。但 Scene Brief 的输出质量在三个方案中完全一致（同一套模板引擎）。** 增量投入主要花在 UX 沉浸感上，而非核心业务价值上。

---

## 二、核心矛盾 (Materialist Dialectics)

### 2.1 正题 (Thesis) — 为什么值得做

| # | 论点 | 权重 |
|---|------|------|
| T1 | **修复生产级 bug**：A1（多节点状态串扰）和 A2（完全不持久化）是已经在运行的缺陷。不修的话 director3d 节点是不可靠功能。**Sprint 0 做 A1+A2 是无条件基线，不容商量。** | 极高 |
| T2 | **Scene Brief 是差异化能力**：将 3D 场景转化为 AI 视频模型的结构化输入（JSON + 自然语言），市场上没有同类工具做这件事。这是"让 AI 视频更可控"这一商业意图的直接技术落地。 | 高 |
| T3 | **零新依赖**：R3F + drei + Three.js 已在 `package.json` 中。人偶（4 种 pose + 8 色）/ 道具（6 大类 ~50 个 primitive）/ 相机预设（10 个）/ 场景环境（灯光/雾/地面）代码全部就位。 | 中 |
| T4 | **架构提案质量高**：编辑期独立 Zustand store (`director3dEditStore`) + 一次性 commit（避免编辑期频繁触发 260ms 防抖快照）+ 撤销栈隔离（不与 canvasStore.history 冲突）+ Zod 边界校验。ADR 系列决策论证充分。 | 中 |
| T5 | **分期边界清晰**：Phase 1 明确不做 .glb 导入、相机关键帧、AI 辅助 prompt。不贪多，MVP 范围克制。 | 中 |

### 2.2 反题 (Antithesis) — 为什么可能不值得 / 有更轻方案

| # | 论点 | 权重 |
|---|------|------|
| A1 | **目标用户未验证**：是否有真实用户在主动要求"拖拽 3D 物体"和"多机位管理"？开源版的 director3dNode 用户基数是多少？如果没人用现有的 3D 节点，建全屏编辑器等于建空城。**投入 2-3 周前应先有用户信号。** | 极高 |
| A2 | **Scene Brief 的核心价值不需要全量编辑器就能交付**：自然语言模板（提案 §7.5.2）是确定性字符串插值（"场景由 N 个主体和 M 个机位组成"），不是 LLM 润色。在现有抽屉面板新增一个 "Scene Brief 导出" tab，成本 ~200 行。输出的 prompt 质量与全量编辑器完全一致。 | 极高 |
| A3 | **14 个新文件 + 8 处改造的长期维护负担**：TransformControls 的 ref 在 StrictMode 下需要 `key={selectedId}` 强制 remount；OrbitControls 与 Modal 的 keydown 冲突；dataURL 缩略图导致 SQLite 膨胀——每一处都是未来 bug 源。如果用户量小，维护成本会超过使用收益。 | 高 |
| A4 | **双状态源风险**：提案保留全局 `director3dState` 标记 `@deprecated` 而非删除（§6.1）。抽屉面板（旧通路）和 Modal 编辑器（新通路）同时存在，可能读取不同状态源。如果用户在抽屉面板添加了一个人偶，然后快速双击进入编辑器，commit 时以哪个状态为准？ | 中 |
| A5 | **自然语言模板的实际效果未知**：模板输出的 prompt（"位于场景中央偏左 1.2m、前方 2.5m"）对 AI 视频模型（Sora/Kling）的生成质量提升有多大？AI 视频模型是否能理解"偏左 1.2m"的空间精度？如果模板 prompt 对视频质量没有可测量提升，Scene Brief 就是伪价值——漂亮的 JSON 和"看起来像 prompt 的文本"但没有实用价值。 | 高 |
| A6 | **与现有抽屉面板能力高度重叠**：提案 §12.2 U3 公开承认"抽屉面板和编辑器能力重叠"。抽屉已有 4 个 Tab（相机/角色/道具/导出）。编辑器新增的实质是 Gizmo 拖拽 + 多机位管理 + Scene Brief。前两者可以在抽屉框架内渐进增强，不必另起炉灶。 | 中 |
| A7 | **R8 复制节点 ID 碰撞**的缓解成本：`duplicateNodes` 需要新增 `regenerateSceneIds()`，且所有未来新增的复制入口（右键菜单、快捷键、批量操作）都必须记得调用。这是一处"容易遗漏的维护点"。 | 低 |

### 2.3 合题 (Synthesis) — 推荐分层路径

```
Sprint 0（无条件做）: 修复 A1 + A2（持久化 + 多节点隔离）
     |               顺手修 A5（Vr360Scene TextureLoader 泄漏）
     v
轻量验证（建议先做）: 在现有抽屉面板新增 "Scene Brief 导出" tab
     |               + 在 Director3dScene 嵌入单个 TransformControls（不建独立编辑器）
     |               + 收集用户反馈：谁在用？怎么用？Scene Brief 有效吗？
     v
决策点 ──→ 用户真的需要全屏编辑器？
     |      用户真的需要 10 个机位的底栏缩略图？
     |      Scene Brief 的 prompt 真的提升了 AI 视频质量？
     |
     +── 是 → 投入 Phase 1 全量：14 文件 Modal 编辑器 + 多机位底栏 + Gizmo 模式切换
     +── 否 → 保持抽屉作为唯一编辑入口，仅维护 ~400 行的增强方案
```

**关键原则**：先把"坏的修好"（A1+A2），再把"差异化价值"（Scene Brief）以最小成本触达用户做验证，最后根据真实反馈决定是否建全量编辑器。这是 Karpathy 原则 2（简洁优先）的直接应用。

---

## 三、系统影响 (Systems Thinking)

### 3.1 直接影响链

```
canvasStore.director3dState 标 @deprecated 但不删除
    │
    ├── Director3dNodeData 新增 scene?: Director3dScene (可选字段，向下兼容)
    │   │
    │   ├── projectStore.toProjectRecord → nodes_json 体积膨胀
    │   │   └── 连锁：history_json 体积膨胀（缩略图声明不进 undo 栈缓解）
    │   │       └── MAX_HISTORY_RESTORE_JSON_CHARS = 1.5MB 软上限风险（触及时静默截断）
    │   │
    │   ├── image pool 编码扩展：新增 scene.background.url + scene.shots[].thumbnailDataUrl
    │   │   └── 连锁：未来任何新增图片字段都必须同步更新 mapNodeImageReferences
    │   │       └── 风险：维护者容易遗漏；建议提取为声明式字段列表而非手写 if-else
    │   │
    │   └── migrateFromLegacy: 旧节点（无 scene）→ createDefaultScene()
    │       └── 风险：如果 backgroundUrl 有效但迁移失败 → 静默数据丢失
    │
    ├── duplicateNodes → 新增 regenerateSceneIds()
    │   └── 连锁：所有复制节点的地方都必须调此函数
    │       └── 风险：未来新增复制入口容易遗漏 → ID 碰撞 → TransformControls ref 错位
    │
    └── 事件总线新增 4 events: enter-edit / exit-edit / export-brief / export-brief-result
        └── 连锁：Modal mount/unmount 订阅生命周期
            └── 风险：Modal 异常关闭（如 GPU crash）时 unsubscribe 未执行 → 内存泄漏
```

### 3.2 间接影响链（第二阶效应）

1. **性能基准线变化**：当前 Canvas.tsx 性能调优假设节点 data 是轻量 JSON（~200B）。含 scene 的 Director3dNodeData 可能膨胀到 ~50KB（30 mannequin × 10 字段 + 50 prop × 9 字段 + 10 shot × 7 字段）。所有遍历 nodes 的操作（筛选/查找/序列化）性能受影响，虽因 node 总数少而概率低，但应做一次基准测试。

2. **测试面扩大**：14 新文件创建约 20 条需要回归的交互路径。当前项目 CLAUDE.md 无自动化测试配置（无 Jest/Vitest）。如果全部靠手测，2-3 周的 Sprint 估计可能偏乐观——需要额外 buffer 用于回归。

3. **新人理解成本**：当前架构已有显著复杂度（双通道持久化、image pool 编码、事件总线、节点注册表、抽屉面板注册表）。新增 3d-edit 子模块 + `editStore` + `sceneCodec` + `editService` + 状态机 6 态流转，增加约 30% 的认知负担。

4. **drawer ↔ editor 状态竞争**：提案说"Modal 打开时关闭 Drawer"（§13.10），但未说明如果用户通过 Drawer 做了修改后快速双击打开编辑器，commit 时以哪个状态为准。需要明确的 last-write-wins 或 merge 策略。

### 3.3 数据库影响

| 项目 | 当前 | 提案后 | 风险 |
|------|------|--------|------|
| nodes_json 单节点 | ~200B (仅 backgroundUrl) | ~50KB (含完整 scene) | 低：SQLite BLOB 上限 1GB |
| history_json 单快照 | 取决于节点数 | +scene 数据（不含缩略图） | 中：大场景 ~30KB/快照 |
| 缩略图 dataURL | N/A | 10 shot × ~50KB = 500KB 嵌入 nodes_json | 中：多个 director3d 节点可能使 nodes_json 突破 1MB |
| 迁移成本 | N/A | 零（nodes_json 是 BLOB，scene 字段自然嵌入） | 低 |

---

## 四、潜在风险与缺失的 Edge Case

### 4.1 提案已识别但缓解不充分的风险

| # | 风险 | 提案缓解 | 残留风险 |
|---|------|---------|---------|
| R1 | 旧项目升级丢失 3D 场景数据 | 弹通知"需重新搭建" | **严重不足**：如果用户花 2 小时摆了 10 个角色 20 个道具，升级后全没了。仅一条通知是 UX 事故。建议：升级前自动截取当前 3D 场景截图保存为导出节点，至少保留视觉记忆。 |
| R4 | dataURL 缩略图突破 SQLite 1MB | 限 512×288 PNG (~50KB) | 10 shot × 50KB = 500KB。但多节点场景（5 个 director3d 节点 × 10 shot）可达 2.5MB。**建议走现有 imagePool + `__img_ref__` 编码而非嵌入 dataURL**，在 MVP 内即可解决，无需等 Phase 2。 |

### 4.2 提案未识别的 Edge Case

| # | Edge Case | 严重程度 | 建议 |
|---|-----------|---------|------|
| E1 | **用户在编辑器打开时通过抽屉面板修改同一节点** | 高 | Modal 打开时应锁定抽屉面板的 director3d tab（显示"编辑器已打开"占位），禁止并行操作。提案只说了"关闭 Drawer"但没说锁定。 |
| E2 | **Three.js WebGL 上下文崩溃**（GPU 驱动问题 / 内存耗尽） | 中 | 整个 Modal 白屏 + 无法关闭。建议：EditViewport 外包 ErrorBoundary，捕获 `webglcontextlost` 事件，fallback 到文字 + 关闭按钮。 |
| E3 | **编辑期 Cmd+Z 撤销到 initialScene 后继续按** | 低 | 撤销栈为空时应阻断操作并给出视觉反馈（按钮灰掉），而非静默无响应——否则用户以为 Cmd+Z 坏了。 |
| E4 | **Tauri 窗口关闭时编辑器有未保存改动** | 中 | `beforeunload` 在 Tauri 的行为与 web 不同。需在 Rust 侧 `window.on_close_requested` 检查 `editStore.isDirty` 并弹原生确认对话框。 |
| E5 | **scene.background.url 引用的图片被 image pool 清理** | 中 | image pool 的引用计数需要新增 `Director3dScene.background.url` 作为引用源。提案只提了编码解码（§8.2），没提引用计数保护。 |
| E6 | **自然语言模板 prompt 对 AI 视频模型实际无效** | **极高** | 这是整个方案最大的未验证假设。模板 prompt（"位于场景中央偏左 1.2m"）的空间精度对 Sora/Kling 是否有可测量影响？如果无效，Scene Brief 就是漂亮的 JSON 但零实用价值。**建议写代码前先手写 5 个 prompt 实测 Sora，确认空间坐标描述能提升视频质量。** |

### 4.3 XY 问题判断

**用户要的是 X（3D 全屏编辑器）还是 Y（让 AI 视频生成更可控的输入）？**

判断：**更可能是 Y**。证据：
- 提案自身定位（§2.2）："3D 是输入辅助，AI 视频说明才是输出价值"
- 提案非目标：明确不做完整 DCC 工具，不与 Blender 竞争
- 用户目标群体："AI 视频创作者"，不是"3D 艺术家"

**如果是 Y，最轻的达成路径是什么？**

L2 增强方案（推荐）：
1. 在现有抽屉面板新增 "Scene Brief" tab —— JSON + 自然语言导出，一键复制或派生节点
2. 在现有 Director3dScene 嵌入单个 `<TransformControls>` —— 让用户能拖拽已添加的人偶/道具
3. 不建独立 Modal，不建 editStore，不建撤销栈，不建多机位底栏

成本：~400 行改造，3 天。与全量方案交付完全相同的 Scene Brief 输出质量。

---

## 五、投入产出评估

### 5.1 全量方案成本

| 项目 | 估量 |
|------|------|
| 新增文件 | 14 个 (~1500 行) |
| 改造文件 | 8 处 (~400 行) |
| i18n 新增 key | ~60 个（中英各一） |
| 开发周期 | 2-3 周（1 人全职） |
| 测试回归 | ~20 条交互路径（手测） |
| 长期维护 | 14 个文件的 bug 修复 + drei/three 版本升级适配 |

### 5.2 分层收益评估

| 阶段 | 交付物 | 业务价值 | 成本 |
|------|--------|---------|------|
| Sprint 0 | A1+A2 修复（持久化 + 隔离）| **修复生产 bug**：场景不再丢失/串扰 | 1-2 天 |
| L2 增强 | 抽屉 Scene Brief tab + 单 TransformControls | **验证核心假设**：用户是否需要 3D 坐标的 AI prompt | 3 天 |
| Phase 1 全量 | Modal + 多机位 + Gizmo 模式 + 撤销栈 | **UX 升级**：沉浸式编辑 | 2-3 周 |

### 5.3 关键判断

- **Sprint 0 的投入产出比是无限大**——修 bug 没有"值不值得"的问题。
- **L2 增强的投入产出比极高**——3 天验证核心假设，不成立则止损。
- **Phase 1 全量的投入产出比取决于 L2 的验证结果**。如果 Scene Brief 确实提升了 AI 视频质量且用户有编辑需求，全量编辑器值得投。如果 Scene Brief 对视频质量无帮助，全量编辑器是建没人用的漂亮 UI。

---

## 六、结论与判定

### 6.1 分层结论

| 阶段 | 判定 | 理由 |
|------|------|------|
| Sprint 0（A1+A2 修复） | **无条件通过** | 生产级 bug，必须修。与是否建编辑器无关。建议同时顺手修 A5（Vr360Scene TextureLoader 泄漏）。 |
| Phase 1 全量 Modal 编辑器 | **SIMPLER_PROPOSAL** | 14 文件 + 2-3 周投入应在核心假设验证之后。更轻路径能以 15% 成本交付 100% 的差异化价值（Scene Brief），同时收集用户反馈指导后续投入。 |

### 6.2 更轻方案要点

1. **Sprint 0（基准）**：修复 A1（state 隔离）+ A2（持久化）。Director3dNodeData 新增 `scene` 字段，migrateFromLegacy 处理旧节点，image pool 编码扩展。
2. **Scene Brief 导出 tab（抽屉面板）**：在现有 Director3dDrawerPanel 新增第 5 个 tab，包含 JSON 预览、自然语言预览、一键复制、派生出导出节点。复用提案的 `sceneBriefExporter.ts` 和 `sceneBriefTemplates.ts`，只改变触发入口（从 Modal TopToolbar 变为 Drawer tab）。
3. **单 TransformControls（Director3dScene 内嵌）**：在现有 Director3dScene 的 R3F Canvas 内嵌入 `<TransformControls>`。点击人偶/道具 → 出现 Gizmo → 拖拽 → 坐标写入 canvasStore。不建独立 editStore，不建撤销栈（利用 canvasStore 现有 history 机制），不建 Modal。
4. **用户验证后决策**：收集 L2 的用户反馈——谁在用 3D 节点？他们在做什么？Scene Brief 有效吗？需要多机位吗？——根据数据决定是否投入 Phase 1 全量编辑器。

### 6.3 最高优先级的风险缓解行动

> **在写任何一行编辑器代码之前，必须先用 Sora/Kling/Veo 实测 Scene Brief 的自然语言模板效果。** 手写 5 个 prompt（不同空间布局描述），分别测试视频生成质量。如果空间坐标描述无法被 AI 视频模型理解并提升生成质量，Scene Brief 的核心价值假设即被证伪，全量编辑器方案应重新评估。这个实验需要 1 小时但可能省掉 3 周开发。

---

VERDICT: SIMPLER_PROPOSAL
