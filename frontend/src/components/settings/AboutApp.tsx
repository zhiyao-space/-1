import { useUI, useToast } from '../../store/ui'
import { SectionCard, Row } from '../common'
import { Lock, Smartphone, Cpu, Sparkles } from 'lucide-react'

// 关于页品牌信息锁死，与用户主页资料完全隔离，任何主页修改都不会同步到这里
const MULIN_NAME = '✧･ﾟmulin小手机･ﾟ✧'
const MULIN_SUB = '｡ﾟ+︎  coquettish black & white  ｡ﾟ+︎'
const MULIN_SIGNATURE = '˗ˏˋ 黑白灰的小世界 ˎˊ˗'

export default function AboutApp() {
  const lock = useUI((s) => s.lock)
  const push = useToast((s) => s.push)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 0 20px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'linear-gradient(145deg, #1c1c1c, #000)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 18px rgba(255,255,255,0.06)',
            }}
          >
            <Smartphone size={28} color="#e5e5e5" strokeWidth={1.5} />
          </div>
          <div
            className="app-name"
            style={{
              fontSize: 'calc(26px * var(--fs-scale))',
              letterSpacing: '0.06em',
              background: 'linear-gradient(90deg, #9c9c9c 0%, #ffffff 45%, #6f6f6f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 14px rgba(255,255,255,0.12)',
            }}
          >
            {MULIN_NAME}
          </div>
          <div className="mono fs-micro" style={{ color: '#8a8a8a', letterSpacing: '0.14em' }}>
            {MULIN_SUB}
          </div>
          <div className="fs-aux" style={{ color: '#a8a8a8' }}>
            {MULIN_SIGNATURE}
          </div>
        </div>

        <SectionCard title="版本信息">
          <Row
            label="机型"
            right={
              <span className="fs-aux" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#d4d4d4' }}>
                <Sparkles size={12} color="#8a8a8a" /> mulin 小手机 · 锁定版
              </span>
            }
          />
          <Row label="版本" right={<span className="mono fs-aux" style={{ color: 'var(--text-secondary)' }}>v0.1.0 · 批次 1</span>} />
          <Row label="开发者" right={<span className="fs-aux" style={{ color: 'var(--text-secondary)' }}>MonkeyCode AI</span>} />
          <Row label="设计语言" right={<span className="fs-aux" style={{ color: 'var(--text-secondary)' }}>液态玻璃 · 高级黑灰白</span>} />
        </SectionCard>

        <SectionCard title="本机状态">
          <Row
            label="外观系统"
            sub="主题 / 字体 / 壁纸 / 图标"
            right={<Smartphone size={15} color="var(--text-secondary)" />}
          />
          <Row
            label="数据存储"
            sub="localStorage + IndexedDB 本地保存"
            right={<Cpu size={15} color="var(--text-secondary)" />}
          />
        </SectionCard>

        <SectionCard>
          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={() => {
              lock()
              push('已锁屏', 'info')
            }}
          >
            <Lock size={14} /> 锁定屏幕
          </button>
        </SectionCard>
      </div>
    </div>
  )
}
