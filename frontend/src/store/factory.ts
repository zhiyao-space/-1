import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppCategory = '效率' | '生活' | '娱乐' | '工具' | '自定义'
export const APP_CATEGORIES: AppCategory[] = ['效率', '生活', '娱乐', '工具', '自定义']

export type AppSize = 'small' | 'medium' | 'full'
export const APP_SIZES: { id: AppSize; label: string; hint: string }[] = [
  { id: 'small', label: '小组件', hint: '约 1/2 屏，适合卡片' },
  { id: 'medium', label: '应用卡片', hint: '约 3/4 屏' },
  { id: 'full', label: '全屏应用', hint: '整屏运行' },
]

export type AppSource = 'template' | 'custom' | 'ai'

export interface CustomApp {
  id: string
  name: string
  /** 单个 emoji 作为图标 */
  icon: string
  description: string
  html: string
  css: string
  js: string
  createdAt: number
  updatedAt: number
  category: AppCategory
  size: AppSize
  localStorageKey: string
  isVisibleOnDesktop: boolean
  source: AppSource
}

export interface CodeSnippet {
  id: string
  name: string
  type: 'html' | 'css' | 'js'
  code: string
  tags: string[]
  description: string
  createdAt: number
  lastUsed: number
}

export interface AppVersion {
  snapshotId: string
  name: string
  html: string
  css: string
  js: string
  createdAt: number
  message: string
}

export interface AiRecord {
  id: string
  prompt: string
  style: string
  size: AppSize
  createdAt: number
  appName: string | null
}

export type SandboxStatus = 'draft' | 'published' | 'archived'

export interface SandboxExperiment {
  id: string
  name: string
  html: string
  css: string
  js: string
  status: SandboxStatus
  createdAt: number
  updatedAt: number
}

export interface NewAppInput {
  name: string
  icon?: string
  description?: string
  html: string
  css: string
  js: string
  category?: AppCategory
  size?: AppSize
  source?: AppSource
  isVisibleOnDesktop?: boolean
}

const MAX_VERSIONS = 40

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

interface FactoryState {
  apps: CustomApp[]
  snippets: CodeSnippet[]
  versions: Record<string, AppVersion[]>
  aiHistory: AiRecord[]
  sandbox: SandboxExperiment[]
  /** 应用运行时的独立存储桥：`${appId}::${key}` -> 值 */
  appStorage: Record<string, string>
  lastOpenedAppId: string | null

  addApp: (input: NewAppInput) => CustomApp
  updateApp: (id: string, patch: Partial<CustomApp>) => void
  removeApp: (id: string) => void
  duplicateApp: (id: string) => CustomApp | null
  setDesktopVisible: (id: string, v: boolean) => void
  setLastOpened: (id: string | null) => void

  snapshot: (id: string, name?: string, message?: string) => void
  listVersions: (id: string) => AppVersion[]
  restoreVersion: (id: string, snapshotId: string) => boolean
  removeVersion: (id: string, snapshotId: string) => void

  addSnippet: (s: Omit<CodeSnippet, 'id' | 'createdAt' | 'lastUsed'>) => CodeSnippet
  updateSnippet: (id: string, patch: Partial<CodeSnippet>) => void
  removeSnippet: (id: string) => void
  touchSnippet: (id: string) => void

  addAiRecord: (r: Omit<AiRecord, 'id' | 'createdAt'>) => void

  addExperiment: (e: Omit<SandboxExperiment, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: SandboxStatus }) => SandboxExperiment
  updateExperiment: (id: string, patch: Partial<SandboxExperiment>) => void
  removeExperiment: (id: string) => void
  publishExperiment: (id: string) => CustomApp | null

  setAppStorage: (appId: string, key: string, value: string) => void
  removeAppStorage: (appId: string, key: string) => void
  getAppStorage: (appId: string) => Record<string, string>
  clearAppStorage: (appId: string) => void
  /** 清理模板 / AI 草稿等临时预览（appId 以 __ 开头）留下的存储 */
  cleanupPreviewStorage: () => void
}

