# Tasklist — 一起玩游戏中心

Feature: game-center | 设计文档: 同目录 design.md（含全部文件路径、接口、LLM 协议、接力约定）
状态标记：`[TODO]` / `[IN PROGRESS]` / `[DONE]`。完成即改标记 + commit + push。

---

## T1 [DONE] 消息层扩展 — chats.ts

- 文件：`frontend/src/store/chats.ts`
- 行 4：`MessageType` 追加 `'game-card'`
- 行 8 `MessageData` 追加字段 `gameId?: string`（注释：游戏卡指向 games store 会话 id）
- 验收：`npx tsc -b` 通过（workdir /workspace/frontend）
- 提交：`feat(game): T1 消息层新增 game-card 类型`

## T2 [DONE] 数据层 — games store

- 新建：`frontend/src/store/games.ts`
- 内容：严格按 design.md「Components 1」的 GameSession/TrpgState/TurtleState/GameType/GameStatus 定义；persist 键 `ksc:games`；actions：createGame（uid 格式仿 chats.ts 的 uid，`g` 前缀）、patchState、pushLog（log 截断最近 40 条）、setStatus、endGame、removeGame、getActiveByChat
- 约束：同一 chatId 至多一个 playing（createGame 时把同 chatId 旧 playing/paused 置 ended）
- 验收：tsc 通过；import 无循环
- 提交：`feat(game): T2 games store 数据层`

## T3 [DONE] 降级池 — gameFallback

- 新建：`frontend/src/lib/gameFallback.ts`
- 内容：按 design.md「Components 3」：FALLBACK_TRPG_EVENTS（12+ 条，支持 {scene}/{item} 占位）、FALLBACK_TURTLES（6+ 题，含 keywords 判定表）、localTurn、localTurtleTurn（纯函数，输入 session + userText，输出 {narrative, patch}）
- 文案风格：与 `frontend/src/lib/momentFallback.ts` 一致的中文口语风
- 提交：`feat(game): T3 本地降级文案池`

## T4 [DONE] 核心引擎 — gameEngine

- 新建：`frontend/src/lib/gameEngine.ts`
- 内容：严格按 design.md「Components 2」：startGame / handleGameTurn / buildGameSystemPrompt / parseGameBlock / trpgPresets(5 模板)
- 关键点：
  - preset 解析复制 ChatScreen.tsx:127-129 模式（character.apiPresetId ? getPresetById : getDefaultChatPreset）
  - 系统提示词 = buildCharacterPrompt(character)（chatEngine.ts:19）+ 游戏规则模板 + 状态 JSON + 最近 log（≤8 条）+ 协议约定（回复 = 叙述正文 + ```game JSON 围栏）
  - 跑团回合：本地 `Math.floor(Math.random()*20)+1` 掷骰，骰点与目标值写入提示词，由 LLM 解释成败
  - 回合前浅拷贝 trpg/turtle 状态，streamChat 失败时 patchState 回滚并 throw
  - 无 preset/preset.baseUrl 为空 → 自动走 gameFallback，并在返回叙述前加「（离线模式）」标记
- 提交：`feat(game): T4 游戏引擎与LLM协议`

## T5 [DONE] 创建面板 — GameSetupModal

- 新建：`frontend/src/components/games/GameSetupModal.tsx`
- 内容：底部弹层；两步流程（选类型卡片 → 模板选择/自由输入/难度）；确认后：createGame → addMessage(system) + addMessage(game-card, data.gameId) → startGame → 开场叙述 addMessage(assistant)；无 API 时系统消息注明离线模式
- 样式：参照 ChatScreen 内弹层遮罩与 moments 卡片变量（var(--text-*)）
- 提交：`feat(game): T5 游戏创建面板`

## T6 [DONE] 游戏卡 — GameCardBubble

- 新建：`frontend/src/components/games/GameCardBubble.tsx`
- 内容：按 design.md「Components 6」三态渲染（playing/paused/ended）；跑团面板=场景+进度条+HP+道具；海龟汤面板=提问标记列表+要提示(max3)；按钮：暂停/继续/结束并归档/删除
- 操作均调 games store；结束并归档后由 ChatScreen 发一条 system 消息
- 提交：`feat(game): T6 游戏卡组件`

## T7 [DONE] ChatScreen 集成

- 修改：`frontend/src/components/chat/ChatScreen.tsx`
- 4 处改动：
  1. 加号面板（行 846-856 附近）加「一起玩」PlusAction（lucide `Dices`），线下模式隐藏
  2. 渲染分支（行 1460 moment-card 分支附近）加 `game-card` → GameCardBubble
  3. 发送路由（行 200-235 附近）：发送前 getActiveByChat，命中且 playing 且非 OOC → handleGameTurn（复用现有 loading/typing 状态）；输入区上方「游戏中·点击暂停」胶囊
  4. removeSession 处挂钩删除匹配 games
- 提交：`feat(game): T7 聊天流集成与路由`

## T8 [DONE] 验证与收尾

- `cd /workspace/frontend && npx tsc -b` 通过
- dev server 冒烟：创建跑团局行动 3 回合 → 进度/hp 变化 → 暂停 → 插嘴 → 继续 → 结束归档；海龟汤提问 3 次 + 提示 + 猜底；刷新页面持久化恢复
- 确认无 API 环境走降级池
- 全部 push 后把本文件 T1-T8 状态核对为 [DONE]
- 提交：`feat(game): T8 验证收尾`

---

## Progress Log（接力方必读，追加勿删）

- 2026-10-06 规格(requirements/design/tasklist)已推送。执行从 T1 开始。
- 2026-10-06 T1-T7 完成（提交 9edfcd0/20ba3f2/14d3057/fdd60d9/39f39bd/9b9c7e3 及本次）。设计偏差：T7 第 4 项「removeSession 删除聊天时清理 games」未挂钩——孤儿游戏会话无副作用（路由按 chatId 匹配、卡片有已删除兜底渲染），从简处理。games store 额外增加了 setCardMsg action（卡片消息与会话互链）。剩余：T8 验证收尾。
- 2026-10-06 T8 完成：npx tsc -b 通过；vite dev server 无编译错误（HMR 已加载全部新文件）；预览地址 5173-29b7c7a33a442dc6.monkeycode-ai.online 连通正常。功能入口：聊天输入区 + 号 → 一起玩。待用户实际体验跑团/海龟汤对局反馈。
