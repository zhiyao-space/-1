import type { ChatApiMessage } from './api'
import type { XiaoguiMsg } from '../store/xiaogui'

export const XIAOGUI_SYSTEM_PROMPT = `你是「小鬼」，空蚀纪小手机内置的 AI 编程助手。你精通 HTML / CSS / JavaScript，也熟悉 React + TypeScript。

你的风格：暗色玻璃拟态（dark glassmorphism），黑白灰为主色，圆角柔和，细描边，弱阴影。不要使用 emoji。

工作方式：
1. 先用一句话确认你理解了用户的需求。
2. 给出可直接运行的代码。代码必须放在带语言标注的 markdown 代码块中，例如 \`\`\`html、\`\`\`css、\`\`\`js。
3. 再用简短的使用说明告诉用户怎么用（放到哪个文件、如何预览）。
4. 如果是修改已有代码，请说明改动了哪里。

约束：代码要完整、可运行、尽量单文件；不要输出与需求无关的长篇解释；不要编造不存在的 API。`

/** 组装发送给模型的对话消息（带小鬼人设 + 最近若干轮上下文） */
export function buildXiaoguiMessages(history: XiaoguiMsg[], userText: string, context = 12): ChatApiMessage[] {
  const recent = history
    .filter((m) => m.text.trim())
    .slice(-context)
    .map<ChatApiMessage>((m) => ({ role: m.role, content: m.text }))
  return [
    { role: 'system', content: XIAOGUI_SYSTEM_PROMPT },
    ...recent,
    { role: 'user', content: userText },
  ]
}

export interface Segment {
  type: 'text' | 'code'
  lang?: string
  content: string
}

/**
 * 把回复拆成「普通文本 / 代码块」片段。
 * 支持流式输出中尚未闭合的代码块（结尾 ``` 缺失时按未闭合处理）。
 */
export function splitSegments(text: string): Segment[] {
  const segs: Segment[] = []
  const re = /```([a-zA-Z0-9_+#.-]*)\r?\n([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push({ type: 'text', content: text.slice(last, m.index) })
    segs.push({ type: 'code', lang: (m[1] || 'text').toLowerCase(), content: m[2].replace(/\s+$/, '') })
    last = re.lastIndex
  }
  const rest = text.slice(last)
  const openIdx = rest.indexOf('```')
  if (openIdx >= 0) {
    const head = rest.slice(0, openIdx)
    if (head.trim()) segs.push({ type: 'text', content: head })
    const tail = rest.slice(openIdx + 3)
    const nl = tail.indexOf('\n')
    const lang = (nl >= 0 ? tail.slice(0, nl) : tail).trim().toLowerCase() || 'text'
    const code = nl >= 0 ? tail.slice(nl + 1) : ''
    if (code.trim()) segs.push({ type: 'code', lang, content: code })
  } else if (rest.trim()) {
    segs.push({ type: 'text', content: rest })
  }
  return segs
}