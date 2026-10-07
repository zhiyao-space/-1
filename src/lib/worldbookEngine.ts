import { useWorldbook, booksForCharacter, type WbEntry, type WorldBook } from '../store/worldbook'

// 约 1 token ≈ 1.6 个中英混合字符，够用即可
export function estTokens(text: string): number {
  return Math.ceil(text.length / 1.6)
}

export interface MatchedEntry {
  bookId: string
  bookName: string
  entry: WbEntry
}

function entryMatches(entry: WbEntry, chatText: string): boolean {
  if (entry.mount === 'always') return true
  if (entry.mount === 'disabled') return false
  const text = chatText.toLowerCase()
  return entry.keywords.some((k) => k.trim() && text.includes(k.trim().toLowerCase()))
}

export interface WorldbookInjection {
  systemBlock: string
  userBlock: string
  contextBlock: string
  matched: MatchedEntry[]
  estTokens: number
}

export function matchWorldbook(characterId: string, chatText: string): WorldbookInjection {
  const { tokenBudget } = useWorldbook.getState()
  const books = booksForCharacter(characterId)
  const matched: MatchedEntry[] = []
  for (const book of books) {
    for (const entry of book.entries) {
      if (entryMatches(entry, chatText)) matched.push({ bookId: book.id, bookName: book.name, entry })
    }
  }
  matched.sort((a, b) => b.entry.priority - a.entry.priority)

  let budget = tokenBudget
  const accepted: MatchedEntry[] = []
  let total = 0
  for (const m of matched) {
    const t = estTokens(m.entry.content)
    if (budget - t < 0) continue
    budget -= t
    total += t
    accepted.push(m)
  }

  const sys: string[] = []
  const user: string[] = []
  const ctx: string[] = []
  for (const m of accepted) {
    const line = `【${m.bookName} · ${m.entry.name}】\n${m.entry.content}`
    if (m.entry.depth === 'user') user.push(line)
    else if (m.entry.depth === 'context') ctx.push(line)
    else sys.push(line)
  }

  if (accepted.length > 0) {
    useWorldbook.getState().pushHitLog({
      time: Date.now(),
      characterId,
      bookId: accepted[0].bookId,
      bookName: accepted.map((m) => m.bookName).filter((v, i, arr) => arr.indexOf(v) === i).join('、'),
      entryNames: accepted.map((m) => m.entry.name),
      estTokens: total,
    })
  }

  return {
    systemBlock: sys.length ? `【世界书 · 注入深度 system】\n${sys.join('\n\n')}` : '',
    userBlock: user.length ? `【世界书背景资料】\n${user.join('\n\n')}` : '',
    contextBlock: ctx.length ? `【附加上下文 · 世界书】\n${ctx.join('\n\n')}` : '',
    matched: accepted,
    estTokens: total,
  }
}

// ---------- 文件夹导入 ----------

export interface ImportedEntry {
  name: string
  content: string
  keywords: string[]
}

function suggestCategory(name: string, content: string): string {
  const t = name + content.slice(0, 200)
  if (/世界观|大陆|国家|历史|纪元|文明/.test(t)) return '世界观'
  if (/地点|城市|城镇|学院|学校|公寓|街区|地图/.test(t)) return '地点'
  if (/物品|道具|武器|装备|宝物/.test(t)) return '物品'
  if (/人设|档案|角色|profile|character/i.test(t)) return '人物档案'
  if (/剧情|章节|chapter|plot/i.test(t)) return '剧情'
  if (/文风|笔触|语调|style/i.test(t)) return '文风'
  return '设定集'
}