export const useFactory = create<FactoryState>()(
  persist(
    (set, get) => ({
      apps: [],
      snippets: [],
      versions: {},
      aiHistory: [],
      sandbox: [],
      appStorage: {},
      lastOpenedAppId: null,

      addApp: (input) => {
        const id = uid('app')
        const app: CustomApp = {
          id,
          name: input.name.trim() || '未命名应用',
          icon: input.icon?.trim() || '🧩',
          description: input.description?.trim() || '',
          html: input.html,
          css: input.css,
          js: input.js,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          category: input.category ?? '自定义',
          size: input.size ?? 'medium',
          localStorageKey: `custom_${id}`,
          isVisibleOnDesktop: input.isVisibleOnDesktop ?? false,
          source: input.source ?? 'custom',
        }
        set((s) => ({
          apps: [app, ...s.apps],
          versions: { ...s.versions, [id]: [{ snapshotId: uid('ver'), name: '初版', html: app.html, css: app.css, js: app.js, createdAt: app.createdAt, message: '创建应用' }] },
        }))
        return app
      },

      updateApp: (id, patch) =>
        set((s) => ({
          apps: s.apps.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a)),
        })),

      removeApp: (id) =>
        set((s) => {
          const versions = { ...s.versions }
          delete versions[id]
          const appStorage = Object.fromEntries(Object.entries(s.appStorage).filter(([k]) => !k.startsWith(`${id}::`)))
          return {
            apps: s.apps.filter((a) => a.id !== id),
            versions,
            appStorage,
            lastOpenedAppId: s.lastOpenedAppId === id ? null : s.lastOpenedAppId,
          }
        }),

      duplicateApp: (id) => {
        const src = get().apps.find((a) => a.id === id)
        if (!src) return null
        return get().addApp({
          name: `${src.name} 副本`,
          icon: src.icon,
          description: src.description,
          html: src.html,
          css: src.css,
          js: src.js,
          category: src.category,
          size: src.size,
          source: src.source,
          isVisibleOnDesktop: false,
        })
      },

      setDesktopVisible: (id, v) =>
        set((s) => ({ apps: s.apps.map((a) => (a.id === id ? { ...a, isVisibleOnDesktop: v, updatedAt: Date.now() } : a)) })),

      setLastOpened: (lastOpenedAppId) => set({ lastOpenedAppId }),

      snapshot: (id, name, message) => {
        const app = get().apps.find((a) => a.id === id)
        if (!app) return
        set((s) => {
          const list = s.versions[id] ?? []
          const prev = list[list.length - 1]
          if (prev && prev.html === app.html && prev.css === app.css && prev.js === app.js) return {}
          const v: AppVersion = {
            snapshotId: uid('ver'),
            name: name?.trim() || `快照 ${list.length + 1}`,
            html: app.html,
            css: app.css,
            js: app.js,
            createdAt: Date.now(),
            message: message ?? '自动快照',
          }
          return { versions: { ...s.versions, [id]: [...list, v].slice(-MAX_VERSIONS) } }
        })
      },

      listVersions: (id) => get().versions[id] ?? [],

      restoreVersion: (id, snapshotId) => {
        const v = (get().versions[id] ?? []).find((x) => x.snapshotId === snapshotId)
        if (!v) return false
        set((s) => ({
          apps: s.apps.map((a) => (a.id === id ? { ...a, html: v.html, css: v.css, js: v.js, updatedAt: Date.now() } : a)),
        }))
        return true
      },

      removeVersion: (id, snapshotId) =>
        set((s) => ({ versions: { ...s.versions, [id]: (s.versions[id] ?? []).filter((v) => v.snapshotId !== snapshotId) } })),

      addSnippet: (s0) => {
        const snip: CodeSnippet = { ...s0, id: uid('snip'), createdAt: Date.now(), lastUsed: Date.now() }
        set((s) => ({ snippets: [snip, ...s.snippets] }))
        return snip
      },

      updateSnippet: (id, patch) =>
        set((s) => ({ snippets: s.snippets.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

      removeSnippet: (id) => set((s) => ({ snippets: s.snippets.filter((x) => x.id !== id) })),

      touchSnippet: (id) =>
        set((s) => ({ snippets: s.snippets.map((x) => (x.id === id ? { ...x, lastUsed: Date.now() } : x)) })),

      addAiRecord: (r) => set((s) => ({ aiHistory: [{ ...r, id: uid('ai'), createdAt: Date.now() }, ...s.aiHistory].slice(0, 60) })),

      addExperiment: (e) => {
        const exp: SandboxExperiment = {
          id: uid('exp'),
          name: e.name.trim() || '未命名实验',
          html: e.html,
          css: e.css,
          js: e.js,
          status: e.status ?? 'draft',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({ sandbox: [exp, ...s.sandbox] }))
        return exp
      },

      updateExperiment: (id, patch) =>
        set((s) => ({ sandbox: s.sandbox.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)) })),

      removeExperiment: (id) => set((s) => ({ sandbox: s.sandbox.filter((x) => x.id !== id) })),

      publishExperiment: (id) => {
        const exp = get().sandbox.find((x) => x.id === id)
        if (!exp) return null
        const app = get().addApp({
          name: exp.name,
          html: exp.html,
          css: exp.css,
          js: exp.js,
          source: 'custom',
          isVisibleOnDesktop: false,
        })
        set((s) => ({ sandbox: s.sandbox.map((x) => (x.id === id ? { ...x, status: 'published' } : x)) }))
        return app
      },

      setAppStorage: (appId, key, value) =>
        set((s) => ({ appStorage: { ...s.appStorage, [`${appId}::${key}`]: value } })),

      removeAppStorage: (appId, key) =>
        set((s) => {
          const next = { ...s.appStorage }
          delete next[`${appId}::${key}`]
          return { appStorage: next }
        }),

      getAppStorage: (appId) => {
        const out: Record<string, string> = {}
        const prefix = `${appId}::`
        for (const [k, v] of Object.entries(get().appStorage)) {
          if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v
        }
        return out
      },

      clearAppStorage: (appId) =>
        set((s) => ({
          appStorage: Object.fromEntries(Object.entries(s.appStorage).filter(([k]) => !k.startsWith(`${appId}::`))),
        })),

      cleanupPreviewStorage: () =>
        set((s) => ({
          appStorage: Object.fromEntries(Object.entries(s.appStorage).filter(([k]) => !k.split('::')[0].startsWith('__'))),
        })),
    }),
    { name: 'ksc:factory' }
  )
)

