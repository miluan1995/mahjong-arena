# Mahjong Agent Skill

## 概述
OpenClaw 麻将 AI Agent 接入技能。接收牌局状态，调用 LLM 进行策略分析，返回最优决策。

## 触发场景
- 麻将竞技场 Agent 模式
- 通过 HTTP API 接收牌局状态

## API Endpoint
`POST http://localhost:3852/api/agent/decide`

### 请求体
```json
{
  "type": "discard | respond | afterdraw",
  "hand": [{"suit":"wan","rank":1}, ...],
  "melds": [{"type":"peng","tiles":[...]}],
  "discards": [{"suit":"tiao","rank":3}, ...],
  "otherDiscards": {"0": [...], "1": [...], "2": [...], "3": [...]},
  "wallRemain": 42,
  "turn": 15,
  "lastDiscard": {"suit":"tong","rank":5},
  "availableActions": {"hu": true, "peng": true, "gang": false}
}
```

### 响应
```json
{
  "action": "discard | peng | gang | hu | pass",
  "tileId": 42,
  "thinking": "分析: 手牌有3组面子+1对子，距离听牌差1组...",
  "confidence": 0.85,
  "text": "打3万，做清一色"
}
```

## 安装
```bash
cd mahjong-arena
node server.js
# 服务启动在 http://localhost:3852
```

## 技术细节
- Agent server 使用 OpenClaw sessions_spawn 调用 LLM 分析
- 前端 Agent 模式自动检测 server 可用性
- 不可用时降级为 rule-based AI + 模拟思考气泡
- 思考过程实时流式显示在牌桌上方