function parseStructuredJson(raw: string, fallbackName: string): ImportedEntry[] {
  const j = JSON.parse(raw) as unknown
  const arr: unknown[] = Array.isArray(j) ? j : [j]
  const out: ImportedEntry[] = []
  for (const item of arr) {
    const o = item as Record<string, unknown>
    const name = String(o.name ?? o.title ?? o.key ?? fallbackName).slice(0, 40)
    const content = String(o.content ?? o.text ?? o.value ?? o.entry ?? '').trim()
    if (!content) continue
    const kw = Array.isArray(o.keywords) ? o.keywords.map((k) => String(k)) : typeof o.keywords === 'string' ? o.keywords.split(/[,，、\s]+/) : []
    out.push({ name, content, keywords: kw.filter(Boolean).slice(0, 12) })
  }
  return out
}

function splitTxtToEntries(raw: string, fileName: string): ImportedEntry[] {
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return []
  // 按常见标题行分块：【】/ ## / ##数字. 等
  const blocks = text.split(/\n(?=\s*(?:【[^】{1,40}】|#{1,3}\s?\S|第[一二三四五六七八九十百千0-9]+[章节回][\s：:。]?))/)
  if (blocks.length <= 1) return [{ name: fileName.replace(/\.[a-z]+$/i, ''), content: text, keywords: [] }]
  const out: ImportedEntry[] = []
  for (const b of blocks) {
    const m = b.match(/^\s*(?:【([^】]+)】|#{1,3}\s*(.+?)\s*$|(第[一二三四五六七八九十百千0-9]+[章节回]))/)
    const name = (m?.[1] || m?.[2] || m?.[3] || '').trim().slice(0, 40)
    const content = b.replace(/^\s*【[^】]*】\s*|^\s*#{1,3}\s*.+\s*\n?/, '').trim()
    if (content) out.push({ name: name || `片段${out.length + 1}`, content, keywords: [] })
  }
  return out
}

// docx = zip；定位 word/document.xml 并 inflate，再剥 XML 标签
async function docxToText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const dec = new TextDecoder('latin1')
  const raw = dec.decode(buf)
  const sig = 'PK\x03\x04'
  let offset = raw.indexOf(sig)
  while (offset !== -1) {
    const compSize = Number(buf[offset + 18] | (buf[offset + 19] << 8) | (buf[offset + 20] << 16) | (buf[offset + 21] << 24))
    const nameLen = buf[offset + 26] | (buf[offset + 27] << 8)
    const extraLen = buf[offset + 28] | (buf[offset + 29] << 8)
    const name = raw.slice(offset + 30, offset + 30 + nameLen)
    const dataStart = offset + 30 + nameLen + extraLen
    if (name === 'word/document.xml' && compSize > 0) {
      const slice = buf.slice(dataStart, dataStart + compSize)
      const ds = new DecompressionStream('deflate-raw')
      const stream = new Blob([slice]).stream().pipeThrough(ds)
      const xml = await new Response(stream).text()
      return xml
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
    }
    offset = raw.indexOf(sig, dataStart + Math.max(compSize, 0))
  }
  throw new Error('docx 解析失败')
}

export async function parseWorldbookFiles(files: File[]): Promise<{ name: string; category: string; entries: ImportedEntry[] }[]> {
  const groups: { name: string; category: string; entries: ImportedEntry[] }[] = []
  for (const file of files) {
    const base = file.name.replace(/\.[a-z]+$/i, '')
    try {
      let entries: ImportedEntry[] = []
      if (/\.json$/i.test(file.name)) {
        entries = parseStructuredJson(await file.text(), base)
      } else if (/\.docx$/i.test(file.name)) {
        const text = await docxToText(file)
        entries = splitTxtToEntries(text, base)
      } else {
        entries = splitTxtToEntries(await file.text(), base)
      }
      if (entries.length === 0) continue
      const category = suggestCategory(file.name, entries[0].content)
      const existing = groups.find((g) => g.category === category && g.name === base)
      if (existing) existing.entries.push(...entries)
      else groups.push({ name: base, category, entries })
    } catch {
      throw new Error(`文件 ${file.name} 解析失败`)
    }
  }
  return groups
}
