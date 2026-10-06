import { createContext, useContext } from 'react'
import type { CityTabKey } from '../../store/mulCity'

/* ============================================================
   Mul市 · 页面导航
   Tab 内的详情页（人物/地标/演出/票/事件/新闻/微博/个股）
   统一由 CityApp 以浮层渲染
   ============================================================ */

export type CityRoute =
  | { view: 'person'; id: string }
  | { view: 'landmark'; id: string }
  | { view: 'show'; id: string }
  | { view: 'transport'; id: string }
  | { view: 'showticket'; id: string }
  | { view: 'event'; id: string }
  | { view: 'gameevent'; id: string }
  | { view: 'news'; id: string }
  | { view: 'post'; id: string }
  | { view: 'stock'; id: string }
  | { view: 'space'; id: string }
  | { view: 'community'; id: string }
  | { view: 'profile'; id: string }

export interface CityNav {
  push: (route: CityRoute) => void
  pop: () => void
  close: () => void
  /** 当前浮层栈 */
  stack: CityRoute[]
  /** 切换底部 Tab（用于「办理出行票」「分享到微博」等跳转） */
  goTab: (tab: CityTabKey) => void
}

export const CityNavContext = createContext<CityNav | null>(null)

export function useCityNav(): CityNav {
  const ctx = useContext(CityNavContext)
  if (!ctx) throw new Error('useCityNav 必须在 CityApp 内使用')
  return ctx
}