/** 组装成可直接放进 iframe 预览 / 导出的单文件 HTML */
export function buildAppHtml(app: { id?: string; name: string; html: string; css: string; js: string }, storage?: Record<string, string>): string {
  const styleTag = app.css.trim() ? `<style>\n${app.css}\n</style>` : ''
  const scriptTag = app.js.trim() ? `<script>\n${app.js}\n</script>` : ''
  const boot = storage
    ? `<script>try{window.__KSC_SEED__=${JSON.stringify(JSON.stringify(storage))}}catch(e){}</script>`
    : ''

  const base = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>${escapeHtml(app.name)}</title>
${styleTag}
${boot}
</head>
<body>
${app.html}
${scriptTag}
</body>
</html>`

  // 若用户 HTML 里已经写了完整文档结构，则只做合并，不再包壳
  if (/<html[\s>]/i.test(app.html)) {
    let doc = app.html
    if (styleTag) {
      if (/<\/head>/i.test(doc)) doc = doc.replace(/<\/head>/i, `${styleTag}\n</head>`)
      else doc = `${styleTag}\n${doc}`
    }
    if (scriptTag) {
      if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, `${scriptTag}\n</body>`)
      else doc = `${doc}\n${scriptTag}`
    }
    return doc
  }
  return base
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c))
}

/** 注入到预览里的 localStorage 桥：沙箱 iframe 无同源权限，用 postMessage 交给父窗口持久化 */
export const STORAGE_BRIDGE = `<script>
(function(){
  var mem = {};
  try { if (window.__KSC_SEED__) { var s = JSON.parse(window.__KSC_SEED__); for (var k in s) mem[k] = s[k]; } } catch(e) {}
  function post(k, v) { try { parent.postMessage({ __kscStore: 1, key: k, value: v }, '*') } catch(e) {} }
  var store = {
    getItem: function(k){ k = String(k); return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null },
    setItem: function(k, v){ k = String(k); v = String(v); mem[k] = v; post(k, v) },
    removeItem: function(k){ k = String(k); delete mem[k]; post(k, null) },
    clear: function(){ mem = {}; post(null, null) },
    key: function(i){ return Object.keys(mem)[i] || null },
    get length(){ return Object.keys(mem).length }
  };
  try { Object.defineProperty(window, 'localStorage', { value: store, configurable: true }) } catch(e) { window.localStorage = store }
  try { Object.defineProperty(window, 'sessionStorage', { value: store, configurable: true }) } catch(e) {}
})();
</script>`

/** 预览用：带独立存储桥的完整文档 */
export function buildPreviewDoc(app: { id?: string; name: string; html: string; css: string; js: string }, storage: Record<string, string>): string {
  const doc = buildAppHtml(app, storage)
  const bridge = STORAGE_BRIDGE.replace(
    '<script>',
    `<script>window.__KSC_SEED__=${JSON.stringify(JSON.stringify(storage))};</script><script>`
  )
  if (/<head[\s>]/i.test(doc)) return doc.replace(/<head([^>]*)>/i, `<head$1>${bridge}`)
  return `${bridge}${doc}`
}

/** 导出为可下载的单文件（含存储桥与初始数据） */
export function buildExportDoc(app: CustomApp): string {
  const storage = useFactory.getState().getAppStorage(app.id)
  return buildPreviewDoc(app, storage)
}