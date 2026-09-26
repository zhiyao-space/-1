# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
User instruction entries should follow this format:

[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
Entries discovered by the Agent during task execution should follow this format:

[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.

## Entries

[架构约束：纯前端项目]
- Date: 2026-09-26
- Context: 批次2开发时用户明确指示
- Instructions:
  - 空蚀纪是纯前端项目，不写任何后端/Node 服务
  - LLM API 请求由浏览器直接 fetch 目标 API（用户自填 BaseURL/Key），经 Vite 代理到本地后端（localhost:3001）的方案已废弃
  - /workspace/backend 目录与 start.sh 中的后端启动段已作废

[项目构建方式：空蚀纪前端]
- Date: 2026-09-26
- Context: Agent 完成批次1开发后验证构建与预览
- Category: Build Methods
- Instructions:
  - 前端位于 /workspace/frontend（Vite+React18+TS+Zustand），dev 端口 5173，已配置 allowedHosts
  - 类型检查：`cd /workspace/frontend && npx tsc -b`
  - 构建验证：`cd /workspace/frontend && npm run build`
  - 预览启动：`cd /workspace/frontend && npm run dev`（后台终端运行）
  - 数据持久化：设置/桌面布局走 zustand persist（localStorage，前缀 ksc:），图片/音频/字体文件存 IndexedDB（库名 kongshiji-db）
  - GitHub 仓库：https://github.com/zhiyao-space/-1，主分支 main，每批次完成后提交推送

[开发协作方式：小手机 App 项目]
- Date: 2026-09-26
- Context: 用户启动"空蚀纪"小手机 App 开发，提供了 6 份需求 HTML（缓存于 .monkeycode-tmp-files/）
- Instructions:
  - 严格按用户提供的 6 份需求文档实现，每项功能必须有真实 UI + 交互逻辑 + 数据写入，禁止纯 CSS 装饰
  - 分批次开发，每完成一批停下来等用户验收，通过后再继续下一批
  - 聊天功能与群聊功能合并为同一模块实现
  - 核心原则（零内置内容）：一切内容由用户创作。名册/通讯录只显示空状态和"创建你的第一个角色"提示；角色创建所有字段用户自填（昵称/身份/外观/性格核心/沟通风格/禁止事项等）；禁止内置预设角色、示例对话、模板对话、快捷回复、预设开场白、示例消息；朋友圈/交互记录等空状态页零示例内容；每次交付前自检所有出现角色名或对话内容的页面
  - 用户在需求中提供的【语言风格】【核心原则】【回复节奏】【行为准则】块 = 角色聊天引擎的底层说话规范（所有用户创建角色共用），注入聊天 prompt
  - 手机名"空蚀纪"必须出现在：顶部导航栏、锁屏、设置页三个位置
