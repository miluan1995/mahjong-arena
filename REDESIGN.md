# 麻将竞技场 UI 全面重设计 — 需求文档

## 设计方向
参考 Awwwards 级别网站设计，暗色主题，赛博朋克 + 中国风融合。
目标：让人打开就觉得"这网站牛逼"，不是 AI 生成的廉价感。

## 技术栈
- React 18 + Vite（已有）
- 纯 CSS（不引入 Tailwind，保持现有架构）
- GSAP 动画（通过 CDN 或 npm）
- Google Fonts: "Noto Sans SC" + 一个有个性的英文 Display 字体（Space Grotesk 或 Outfit）

## 合约信息（必须保留）
- 合约地址: 0x80D1766492e1C98CFf56C1D1885549FF650657a5
- BSC 链
- 人机挑战: 0.05 BNB 入场，奖池累计制
- Agent 入局: 0.01 BNB
- 锦标赛: 0.05 BNB，4 轮积分赛

## 页面结构

### 1. HomePage（首页）
- Hero: 大标题 "麻将竞技场" + 英文副标题，背景用动态渐变或粒子效果
- 6 个模式卡片：用 glassmorphism 风格，hover 有磁性效果 + 发光边框
- AI 对手展示：4 个角色卡片，有个性化配色
- 去掉文档中心和规则长文（太长了，移到单独页面或折叠）
- Footer 简洁
- 整体有 scroll-triggered 动画（元素滚动进入时淡入）

### 2. ChallengePage（人机挑战）— 最重要
- 顶部：奖池金额大字显示，实时跳动效果
- 连钱包按钮：渐变 + hover 发光
- 4 座位布局：上下左右排列（不是一排4个），模拟真实牌桌视角
- 对战日志：终端风格，绿色文字
- 结果弹窗：赢了金色粒子特效，输了红色脉冲
- 整体氛围：紧张感，暗红色调

### 3. AgentLobby（Agent 入局大厅）
- 显示当前可用的 Lobby 列表
- 每个 Lobby 卡片显示：入场费、已加入人数、状态
- 连钱包 + 加入按钮
- 实时更新（WebSocket 或轮询）

### 4. TournamentLobby（锦标赛大厅）
- 锦标赛列表
- 积分排行榜
- 报名 + 支付流程

### 5. ArenaPage（人机对战 - 观战/对战）
- Canvas 牌桌渲染（已有，保持）
- 优化 UI 框架：日志面板、操作按钮

### 6. LLMArenaPage（大模型竞技）
- 4 个 LLM 对战面板
- 实时赔率显示
- 标记 COMING SOON

### 7. ReplayPage（赛事回放）
- 回放控制条
- 标记 COMING SOON

## 设计规范

### 配色
```
--bg-deep: #050510        // 最深背景
--bg-primary: #0a0a1a     // 主背景
--bg-card: rgba(255,255,255,0.03)  // 卡片背景（玻璃态）
--accent-gold: #ffd700    // 主强调色（金色）
--accent-red: #ff3333     // 挑战/危险
--accent-cyan: #00ffc8    // Agent/科技感
--accent-purple: #a78bfa  // 辅助
--text-primary: #f0f0f8
--text-secondary: #6b6b8a
--border-glow: rgba(255,215,0,0.15)
```

### 动画
- 页面切换：淡入 + 轻微上移（300ms ease-out）
- 卡片 hover：scale(1.02) + 边框发光 + 阴影加深
- 数字变化：计数器滚动效果
- 背景：缓慢移动的渐变 mesh

### 字体
- 中文: Noto Sans SC (400/600/700/900)
- 英文: Space Grotesk (400/600/700)
- 数字/代码: JetBrains Mono

### 间距
- 基础单位: 4px
- 卡片内边距: 24px
- 区块间距: 48-64px
- 最大内容宽度: 1200px

## 文件结构（保持现有）
```
app/src/
  main.jsx
  App.jsx
  styles/global.css
  components/
    HomePage.jsx + HomePage.css
    ChallengePage.jsx + ChallengePage.css
    AgentLobby.jsx + AgentLobby.css
    TournamentLobby.jsx + TournamentLobby.css
    ArenaPage.jsx + ArenaPage.css
    LLMArenaPage.jsx + LLMArenaPage.css
    ReplayPage.jsx + ReplayPage.css
    AgentPage.jsx + AgentPage.css
    TournamentPage.jsx + TournamentPage.css
    GameBoard.jsx + GameBoard.css
```

## 关键约束
1. 保持所有合约交互逻辑不变（ABI、地址、函数调用）
2. 保持 App.jsx 路由结构不变
3. 保持 Canvas 游戏渲染逻辑不变（ArenaPage/AgentPage 的 game 引擎）
4. 移动端必须适配（手机上也要好看）
5. 不要用 Tailwind，用纯 CSS
6. 加载速度要快（不要引入太重的库）
