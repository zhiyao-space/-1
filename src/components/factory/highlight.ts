/** 轻量语法高亮：按规则逐字符切词，避免破坏转义与偏移量 */

interface Rule {
  re: RegExp
  cls: string
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c))
}

const JS_RULES: Rule[] = [
  { re: /^\/\/[^\n]*/y, cls: 'tk-com' },
  { re: /^\/\*[\s\S]*?\*\//y, cls: 'tk-com' },
  { re: /^'(?:\\.|[^'\\])*'/y, cls: 'tk-str' },
  { re: /^"(?:\\.|[^"\\])*"/y, cls: 'tk-str' },
  { re: /^`(?:\\.|[^`\\])*`/y, cls: 'tk-str' },
  {
    re: /^\b(?:const|let|var|function|return|if|else|for|while|new|class|try|catch|finally|typeof|instanceof|true|false|null|undefined|this|await|async|of|in|break|continue|switch|case|default|throw|delete|void|do|export|import|from|extends|super|yield|static|get|set)\b/y,
    cls: 'tk-key',
  },
  { re: /^\b\d+(?:\.\d+)?\b/y, cls: 'tk-num' },
]

const CSS_RULES: Rule[] = [
  { re: /^\/\*[\s\S]*?\*\//y, cls: 'tk-com' },
  { re: /^[.#][-a-zA-Z0-9_:>\s.,#[\]=()"'*]+(?=\{)/y, cls: 'tk-tag' },
  { re: /^:[a-zA-Z-]+/y, cls: 'tk-key' },
  { re: /^@[a-zA-Z-]+/y, cls: 'tk-key' },
  { re: /^[-a-zA-Z]+(?=\s*:)/y, cls: 'tk-attr' },
  { re: /^#[0-9a-fA-F]{3,8}\b/y, cls: 'tk-num' },
  { re: /^\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?\b/y, cls: 'tk-num' },
  { re: /^'(?:\\.|[^'\\])*'|^"(?:\\.|[^"\\])*"/y, cls: 'tk-str' },
]

const HTML_RULES: Rule[] = [
  { re: /^<!--[\s\S]*?-->/y, cls: 'tk-com' },
  { re: /^<!doctype[^>]*>/iy, cls: 'tk-com' },
  { re: /^<\/?[a-zA-Z][-a-zA-Z0-9]*/y, cls: 'tk-tag' },
  { re: /^\s[a-zA-Z-]+(?==)/y, cls: 'tk-attr' },
  { re: /^="[^"]*"|^='[^']*'/y, cls: 'tk-str' },
  { re: /^>/y, cls: 'tk-tag' },
]

export function highlight(code: string, lang: 'html' | 'css' | 'js'): string {
  const rules = lang === 'css' ? CSS_RULES : lang === 'html' ? HTML_RULES : JS_RULES
  let out = ''
  let i = 0
  while (i < code.length) {
    let hit = false
    for (const r of rules) {
      r.re.lastIndex = i
      const m = r.re.exec(code)
      if (m && m[0]) {
        out += `<span class="${r.cls}">${esc(m[0])}</span>`
        i += m[0].length
        hit = true
        break
      }
    }
    if (!hit) {
      out += esc(code[i])
      i += 1
    }
  }
  return out
}

/** 简单格式化：按 {} ; 换行缩进（HTML/CSS/JS 通用，够用即可） */
export function formatCode(code: string, lang: 'html' | 'css' | 'js'): string {
  if (lang === 'html') {
    return code
      .replace(/></g, '>\n<')
      .replace(/\n\s*\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .reduce<{ out: string[]; depth: number }>(
        (acc, raw) => {
          const line = raw
          if (/^<\//.test(line)) acc.depth = Math.max(0, acc.depth - 1)
          acc.out.push('  '.repeat(acc.depth) + line)
          if (/^<[^/!][^>]*[^/]>$/.test(line)) acc.depth += 1
          return acc
        },
        { out: [], depth: 0 }
      ).out.join('\n')
  }

  const indentUnit = '  '
  let depth = 0
  const src = code.replace(/\s*([{};])\s*/g, '$1\n')
  const lines = src
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const out: string[] = []
  for (const line of lines) {
    if (/^[})\]]/.test(line)) depth = Math.max(0, depth - 1)
    out.push(indentUnit.repeat(depth) + line)
    if (/[{[(]$/.test(line)) depth += 1
  }
  return out.join('\n')
}