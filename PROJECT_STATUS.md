# 麻将竞技场 - 项目状态

> 最后更新: 2026-04-01 17:10 GMT+8

## 项目概述
- **名称**: Mahjong Arena（麻将竞技场）
- **规则**: 川麻血战到底，108 张牌（万/条/筒各 36）
- **目标**: 网页端流畅麻将游戏，AI 对战 + 观战
- **部署**: GitHub Pages（零成本）
- **路径**: `~/.openclaw/workspace/mahjong-arena/`

## 进度

### ✅ Step 1: 规则引擎（已完成）
- `src/engine/tiles.ts` (93 行) — 牌定义、生成、洗牌、排序
- `src/engine/hand.ts` (319 行) — 胡牌判定、七对、清一色、对对胡、碰杠吃检测、听牌、番数计算
- `src/engine/game.ts` (355 行) — 对局控制、摸牌出牌、碰杠胡执行、血战到底逻辑
- `src/ai/strategies.ts` (328 行) — 4 个 AI 个性（黑瞎子🐻激进/铁柱🔨保守/算盘🧮计算/锦鲤🐟混沌）
- `src/engine/__tests__/run.ts` (203 行) — 35/35 测试全过
- **tsc --strict 零错误**

### 🔲 Step 2: Canvas 牌面渲染（下一步）
- 用纯 Canvas 程序化绘制麻将牌（不用外部图片资源）
- 牌桌布局（4 人视角）
- 手牌、弃牌区、副露区渲染
- **重点：网页浏览流畅**

### 🔲 Step 3: 对局循环
- AI 自动对战循环（4 AI 打一局完整血战）
- 动画：摸牌、出牌、碰杠胡的过渡效果
- 解说气泡（显示 AI 思考过程）

### 🔲 Step 4: 人机交互
- 人类玩家模式（点击出牌、碰杠胡按钮）
- 替换某个 AI 座位为人类

### 🔲 Step 5: 部署上线
- GitHub Pages 打包部署
- 分享链接

## 技术栈
- TypeScript + React（待加）
- Canvas 2D 渲染（牌面程序化绘制）
- 纯前端，无后端
- tsx 运行测试

## 项目文件结构
```
mahjong-arena/
├── package.json
├── tsconfig.json
├── DESIGN.md          — 设计文档
├── src/
│   ├── engine/
│   │   ├── tiles.ts   — 牌定义
│   │   ├── hand.ts    — 手牌/胡牌
│   │   ├── game.ts    — 对局控制
│   │   └── __tests__/
│   │       └── run.ts — 测试 35/35 ✅
│   └── ai/
│       └── strategies.ts — 4 AI 策略
```

## 关键设计决策
1. 川麻血战到底（不是国标）— 快节奏，多胡
2. MVP AI 用纯算法（不调 LLM）— 零成本、毫秒响应
3. Canvas 程序化绘制牌面 — 不依赖外部图片资源
4. 先做 AI 自动对战观战，再加人机交互
5. 网页流畅性优先（用户明确要求）
