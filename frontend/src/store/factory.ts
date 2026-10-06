import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useProfile } from './profile'

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
  /** lucide 图标名 */
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

/** 公用库应用：localStorage 全局持久化，所有账号/档案都可安装使用 */
export interface SharedApp {
  /** 公用库内的唯一 id（shared_xxx） */
  id: string
  /** 发布时来源应用在本地的 id，用于幂等更新 */
  originId: string
  name: string
  icon: string
  description: string
  html: string
  css: string
  js: string
  category: AppCategory
  size: AppSize
  publisher: string
  publishedAt: number
  installs: number
}

/** 公用库组件（代码片段），结构与 CodeSnippet 一致并附加发布元数据 */
export interface SharedSnippet {
  id: string
  originId: string
  name: string
  type: 'html' | 'css' | 'js'
  code: string
  tags: string[]
  description: string
  publisher: string
  publishedAt: number
  installs: number
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

/** 发布者标识：优先用当前档案昵称，未设置时回退为匿名 */
function currentPublisher(): string {
  const nickname = useProfile.getState().profile.nickname?.trim()
  return nickname || '匿名用户'
}

function isStr(v: unknown): v is string {
  return typeof v === 'string'
}

/** 校验收到的公用库应用数据，形状不对返回 null（用于导入，永不抛错） */
function normalizeSharedApp(raw: unknown): SharedApp | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isStr(r.name) || !isStr(r.html) || !isStr(r.css) || !isStr(r.js)) return null
  const id = isStr(r.id) && r.id ? r.id : uid('shared')
  return {
    id,
    originId: isStr(r.originId) ? r.originId : '',
    name: r.name,
    icon: isStr(r.icon) && r.icon ? r.icon : 'Puzzle',
    description: isStr(r.description) ? r.description : '',
    html: r.html,
    css: r.css,
    js: r.js,
    category: (APP_CATEGORIES as string[]).includes(r.category as string) ? (r.category as AppCategory) : '自定义',
    size: r.size === 'small' || r.size === 'medium' || r.size === 'full' ? (r.size as AppSize) : 'medium',
    publisher: isStr(r.publisher) && r.publisher ? r.publisher : '匿名用户',
    publishedAt: typeof r.publishedAt === 'number' ? r.publishedAt : Date.now(),
    installs: typeof r.installs === 'number' && r.installs >= 0 ? Math.floor(r.installs) : 0,
  }
}

/** 校验公用库组件数据，形状不对返回 null */
function normalizeSharedSnippet(raw: unknown): SharedSnippet | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isStr(r.name) || !isStr(r.code)) return null
  const type = r.type === 'html' || r.type === 'css' || r.type === 'js' ? r.type : 'css'
  const id = isStr(r.id) && r.id ? r.id : uid('shared')
  return {
    id,
    originId: isStr(r.originId) ? r.originId : '',
    name: r.name,
    type,
    code: r.code,
    tags: Array.isArray(r.tags) ? r.tags.filter(isStr) : [],
    description: isStr(r.description) ? r.description : '',
    publisher: isStr(r.publisher) && r.publisher ? r.publisher : '匿名用户',
    publishedAt: typeof r.publishedAt === 'number' ? r.publishedAt : Date.now(),
    installs: typeof r.installs === 'number' && r.installs >= 0 ? Math.floor(r.installs) : 0,
  }
}

interface FactoryState {
  apps: CustomApp[]
  snippets: CodeSnippet[]
  versions: Record<string, AppVersion[]>
  aiHistory: AiRecord[]
  sandbox: SandboxExperiment[]
  /** 公用库：全局持久化，所有账号可见 */
  sharedApps: SharedApp[]
  sharedSnippets: SharedSnippet[]
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

  /** 把本地应用发布到公用库（按来源 id / 名称幂等，已发布则更新内容） */
  publishAppToLibrary: (appId: string) => SharedApp | null
  /** 从公用库移除（取消发布）应用 */
  unpublishAppFromLibrary: (sharedId: string) => void
  removeSharedApp: (sharedId: string) => void
  /** 安装公用库应用到「我的应用」，返回新应用 */
  installSharedApp: (sharedId: string) => CustomApp | null

  /** 把本地片段发布到公用库（按来源 id / 名称幂等） */
  publishSnippetToLibrary: (snippetId: string) => SharedSnippet | null
  unpublishSnippetFromLibrary: (sharedId: string) => void
  removeSharedSnippet: (sharedId: string) => void
  /** 安装公用库组件到「我的片段」，换新 id 避免冲突 */
  installSharedSnippet: (sharedId: string) => CodeSnippet | null

  /** 导出公用库为 JSON 字符串（含应用与组件） */
  exportLibrary: () => string
  /** 导入公用库 JSON，按 id / 名称去重合并；格式非法返回 false，永不抛错 */
  importLibrary: (json: string) => boolean

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
      sharedApps: [],
      sharedSnippets: [],
      appStorage: {},
      lastOpenedAppId: null,

