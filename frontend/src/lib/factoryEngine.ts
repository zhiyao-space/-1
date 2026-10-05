import type { ChatApiMessage } from './api'
import { streamChat } from './api'
import { getDefaultChatPreset, getPresetById } from '../store/apiPresets'
import { APP_TEMPLATES, type AppTemplate } from './factoryTemplates'
import type { AppCategory, AppSize } from '../store/factory'

/** 「mulin功能应用制造厂」可选的视觉风格 */
export const FACTORY_STYLES: { id: string; label: string; hint: string }[] = [
  { id: 'thick', label: '厚块黑白', hint: '项目默认：实体厚块 + 双层阴影' },
  { id: 'minimal', label: '极简暗色', hint: '更少的装饰，专注内容' },
  { id: 'cyber', label: '赛博霓虹', hint: '暗底 + 冷色描边光' },
  { id: 'cute', label: '圆润可爱', hint: '大圆角 + 柔和配色' },
]

export const FACTORY_EXTRAS: string[] = [
  '数据本地持久化',
  '带动画微交互',
  '支持深色模式',
  '含空状态提示',
  '含数据统计',
  '支持导出数据',
]

export interface GeneratedApp {
  name: string
  description: string
  category: AppCategory
  icon: string
  html: string
  css: string
  js: string
}

const CATEGORIES: AppCategory[] = ['效率', '生活', '娱乐', '工具', '自定义']

function styleBrief(style: string): string {
  switch (style) {
    case 'minimal':
      return '极简暗色：黑色/深灰底，弱化阴影，留白克制，只保留必要元素'
    case 'cyber':
      return '赛博霓虹：深黑底 + 青色/品红细描边与辉光，等宽字体点缀，未来感'
    case 'cute':
      return '圆润可爱：大圆角、柔和低饱和配色、轻快的小弹跳动画'
    default:
      return '厚块黑白渐变：页面背景 linear-gradient(160deg,#000,#1a1a1a,#0a0a0a)；所有凸起块面统一 #2a2a2a；前景块 box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a；中景块 6px 6px 12px #000,-5px -5px 10px #333；凹陷区 box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a 且背景 #111；强调色仅用纯白 #fff 与 #d8d8d8；圆角 16-24px；点击下压 4px'
  }
}

function sizeBrief(size: AppSize): string {
  switch (size) {
    case 'small':
      return '小组件：内容约半屏，一屏内不滚动'
    case 'full':
      return '全屏应用：完整功能，可纵向滚动，含顶部标题栏'
    default:
      return '应用卡片：约 3/4 屏，信息较完整'
  }
}

