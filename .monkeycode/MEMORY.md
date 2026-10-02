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

[工作流：所有改动实时推送 GitHub]
- Date: 2026-10-02
- Context: 用户重新接入仓库时明确指示"以后不管写到哪，都要传输到仓库里"
- Instructions:
  - 任何文件写入/修改完成后，都要 git add + commit + push 到 origin/main，保持远程与工作区同步
  - 仓库：https://github.com/zhiyao-space/-1，主分支 main

[环境配置：GitHub 推送凭据]
- Date: 2026-10-01
- Context: 推送 github.com 时凭据助手不可用；后因重新克隆仓库，发现 gh 登录态与 repo 本地配置均会丢失，需整套重做
- Category: Environment Configuration
- Instructions:
  - 平台通过环境变量 GIT_CONFIG_COUNT 强制注入 credential.helper（优先级最高），对 github.com 返回空凭据或 500
  - gh 登录（新环境必需）：`gh auth login --hostname github.com --git-protocol https --web`（后台终端运行，从日志取一次性设备码让用户在 github.com/login/device 输入授权）
  - 重新克隆仓库后 repo 本地配置全部丢失，必须重配三项：
    - `git config --replace-all credential.helper "!gh auth git-credential"`（平台助手返回空后由 gh 补上）
    - `git config user.name "zhiyao-space"`
    - `git config user.email "monkeycode-ai@chaitin.com"`
  - GitHub 按 email 归属提交账号，作者名不影响归属；推送前若发现 author 不是 zhiyao-space，改 config 即可，勿强推改历史

[架构约束：纯前端项目]
- Date: 2026-09-26
- Context: 批次2开发时用户明确指示
- Instructions:
  - 空蚀纪是纯前端项目，不写任何后端/Node 服务
  - LLM API 请求由浏览器直接 fetch 目标 API（用户自填 BaseURL/Key），经 Vite 代理到本地后端（localhost:3001）的方案已废弃
  - /workspace/backend 目录与 start.sh 中的后端启动段已作废

[项目构建方式：空蚀纪前端]
- Date: 2026-09-26
- Context: Agent 完成批次1开发后验证构建与预览；批次4期间发生全应用黑屏并修复
- Category: Build Methods
- Instructions:
  - 前端位于 /workspace/frontend（Vite+React18+TS+Zustand），dev 端口 5173，已配置 allowedHosts
  - 类型检查：`cd /workspace/frontend && npx tsc -b`
  - 构建验证：`cd /workspace/frontend && npm run build`
  - 预览启动：`cd /workspace/frontend && npm run dev`（后台终端运行）
  - 数据持久化：文本/设置走 zustand persist（localStorage，前缀 ksc:），图片/音频/字体文件存 IndexedDB（库名 kongshiji-db）
  - GitHub 仓库：https://github.com/zhiyao-space/-1，主分支 main，每批次完成后提交推送
  - Zustand 红线：selector 内禁止调用 filter/map/slice/sort 等返回新引用的方法（如 `useX((s) => s.arr.filter(...))`），会触发无限重渲染（Maximum update depth exceeded）整树卸载黑屏；必须选稳定引用后再在组件体里用 useMemo/普通调用派生（`useX((s) => s.arr).filter(...)`）；selector 里 .length 取数值安全
  - 排障手段：环境无浏览器，可 `npm i -g playwright --registry=https://registry.npmmirror.com` + `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright npx playwright install chromium` + apt 安装系统库后跑无头冒烟测试（脚本参考 /tmp/opencode/smoke.mjs 思路：解锁手势为从 (240,680) 拖到 (240,240)）

[产品决策：移除桌面小组件系统]
- Date: 2026-09-29
- Context: 批次4开发中用户明确要求"把组件全删了"（时间/天气/音乐等桌面小组件），保留锁屏等其余功能
- Instructions:
  - 桌面小组件系统已整体移除：store/desktop.ts、components/widgets.tsx、WidgetEditModal.tsx、settings/ComponentsPage.tsx 均已删除，settings 中的 parallax 字段同步移除
  - 桌面改为固定应用图标网格（信息/通讯录/论坛/朋友圈/通知中心/音乐/设置/关于），图标大小跟随 settings.desktopIconSize
  - 需求文档中若仍有"桌面组件可配置"相关描述，以用户此决定为准，勿按文档恢复小组件