      addApp: (input) => {
        const id = uid('app')
        const app: CustomApp = {
          id,
          name: input.name.trim() || '未命名应用',
          icon: input.icon?.trim() || 'Puzzle',
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

      publishAppToLibrary: (appId) => {
        const app = get().apps.find((a) => a.id === appId)
        if (!app) return null
        const existing = get().sharedApps.find((s) => s.originId === app.id || s.name === app.name)
        const shared: SharedApp = {
          id: existing?.id ?? uid('shared'),
          originId: app.id,
          name: app.name,
          icon: app.icon,
          description: app.description,
          html: app.html,
          css: app.css,
          js: app.js,
          category: app.category,
          size: app.size,
          publisher: existing?.publisher ?? currentPublisher(),
          publishedAt: Date.now(),
          installs: existing?.installs ?? 0,
        }
        set((s) => ({
          sharedApps: existing
            ? s.sharedApps.map((x) => (x.id === existing.id ? shared : x))
            : [shared, ...s.sharedApps],
        }))
        return shared
      },

      unpublishAppFromLibrary: (sharedId) =>
        set((s) => ({ sharedApps: s.sharedApps.filter((x) => x.id !== sharedId) })),

      removeSharedApp: (sharedId) =>
        set((s) => ({ sharedApps: s.sharedApps.filter((x) => x.id !== sharedId) })),

      installSharedApp: (sharedId) => {
        const shared = get().sharedApps.find((x) => x.id === sharedId)
        if (!shared) return null
        const app = get().addApp({
          name: shared.name,
          icon: shared.icon,
          description: shared.description,
          html: shared.html,
          css: shared.css,
          js: shared.js,
          category: shared.category,
          size: shared.size,
          source: 'custom',
          isVisibleOnDesktop: false,
        })
        set((s) => ({ sharedApps: s.sharedApps.map((x) => (x.id === sharedId ? { ...x, installs: x.installs + 1 } : x)) }))
        return app
      },

      publishSnippetToLibrary: (snippetId) => {
        const snip = get().snippets.find((x) => x.id === snippetId)
        if (!snip) return null
        const existing = get().sharedSnippets.find((s) => s.originId === snip.id || s.name === snip.name)
        const shared: SharedSnippet = {
          id: existing?.id ?? uid('shared'),
          originId: snip.id,
          name: snip.name,
          type: snip.type,
          code: snip.code,
          tags: snip.tags,
          description: snip.description,
          publisher: existing?.publisher ?? currentPublisher(),
          publishedAt: Date.now(),
          installs: existing?.installs ?? 0,
        }
        set((s) => ({
          sharedSnippets: existing
            ? s.sharedSnippets.map((x) => (x.id === existing.id ? shared : x))
            : [shared, ...s.sharedSnippets],
        }))
        return shared
      },

      unpublishSnippetFromLibrary: (sharedId) =>
        set((s) => ({ sharedSnippets: s.sharedSnippets.filter((x) => x.id !== sharedId) })),

      removeSharedSnippet: (sharedId) =>
        set((s) => ({ sharedSnippets: s.sharedSnippets.filter((x) => x.id !== sharedId) })),

      installSharedSnippet: (sharedId) => {
        const shared = get().sharedSnippets.find((x) => x.id === sharedId)
        if (!shared) return null
        const snip: CodeSnippet = {
          id: uid('snip'),
          name: shared.name,
          type: shared.type,
          code: shared.code,
          tags: [...shared.tags],
          description: shared.description,
          createdAt: Date.now(),
          lastUsed: Date.now(),
        }
        set((s) => ({
          snippets: [snip, ...s.snippets],
          sharedSnippets: s.sharedSnippets.map((x) => (x.id === sharedId ? { ...x, installs: x.installs + 1 } : x)),
        }))
        return snip
      },

      exportLibrary: () =>
        JSON.stringify(
          { version: 1, exportedAt: Date.now(), sharedApps: get().sharedApps, sharedSnippets: get().sharedSnippets },
          null,
          2
        ),

      importLibrary: (json) => {
        try {
          const data = JSON.parse(json) as { sharedApps?: unknown; sharedSnippets?: unknown } | null
          if (!data || typeof data !== 'object') return false
          const inApps = Array.isArray(data.sharedApps) ? data.sharedApps : []
          const inSnippets = Array.isArray(data.sharedSnippets) ? data.sharedSnippets : []
          const cur = get()
          let valid = 0

          const nextApps = [...cur.sharedApps]
          for (const raw of inApps) {
            const item = normalizeSharedApp(raw)
            if (!item) continue
            valid += 1
            const idx = nextApps.findIndex((x) => x.id === item.id || x.name === item.name)
            if (idx >= 0) {
              const old = nextApps[idx]
              nextApps[idx] = { ...old, ...item, id: old.id, installs: Math.max(old.installs, item.installs) }
            } else {
              nextApps.push(item)
            }
          }

          const nextSnippets = [...cur.sharedSnippets]
          for (const raw of inSnippets) {
            const item = normalizeSharedSnippet(raw)
            if (!item) continue
            valid += 1
            const idx = nextSnippets.findIndex((x) => x.id === item.id || x.name === item.name)
            if (idx >= 0) {
              const old = nextSnippets[idx]
              nextSnippets[idx] = { ...old, ...item, id: old.id, installs: Math.max(old.installs, item.installs) }
            } else {
              nextSnippets.push(item)
            }
          }

          if (valid === 0) return false
          set({ sharedApps: nextApps, sharedSnippets: nextSnippets })
          return true
        } catch {
          return false
        }
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