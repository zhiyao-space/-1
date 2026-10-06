import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 可自定义的全局文案 */
export interface CopyTexts {
  /** 桌面顶部签名 */
  signature: string
  /** 独白卡标题 */
  monologueTitle: string
  /** 独白卡内容（留空则从世界书随机抽取） */
  monologueContent: string
  /** 最近互动标题 */
  recentTitle: string
  /** 最近互动空状态 */
  emptyRecent: string
  /** 独白卡空状态 */
  emptyMonologue: string
  /** 图标标签：按 app id 映射 */
  appLabels: Record<string, string>
}

export const DEFAULT_COPY: CopyTexts = {
  signature: '今天也不想见人。',
  monologueTitle: '今日独白',
  monologueContent: '',
  recentTitle: '你是我仰慕的光',
  emptyRecent: '还没有互动记录',
  emptyMonologue: '……',
  appLabels: {
    chat: '聊天',
    forum: '论坛',
    music: '音乐',
    social: 'mu社区',
    mall: 'mulin 商城',
    city: 'Mul市',
    snoop: '查手机',
    settings: '设置',
    sms: '短信',
    phone: '电话',
    xiaogui: '小鬼',
  },
}

interface CopyState {
  texts: CopyTexts
  setText: <K extends keyof CopyTexts>(key: K, value: CopyTexts[K]) => void
  setAppLabel: (id: string, value: string) => void
  reset: () => void
}

export const useCopy = create<CopyState>()(
  persist(
    (set) => ({
      texts: { ...DEFAULT_COPY, appLabels: { ...DEFAULT_COPY.appLabels } },
      setText: (key, value) => set((s) => ({ texts: { ...s.texts, [key]: value } })),
      setAppLabel: (id, value) =>
        set((s) => ({ texts: { ...s.texts, appLabels: { ...s.texts.appLabels, [id]: value } } })),
      reset: () => set({ texts: { ...DEFAULT_COPY, appLabels: { ...DEFAULT_COPY.appLabels } } }),
    }),
    {
      name: 'ksc:copy',
      version: 1,
      // 旧版默认标题「最近互动」升级为新标题（用户自定义过的文案保持不变）
      migrate: (persisted) => {
        const state = persisted as CopyState | undefined
        if (state?.texts?.recentTitle === '最近互动') {
          return { ...state, texts: { ...state.texts, recentTitle: DEFAULT_COPY.recentTitle } }
        }
        return persisted as CopyState
      },
    }
  )
)

/** 取图标标签（缺省回退到默认） */
export function appLabel(id: string): string {
  const labels = useCopy.getState().texts.appLabels
  return labels[id]?.trim() || DEFAULT_COPY.appLabels[id] || id
}