export function buildGeneratePrompt(opts: { description: string; style: string; size: AppSize; extras: string[] }): ChatApiMessage[] {
  const system = `你是「mulin功能应用制造厂」里的应用生成器。根据用户需求，生成一个完整可运行的移动端 HTML 单文件应用。

用户描述：${opts.description}
风格偏好：${styleBrief(opts.style)}
尺寸：${sizeBrief(opts.size)}
额外要求：${opts.extras.length ? opts.extras.join('、') : '无'}

硬性要求：
1. 只输出 HTML + CSS + JavaScript，无任何外部依赖、无 CDN、无框架。
2. 视觉严格遵守上面的风格偏好；不要使用透明玻璃、backdrop-filter、彩色渐变填充。
3. JS 实现完整交互，所有数据用 localStorage 持久化（key 带 mt_ 前缀）。
4. 代码结构清晰，HTML/CSS/JS 严格分离：html 字段只写 body 内部内容（不含 <html>/<head>/<body>/<style>/<script> 标签）；css 为纯 CSS；js 为纯 JS（不含 <script> 标签）。
5. 适配 375px 宽度，按钮最小高度 44px，界面图标用纯 CSS 或内联 SVG，不要用 emoji 做界面图标。
6. 所有 DOM 查询都要做空值保护，禁止抛错。

只输出一个 JSON 对象，不要输出任何解释文字或 markdown 代码块围栏，格式如下：
{"name":"应用名称","description":"一句话功能说明","category":"效率|生活|娱乐|工具|自定义","icon":"一个 emoji","html":"...","css":"...","js":"..."}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: '请生成。' },
  ]
}

/** 从模型输出里抠出第一个完整 JSON 对象（容忍 ```json 围栏与前后废话） */
export function extractJson(text: string): Record<string, unknown> | null {
  let s = text.trim()
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(s)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(start, i + 1)) as Record<string, unknown>
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function normalizeCategory(v: unknown): AppCategory {
  const s = String(v ?? '').trim()
  const hit = CATEGORIES.find((c) => c === s)
  if (hit) return hit
  const alias: Record<string, AppCategory> = {
    生产力: '效率',
    办公: '效率',
    日常: '生活',
    健康: '生活',
    游戏: '娱乐',
    趣味: '娱乐',
    助手: '工具',
    其他: '自定义',
  }
  return alias[s] ?? '自定义'
}

function toGenerated(j: Record<string, unknown>): GeneratedApp | null {
  const html = String(j.html ?? '').trim()
  const css = String(j.css ?? '').trim()
  const js = String(j.js ?? '').trim()
  if (!html && !css && !js) return null
  return {
    name: String(j.name ?? '').trim() || '未命名应用',
    description: String(j.description ?? '').trim(),
    category: normalizeCategory(j.category),
    icon: String(j.icon ?? '').trim().slice(0, 4) || '🧩',
    // 若模型把整份文档塞进 html，剥掉外壳，避免二次包壳
    html: html.replace(/<\/?(?:html|head|body)[^>]*>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').trim() || html,
    css,
    js,
  }
}

/** 无可用模型 / 生成失败时的兜底：按关键词从预置模板里挑一个最接近的 */
export function fallbackFromTemplates(description: string): GeneratedApp {
  const text = description.toLowerCase()
  const keywords: Record<string, string[]> = {
    tmpl_todo: ['待办', '任务', 'todo', '清单', '打卡事项'],
    tmpl_notes: ['备忘', '笔记', 'note', '记事'],
    tmpl_habit: ['习惯', '打卡', '坚持', 'habit'],
    tmpl_countdown: ['倒计时', '纪念日', '生日', '考试', 'countdown'],
    tmpl_mood: ['心情', '情绪', '日记', 'mood', '记录心情'],
    tmpl_pomodoro: ['番茄', '专注', 'pomodoro', '计时工作'],
    tmpl_calculator: ['计算', '算数', 'calculator', '算术'],
    tmpl_sticky: ['便签', '贴纸', 'sticky', '留言墙'],
    tmpl_currency: ['汇率', '换算', '货币', '美元', 'currency'],
    tmpl_vault: ['密码', '保险', '账号', 'password', 'vault'],
    tmpl_reading: ['读书', '观影', '追剧', '进度', 'reading'],
    tmpl_dice: ['抽签', '随机', '骰子', '决定', '随机选'],
  }
  let best: AppTemplate | null = null
  let bestScore = 0
  for (const t of APP_TEMPLATES) {
    const words = keywords[t.id] ?? []
    const score = words.reduce((n, w) => (text.includes(w) ? n + 1 : n), 0)
    if (score > bestScore) {
      bestScore = score
      best = t
    }
  }
  const base = best ?? APP_TEMPLATES[0]
  return {
    name: base.name,
    description: base.description,
    category: base.category,
    icon: base.icon,
    html: base.html,
    css: base.css,
    js: base.js,
  }
}

function pickPreset(presetId?: string | null) {
  return (presetId ? getPresetById(presetId) : null) ?? getDefaultChatPreset()
}

/** 调用模型生成一个应用；失败时由调用方决定是否用 fallbackFromTemplates 兜底 */
export async function generateApp(opts: {
  description: string
  style: string
  size: AppSize
  extras: string[]
  presetId?: string | null
  onDelta?: (t: string) => void
  signal?: AbortSignal
}): Promise<GeneratedApp> {
  const preset = pickPreset(opts.presetId)
  if (!preset) throw new Error('NO_PRESET')
  let buf = ''
  const full = await streamChat(preset, buildGeneratePrompt(opts), {
    signal: opts.signal,
    onDelta: (d) => {
      buf += d
      opts.onDelta?.(buf)
    },
  })
  const json = extractJson(full || buf)
  const parsed = json ? toGenerated(json) : null
  if (!parsed) throw new Error('PARSE_FAILED')
  return parsed
}

const LANG_LABEL: Record<string, string> = { html: 'HTML', css: 'CSS', js: 'JavaScript' }

/** AI 辅助修改：针对选中代码片段返回修改后的完整代码 */
export async function modifyCode(opts: {
  lang: 'html' | 'css' | 'js'
  code: string
  instruction: string
  context?: string
  presetId?: string | null
  signal?: AbortSignal
}): Promise<string> {
  const preset = pickPreset(opts.presetId)
  if (!preset) throw new Error('NO_PRESET')
  const messages: ChatApiMessage[] = [
    {
      role: 'system',
      content: `你是「mulin功能应用制造厂」的代码助手。根据用户的修改指令修改提供的 ${LANG_LABEL[opts.lang]} 代码。

要求：
1. 只做用户要求修改的部分，其余保持不变。
2. 保持原有的厚块黑白设计风格与代码风格一致。
3. 直接输出修改后的完整代码，不要 markdown 围栏、不要任何解释文字。
4. 代码必须可直接运行，DOM 查询做空值保护。`,
    },
    {
      role: 'user',
      content: `当前 ${LANG_LABEL[opts.lang]} 代码：\n${opts.code}${opts.context ? `\n\n（其余文件作为参考）\n${opts.context}` : ''}\n\n修改指令：${opts.instruction}`,
    },
  ]
  const full = await streamChat(preset, messages, { signal: opts.signal, onDelta: () => {} })
  return stripFence(full)
}

export function stripFence(text: string): string {
  const m = /```[a-zA-Z0-9_+#.-]*\r?\n([\s\S]*?)```/.exec(text)
  return (m ? m[1] : text).trim()
}

export function hasAiPreset(): boolean {
  return !!getDefaultChatPreset()
}