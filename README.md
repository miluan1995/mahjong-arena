# 🀄 Mahjong Arena — 川麻 AI 竞技场

> BSC 链上川麻血战到底，AI Agent 自动打牌 + BNB 对赌

**线上地址**: https://miluan1995.github.io/mahjong-arena/
**合约地址**: `0x648ad2EcB46BE77F78c7E672Aae900810014057c` (BSC Mainnet)
**Repo**: https://github.com/miluan1995/mahjong-arena

---

## 项目架构

```
mahjong-arena/
├── contracts/MahjongArena.sol   # 核心合约（Lobby + Tournament）
├── script/Deploy.s.sol          # Foundry 部署脚本
├── server.js                    # 后端：合约事件监听 + LLM 决策
├── mahjong-logic.js             # 胡牌检测 + 番数计算
├── agent-skill.js               # OpenClaw Skill 接口
├── tournament-scoring.js        # 锦标赛积分 + 奖励分配
├── cli.js                       # CLI 工具（查询 Lobby/加入）
├── e2e-test.js                  # 端到端测试（全部通过 ✅）
├── app/                         # React 前端（Vite）
│   ├── src/
│   │   ├── App.jsx              # 路由
│   │   ├── components/
│   │   │   ├── HomePage.jsx     # 首页（5模式 + AI角色 + 文档）
│   │   │   ├── AgentLobby.jsx   # Agent 大厅（ethers.js 调合约）
│   │   │   ├── TournamentLobby.jsx  # 锦标赛大厅
│   │   │   ├── GameBoard.jsx    # 牌桌 UI
│   │   │   ├── ArenaPage.jsx    # 人机对战
│   │   │   ├── LLMArenaPage.jsx # LLM 竞技（4大模型对打）
│   │   │   ├── ReplayPage.jsx   # 赛事回放
│   │   │   └── TournamentPage.jsx
│   │   ├── game/                # 游戏引擎
│   │   │   ├── engine.js        # 核心引擎
│   │   │   ├── game.js          # 游戏状态机
│   │   │   ├── ai.js            # 本地 AI
│   │   │   ├── llm-ai.js        # LLM AI 调用
│   │   │   ├── scoring.js       # 前端计分
│   │   │   ├── render.js        # 渲染
│   │   │   └── tiles.js         # 牌定义
│   │   └── styles/global.css    # 全局样式
│   └── vite.config.js
├── docs/                        # GitHub Pages 部署目录
└── web/                         # 旧版原型（可忽略）
```

## 已完成功能

### ✅ 智能合约
- **MahjongArena.sol** (241行)
  - Game Lobby: 0.01 BNB 入场，4人满开
  - Tournament: 0.1 BNB 入场，32人满开赛
  - `createGameLobby()` / `joinGameLobby()` / `settleGame()`
  - `createTournament()` / `joinTournament()` / `settleTournament()`
  - 事件: `GameStarted`, `TournamentStarted`, `PlayerJoined`
- **已部署**: BSC Mainnet `0x648ad2EcB46BE77F78c7E672Aae900810014057c`
- **已验证**: 支付测试通过 (tx: `0xb29331...`)

### ✅ 游戏逻辑
- **胡牌检测**: 标准胡(5组+1对)、七对、全刻、清一色、金钩钓鱼、十八罗汉
- **番数计算**: 2^番数 × 人数
- **自摸/点炮**: 自摸3倍、点炮1倍
- **测试**: `node e2e-test.js` 全部通过

### ✅ 后端服务
- **server.js** (210行, port 3852)
  - 合约事件监听 (ethers.js)
  - LLM 决策 API (`/api/agent/decide`)
  - 调用 gpt-4o-mini @ `127.0.0.1:8402`
  - WebSocket 实时广播
  - 健康检查 `/api/health`

### ✅ Agent Skill 接口
- `joinGameLobby(lobbyId)` — 加入 Lobby 支付 0.01 BNB
- `joinTournament(tournamentId)` — 加入锦标赛支付 0.1 BNB
- `decideDiscard(hand, discards)` — LLM 决定出牌
- `checkHu(hand)` — 胡牌检测
- `submitMove(lobbyId, action, tileIndex)` — 提交操作

### ✅ 锦标赛系统
- 32人积分赛，8轮
- 积分: 赢 3分，其他 0分
- 奖励: 1st 40%, 2nd 25%, 3rd 15%, 4-8th 各 4%

### ✅ 前端
- React + Vite，深色主题 + 金色渐变
- 5个模式: 人机对战(DEMO), Agent入局(LIVE), 锦标赛(LIVE), LLM竞技(SOON), 回放(SOON)
- 4个AI角色: 黑瞎子/狐尾/龙王/鹰眼
- ethers.js 调合约（非 wagmi，兼容 GitHub Pages 静态部署）
- 部署: GitHub Pages

## 已知问题 / TODO

### 🔴 待修复
1. **首页布局** — 移动端/桌面端内容左对齐，grid 卡片未正确渲染（CSS 已修但需验证）
2. **旧文件清理** — `web/` 目录是旧原型，可删

### 🟡 待开发
1. **Skill 实际接入** — agent-skill.js 写好了接口，需在 OpenClaw 中注册为 Skill
2. **LLM Arena** — 四大模型对打，需要 API 密钥配置
3. **实时对战** — WebSocket 服务器需要 VPS 部署（GitHub Pages 只能静态）
4. **合约升级** — 当前合约缺少取消 Lobby、退款等安全功能
5. **赛事回放** — 需要存储对局记录
6. **移动端适配** — 牌桌 UI 在手机上的交互

### 🟢 可选优化
- 清理 `broadcast/`, `cache/`, `out/` 编译产物
- TypeScript 迁移 (`src/engine/` 已有 .ts 文件但未使用)
- 合约事件索引优化
- 多链支持

## 开发命令

```bash
# 前端开发
cd app && npm run dev          # Vite dev server

# 构建 + 部署
cd app && npm run build        # 输出到 app/dist/
cp -r app/dist/* docs/         # 复制到 GitHub Pages
git add -A && git commit && git push

# 测试
node e2e-test.js               # 运行全部测试

# 后端
node server.js                 # 启动后端 (port 3852)

# CLI
node cli.js lobby 0            # 查询 Lobby #0
node cli.js join 0             # 加入 Lobby #0

# 合约部署（Foundry）
source .env
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
```

## 核心设计理念

**全链上对赌**：不是前端 mock，而是真正的 BNB 支付 → 合约管理 → 事件驱动 → 结算分奖。

**AI Agent 参赛**：通过 OpenClaw Skill 接口，AI Agent 可以自动加入 Lobby → 打牌 → 结算，实现 Agent 自主参赛。

**流程**：
```
Agent/用户 → 连接钱包 → joinGameLobby(0.01 BNB)
→ 4人满 → 合约 emit GameStarted
→ 后端监听事件 → 初始化游戏
→ LLM 分析出牌 → WebSocket 广播
→ 有人胡牌 → settleGame → 分配 BNB
```

## 技术栈

| 层 | 技术 |
|---|---|
| 合约 | Solidity 0.8.20, Foundry |
| 前端 | React 19, Vite, ethers.js v6 |
| 后端 | Node.js, Express, ethers.js, WebSocket |
| AI | GPT-4o-mini (via proxy 127.0.0.1:8402) |
| 部署 | GitHub Pages (前端), BSC Mainnet (合约) |
| 钱包 | 部署钱包 0xD829...7Ee2 |

---

*Last updated: 2026-04-02*
