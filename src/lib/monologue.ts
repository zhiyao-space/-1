import { useWorldbook } from '../store/worldbook'
import { useCharacters } from '../store/characters'
import type { Monologue } from '../store/desktopModules'

const FALLBACK_LINES = [
  '如果有一天我突然消失了，大概是因为终于学会了闭嘴。',
  '今天也不想见人，只想把自己关在安静的房间里。',
  '有些话到嘴边，最后还是咽了回去。',
  '原来孤独是种习惯，习惯久了就不再觉得疼。',
  '谁都没有错，只是我们走散了而已。',
  '天亮了之后，一切都会显得没那么重要。',
  '我很好，只是偶尔不太好。',
  '热闹是他们的，我什么都没有。',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 抽取一条「今日独白」：
 * 优先从世界书条目内容取台词，其次回退到内置暗黑文案，署名归属角色或世界书。
 */
export function rollMonologueLine(): Monologue {
  const chars = useCharacters.getState().characters
  const books = useWorldbook.getState().books.filter((b) => b.enabled)
  const candidates: { text: string; author: string }[] = []
  for (const b of books) {
    for (const e of b.entries) {
      for (const line of e.content.split('\n')) {
        const t = line.trim()
        if (t.length >= 6 && t.length <= 60) candidates.push({ text: t, author: b.name })
      }
    }
  }
  if (candidates.length > 0) {
    const c = pick(candidates)
    return { text: c.text, author: c.author, at: Date.now() }
  }
  const author = chars.length > 0 ? pick(chars).name : '空蚀纪'
  return { text: pick(FALLBACK_LINES), author, at: Date.now() }
}

/** 时间卡签名：优先用户自定义签名，否则抽一条台词 */
export function rollSignature(): string {
  const chars = useCharacters.getState().characters
  const books = useWorldbook.getState().books.filter((b) => b.enabled)
  for (const b of books) {
    for (const e of b.entries) {
      for (const line of e.content.split('\n')) {
        const t = line.trim()
        if (t.length >= 6 && t.length <= 28) return t
      }
    }
  }
  const short = FALLBACK_LINES.filter((l) => l.length <= 24)
  const line = pick(short.length > 0 ? short : FALLBACK_LINES)
  return chars.length > 0 ? `${line}` : '今天也不想见人。'
}