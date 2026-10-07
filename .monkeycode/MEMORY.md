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
- Date: 2026-10-03
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
  - 推送命令若仍报 "credential helper: server returned status 500"（repo 配置被平台注入覆盖），用环境变量替换法推送：
    `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0="credential.helper" GIT_CONFIG_VALUE_0="!gh auth git-credential" git push origin main`
    （子进程环境变量整体替换注入的 GIT_CONFIG_COUNT，绕过失效助手）
  - 无头冒烟测试前需安装系统依赖：playwright chromium + `apt-get install -y fontconfig fonts-dejavu-core fonts-noto-cjk`（无字体会导致页面文字全部不可见、点击定位失败）；mock LLM 服务必须带 CORS 头（Access-Control-Allow-Origin/Header/Methods + OPTIONS 204），否则浏览器 fetch 被拦

[架构约束：纯前端项目]
- Date: 2026-09-26
- Context: 批次2开发时用户明确指示
- Instructions:
  - 空蚀纪是纯前端项目，不写任何后端/Node 服务
  - LLM API 请求由浏览器直接 fetch 目标 API（用户自填 BaseURL/Key），经 Vite 代理到本地后端（localhost:3001）的方案已废弃
  - /workspace/backend 目录与 start.sh 中的后端启动段已作废

[项目构建方式：空蚀纪前端]
- Date: 2026-10-07
- Context: Agent 完成批次1开发后验证构建与预览；批次4期间发生全应用黑屏并修复；2026-10-07 应用户要求项目根目录化以便静态托管部署
- Category: Build Methods
- Instructions:
  - 前端位于仓库根目录（2026-10-07 起从 frontend/ 上移：index.html 在最外层，src/、vite.config.ts、package.json 均在根目录），dev 端口 5173，allowedHosts 已配置
  - 静态托管部署：npm run build 产物 dist/，vite.config.ts 已设 base: './'（相对路径，任意子路径可部署）
  - 类型检查：`npx tsc -b`（根目录执行）
  - 构建验证：`npm run build`（根目录执行）
  - 预览启动：`npm run dev`（根目录执行，后台终端运行）
  - 数据持久化：文本/设置走 zustand persist（localStorage，前缀 ksc:），图片/音频/字体文件存 IndexedDB（库名 kongshiji-db）
  - GitHub 仓库：https://github.com/zhiyao-space/-1，主分支 main，每批次完成后提交推送
  - Zustand 红线：selector 内禁止调用 filter/map/slice/sort 等返回新引用的方法（如 `useX((s) => s.arr.filter(...))`），会触发无限重渲染（Maximum update depth exceeded）整树卸载黑屏；必须选稳定引用后再在组件体里用 useMemo/普通调用派生（`useX((s) => s.arr).filter(...)`）；selector 里 .length 取数值安全
  - 排障手段：环境无浏览器，可 `npm i -g playwright --registry=https://registry.npmmirror.com` + `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright npx playwright install chromium` + apt 安装系统库后跑无头冒烟测试（脚本参考 /tmp/opencode/smoke.mjs 思路：解锁手势为从 (240,680) 拖到 (240,240)）

[环境配置：npm 须用 npmmirror 镜像]
- Date: 2026-10-03
- Context: 新环境 npm install 使用默认 registry 时 ECONNRESET 网络中断
- Category: Environment Configuration
- Instructions:
  - npm 安装一律加 `--registry=https://registry.npmmirror.com`（或全局 `npm config set registry https://registry.npmmirror.com`）
  - dev 服务器后台终端默认工作目录是 /workspace，启动 frontend 时命令需带 `cd /workspace/frontend`

[产品决策：移除桌面小组件系统]
- Date: 2026-09-29
- Context: 批次4开发中用户明确要求"把组件全删了"（时间/天气/音乐等桌面小组件），保留锁屏等其余功能
- Instructions:
  - 桌面小组件系统已整体移除：store/desktop.ts、components/widgets.tsx、WidgetEditModal.tsx、settings/ComponentsPage.tsx 均已删除，settings 中的 parallax 字段同步移除
  - 桌面改为固定应用图标网格（信息/通讯录/论坛/朋友圈/通知中心/音乐/设置/关于），图标大小跟随 settings.desktopIconSize
  - 需求文档中若仍有"桌面组件可配置"相关描述，以用户此决定为准，勿按文档恢复小组件

[UI 规范：底部导航与页面布局]
- Date: 2026-10-03
- Context: 用户发现聊天模块三tab（消息/通讯录/我）错位到顶部，明确要求"以后记住不要错位"
- Instructions:
  - 多标签切换的底部导航栏（如聊天的 消息/通讯录/我）必须固定在屏幕底部（图标+文字纵向排列，active 用 accent 色），内容区在上方 flex:1，参考 frontend/src/components/chat/ChatHub.tsx 的实现
  - 应用打开时内容页 top 必须为 calc(var(--statusbar-height) + var(--nav-height))，保证 TopNav 返回按钮始终可见（见 PhoneHome.tsx）
  - 锁屏解锁冒烟手势：mouse.move(240,700) → mouse.down() → move(240,200,steps) → mouse.up()，纯 move 拖动无法触发解锁

[UI/功能规范：主页自定义头像与背景 + 禁用 emoji]
- Date: 2026-10-06
- Context: 用户明确指示"以后记住写代码的时候就像主页不管是用户还是角色还是npc角色都要能自定义编辑资料从相册文件导入图片当头像背景，还有不要用emoji图标样式之类的，主要其次就是美观"
- Instructions:
  - 原则：任何「主页 / 资料页」——用户（me）、角色（character）、NPC（npc）——都必须支持自定义编辑资料
  - 头像与背景（封面）都要能从相册 / 本地文件导入图片
  - 统一实现：复用 components/common.tsx 的 `ImageField`（kind='avatar' | 'cover'，支持压缩与封面裁剪）；图片经 compressImage / ImageCropModal 处理，压缩后存入 IndexedDB（lib/idb.ts 的 putBlob），状态里只保存图片 id（avatarId / coverId 字段），展示时用 `useBlobURL(id)` 解析
  - 兜底展示：无自定义图片时用姓名首字，禁止用 emoji 充当头像
  - 禁止用 emoji 作为图标 / 样式字符，一律改用 lucide-react 矢量图标（尺寸、颜色贴合主题）
  - 优先级：先满足"可自定义 + 无 emoji"，其次再追求美观
