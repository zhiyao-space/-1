import { Lock, Smartphone, Cpu, Database } from 'lucide-react'
import { useUI, useToast } from '../../store/ui'

const FIXED_FONT = "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif"
const INK = '#f2f2f2'
const GRAY = '#9a9a9a'
const DIM = '#5c5c5c'

export default function AboutApp() {
  const lock = useUI((s) => s.lock)
  const push = useToast((s) => s.push)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FIXED_FONT }}>
      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '30px 0 18px' }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              border: '1px solid #3a3a3a',
              background: 'linear-gradient(160deg, #1c1c1c, #0d0d0d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(255,255,255,0.05) inset',
            }}
          >
            <Smartphone size={26} color="#d9d9d9" strokeWidth={1.4} />
          </div>

          <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
            <div style={{ fontSize: 13, color: DIM, letterSpacing: 2 }}>｡ﾟ+┈｡✧･ﾟ</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: 1, margin: '2px 0' }}>
              <span style={{ fontSize: 17, color: GRAY, marginRight: 6 }}>♡･ﾟ:</span>
              mulin 小手机
              <span style={{ fontSize: 17, color: GRAY, marginLeft: 6 }}>:ﾟ･✧┈｡+ﾟ｡</span>
            </div>
            <div style={{ fontSize: 13, color: DIM, letterSpacing: 2 }}>･✧･┈｡ﾟ+..｡ﾟ+┈✧･</div>
          </div>

          <div style={{ fontSize: 12, color: GRAY, letterSpacing: 0.5 }}>口袋里的一台玻璃小手机 · 黑灰白</div>
        </div>

        <div style={{ borderRadius: 14, border: '1px solid #2c2c2c', background: 'rgba(255,255,255,0.03)', padding: '4px 14px', marginBottom: 12 }}>
          <FixedRow label="机型" value="mulin 小手机 · 液态玻璃" />
          <FixedRow label="版本" value="v0.1.0" mono />
          <FixedRow label="设计语言" value="高级黑灰白 · Monochrome" />
          <FixedRow label="渲染字体" value="系统默认字重（锁定）" />
        </div>

        <div style={{ borderRadius: 14, border: '1px solid #2c2c2c', background: 'rgba(255,255,255,0.03)', padding: '4px 14px', marginBottom: 12 }}>
          <FixedRow label="外观系统" value="主题 / 字体 / 壁纸 / 图标" icon={<Smartphone size={13} color={GRAY} />} />
          <FixedRow label="数据存储" value="本机浏览器 · localStorage + IndexedDB" icon={<Database size={13} color={GRAY} />} />
          <FixedRow label="运行内核" value="纯前端 · 浏览器直连" icon={<Cpu size={13} color={GRAY} />} />
        </div>

        <div style={{ borderRadius: 14, border: '1px solid #2c2c2c', background: 'rgba(255,255,255,0.03)', padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: DIM, lineHeight: 1.9 }}>
            本机资料为设备铭牌，固定显示 mulin 小手机，与主页资料相互独立。头像、昵称、签名等个人信息在「主页」与「设置」中管理。
          </div>
        </div>

        <button
          className="pressable"
          style={{
            width: '100%',
            height: 46,
            borderRadius: 14,
            border: '1px solid #3a3a3a',
            background: 'linear-gradient(160deg, #232323, #141414)',
            color: INK,
            fontFamily: FIXED_FONT,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onClick={() => {
            lock()
            push('已锁屏', 'info')
          }}
        >
          <Lock size={14} color={INK} /> 锁定屏幕
        </button>

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 11, color: DIM, letterSpacing: 1.5 }}>
          ✧･ﾟ: *✧･ﾟ:* MULIN PHONE *:ﾟ･✧* :ﾟ･✧
        </div>
      </div>
    </div>
  )
}

function FixedRow({ label, value, icon, mono }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #232323' }}>
      <span style={{ fontSize: 13, color: GRAY, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, textAlign: 'right', fontSize: 13, color: INK, fontFamily: mono ? "'JetBrains Mono', monospace" : FIXED_FONT, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        {value}
        {icon}
      </span>
    </div>
  )
}
