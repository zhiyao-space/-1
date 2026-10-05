import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface EditorFile {
  name: string
  content: string
}

export interface EditorBackup {
  at: number
  label: string
  files: EditorFile[]
}

export const DEFAULT_FILES: EditorFile[] = [
  {
    name: 'index.html',
    content: `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>我的小应用</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main class="card">
      <h1>你好，空蚀纪</h1>
      <p id="tip">点下面的按钮试试。</p>
      <button id="btn">点我</button>
    </main>
    <script src="app.js"></script>
  </body>
</html>
`,
  },
  {
    name: 'style.css',
    content: `body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(120% 90% at 30% 0%, #1c1c22 0%, #0a0a0d 60%, #000 100%);
  color: #e0e0e0;
  font-family: system-ui, sans-serif;
}

.card {
  padding: 24px 22px;
  border-radius: 16px;
  background: linear-gradient(160deg, #1a1a1a, #0d0d10);
  border: 1px solid #2a2a2a;
  text-align: center;
}

h1 { margin: 0 0 8px; font-size: 20px; color: #fff; }
p { margin: 0 0 16px; color: #888; font-size: 14px; }

button {
  padding: 10px 22px;
  border: 1px solid #3a3a3a;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
}
`,
  },
  {
    name: 'app.js',
    content: `const btn = document.getElementById('btn')
const tip = document.getElementById('tip')
let n = 0
btn.addEventListener('click', () => {
  n += 1
  tip.textContent = '你点了 ' + n + ' 次。'
})
`,
  },
]

const MAX_BACKUPS = 20

interface EditorState {
  files: EditorFile[]
  activeName: string
  backups: EditorBackup[]
  setActive: (name: string) => void
  /** 保存指定文件（先自动备份） */
  saveFile: (name: string, content: string, label?: string) => void
  addFile: (name: string, content?: string) => boolean
  removeFile: (name: string) => void
  resetFile: (name: string) => void
  resetAll: () => void
  restoreLastBackup: () => void
}

function snapshot(files: EditorFile[]): EditorFile[] {
  return files.map((f) => ({ ...f }))
}

export const useEditor = create<EditorState>()(
  persist(
    (set, get) => ({
      files: snapshot(DEFAULT_FILES),
      activeName: 'index.html',
      backups: [],
      setActive: (activeName) => set({ activeName }),
      saveFile: (name, content, label = `保存 ${name}`) =>
        set((s) => ({
          files: s.files.map((f) => (f.name === name ? { ...f, content } : f)),
          backups: [...s.backups, { at: Date.now(), label, files: snapshot(s.files) }].slice(-MAX_BACKUPS),
        })),
      addFile: (name, content = '') => {
        const n = name.trim()
        if (!n) return false
        if (get().files.some((f) => f.name === n)) return false
        set((s) => ({
          files: [...s.files, { name: n, content }],
          activeName: n,
          backups: [...s.backups, { at: Date.now(), label: `新建 ${n}`, files: snapshot(s.files) }].slice(-MAX_BACKUPS),
        }))
        return true
      },
      removeFile: (name) =>
        set((s) => {
          if (s.files.length <= 1) return {}
          const files = s.files.filter((f) => f.name !== name)
          return {
            files,
            activeName: s.activeName === name ? files[0].name : s.activeName,
            backups: [...s.backups, { at: Date.now(), label: `删除 ${name}`, files: snapshot(s.files) }].slice(-MAX_BACKUPS),
          }
        }),
      resetFile: (name) =>
        set((s) => {
          const def = DEFAULT_FILES.find((f) => f.name === name)
          const fallback = def?.content ?? ''
          return {
            files: s.files.map((f) => (f.name === name ? { ...f, content: fallback } : f)),
            backups: [...s.backups, { at: Date.now(), label: `重置 ${name}`, files: snapshot(s.files) }].slice(-MAX_BACKUPS),
          }
        }),
      resetAll: () =>
        set((s) => ({
          files: snapshot(DEFAULT_FILES),
          activeName: 'index.html',
          backups: [...s.backups, { at: Date.now(), label: '重置全部', files: snapshot(s.files) }].slice(-MAX_BACKUPS),
        })),
      restoreLastBackup: () =>
        set((s) => {
          const last = s.backups[s.backups.length - 1]
          if (!last) return {}
          return {
            files: snapshot(last.files),
            activeName: last.files.some((f) => f.name === s.activeName) ? s.activeName : last.files[0]?.name ?? 'index.html',
            backups: s.backups.slice(0, -1),
          }
        }),
    }),
    { name: 'ksc:editor' }
  )
)

/** 把生成的代码插入到对应文件（html/css/js 各自归位，其它语言新建片段文件） */
export function insertCodeIntoProject(lang: string, code: string): string {
  const l = lang.toLowerCase()
  const map: Record<string, string> = {
    html: 'index.html',
    css: 'style.css',
    js: 'app.js',
    javascript: 'app.js',
    ts: 'app.js',
    typescript: 'app.js',
    json: 'snippet.json',
  }
  const editor = useEditor.getState()
  const target = map[l] ?? `snippet.${l || 'txt'}`
  const existing = editor.files.find((f) => f.name === target)
  const stamp = new Date().toLocaleString('zh-CN', { hour12: false })
  const block = `\n/* [小鬼生成] ${stamp} */\n${code}\n`
  if (existing) {
    editor.saveFile(target, `${existing.content}\n${block}`, `插入小鬼代码 → ${target}`)
  } else {
    editor.addFile(target, block)
  }
  return target
}