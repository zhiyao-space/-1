import type { CSSProperties } from 'react'
import { resolveGradient, shadowCss, type ModuleStyles } from '../../store/desktopModules'

/** 桌面增强模块统一「暗黑厚模块」卡片样式：渐变背景 + 描边 + 圆角 + 阴影 + 间距 */
export function cardStyle(styles: ModuleStyles): CSSProperties {
  const { from, to } = resolveGradient(styles)
  return {
    background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
    border: '1px solid #2a2a2a',
    borderRadius: styles.borderRadius,
    boxShadow: shadowCss(styles.shadow),
    marginBottom: styles.spacing,
    overflow: 'hidden',
  }
}