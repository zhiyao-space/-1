import { ReactNode, useEffect, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useToast } from '../store/ui'
import { cropImage, compressImage, type CropState } from '../lib/image'
import { putBlob } from '../lib/idb'
import { useBlobURL } from './WallpaperLayer'

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 320,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="no-select"
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 900,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '88%',
          maxHeight: '78%',
          overflowY: 'auto',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          animation: 'modalIn 200ms ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="nav-title fs-h2" style={{ color: 'var(--text-primary)' }}>
            {title}
          </div>
          <button className="pressable" onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ToastHost() {
  const toasts = useToast((s) => s.toasts)
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 84,
        transform: 'translateX(-50%)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass timestamp"
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            color: t.kind === 'error' ? '#ff8a8a' : 'var(--text-primary)',
            animation: 'toastIn 200ms ease-out',
            whiteSpace: 'nowrap',
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="pressable"
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--bg-button)',
        border: '1px solid rgba(255,255,255,0.12)',
        position: 'relative',
        transition: 'background var(--transition-fast)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: checked ? '#000' : 'var(--text-secondary)',
          transition: 'left var(--transition-fast)',
        }}
      />
    </button>
  )
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span className="mono fs-aux" style={{ color: 'var(--text-primary)' }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function EmptyState({ icon, text, hint }: { icon: ReactNode; text: string; hint?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '48px 24px',
        color: 'var(--text-tertiary)',
        textAlign: 'center',
      }}
    >
      <div style={{ opacity: 0.5 }}>{icon}</div>
      <div className="fs-body">{text}</div>
      {hint && <div className="fs-aux" style={{ color: 'var(--text-disabled)' }}>{hint}</div>}
    </div>
  )
}

export function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 14 }}>
      {title && (
        <div className="nav-title fs-h2" style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

export function Row({
  label,
  sub,
  right,
  onClick,
}: {
  label: string
  sub?: string
  right?: ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={onClick ? 'pressable' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div>
        <div className="fs-body" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        {sub && (
          <div className="fs-aux" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {right}
    </div>
  )
}

const CROP_ASPECTS: { value: number | null; label: string }[] = [
  { value: null, label: '自由' },
  { value: 3, label: '3:1 宽幅' },
  { value: 16 / 7, label: '16:7' },
  { value: 2, label: '2:1' },
  { value: 1, label: '1:1' },
]

export function ImageCropModal({
  open,
  src,
  title = '剪切背景图',
  onConfirm,
  onClose,
}: {
  open: boolean
  src: Blob | null
  title?: string
  onConfirm: (blob: Blob) => void
  onClose: () => void
}) {
  const [aspect, setAspect] = useState<number | null>(3)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !src) return
    let alive = true
    const t = setTimeout(async () => {
      try {
        const blob = await cropImage(src, { aspect, scale, offsetX: offset.x, offsetY: offset.y }, 1280)
        if (alive) setPreview(URL.createObjectURL(blob))
      } catch {
        if (alive) setPreview(null)
      }
    }, 120)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [open, src, aspect, scale, offset])

  if (!open) return null

  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div className="glass" style={{ borderRadius: 16, padding: 16, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="nav-title fs-h3" style={{ color: 'var(--text-primary)', marginBottom: 10 }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div
            style={{
              width: '100%',
              aspectRatio: aspect ? String(aspect) : '4 / 3',
              maxHeight: 180,
              borderRadius: 12,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {preview ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill' }} /> : <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>生成预览中…</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {CROP_ASPECTS.map((a) => (
            <button
              key={a.label}
              className="btn btn-sm pressable"
              onClick={() => setAspect(a.value)}
              style={{
                background: aspect === a.value ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                color: aspect === a.value ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>缩放 {scale.toFixed(2)}x</div>
        <input type="range" min={1} max={3} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: '100%' }} />
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 4, marginTop: 8 }}>水平位置 {(offset.x * 100).toFixed(0)}%</div>
        <input type="range" min={-0.5} max={0.5} step={0.02} value={offset.x} onChange={(e) => setOffset((o) => ({ ...o, x: Number(e.target.value) }))} style={{ width: '100%' }} />
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 4, marginTop: 8 }}>垂直位置 {(offset.y * 100).toFixed(0)}%</div>
        <input type="range" min={-0.5} max={0.5} step={0.02} value={offset.y} onChange={(e) => setOffset((o) => ({ ...o, y: Number(e.target.value) }))} style={{ width: '100%' }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn pressable" style={{ flex: 1 }} onClick={onClose}>取消</button>
          <button
            className="btn btn-accent pressable"
            style={{ flex: 1 }}
            onClick={async () => {
              if (!src) return
              const blob = await cropImage(src, { aspect, scale, offsetX: offset.x, offsetY: offset.y }, 1280)
              onConfirm(blob)
            }}
          >
            使用这张
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   统一的「从相册 / 文件导入图片」能力
   头像与封面通用：压缩后存入 IndexedDB，只保存 blob id
   ============================================================ */

/** 打开系统相册 / 文件选择器，返回选中的图片文件 */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

/**
 * 头像 / 封面选择器。
 * avatar：圆形，选完直接压缩存库
 * cover：宽幅，选完先裁剪再存库
 */
export function ImageField({
  value,
  onChange,
  kind = 'avatar',
  size,
  radius,
}: {
  /** IndexedDB 中的图片 id */
  value: string | null | undefined
  onChange: (id: string | null) => void
  kind?: 'avatar' | 'cover'
  /** 头像直径 */
  size?: number
  /** 封面圆角 */
  radius?: number
}) {
  const url = useBlobURL(value)
  const push = useToast((s) => s.push)
  const [raw, setRaw] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = async () => {
    const file = await pickImageFile()
    if (!file) return
    if (kind === 'cover') {
      setRaw(file)
      return
    }
    setBusy(true)
    try {
      onChange(await putBlob(await compressImage(file, 512)))
      push('头像已更新')
    } finally {
      setBusy(false)
    }
  }

  if (kind === 'cover') {
    return (
      <>
        <button
          className="pressable"
          onClick={pick}
          disabled={busy}
          style={{
            position: 'relative',
            width: '100%',
            height: 132,
            display: 'block',
            overflow: 'hidden',
            borderRadius: radius ?? 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px dashed rgba(255,255,255,0.18)',
          }}
        >
          {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          {!url && (
            <span style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)' }}>
              <ImagePlus size={20} />
              <span className="fs-micro">从相册导入封面</span>
            </span>
          )}
          {value && (
            <span
              className="pressable"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
                push('已清除封面', 'info')
              }}
              style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8a8a' }}
            >
              <X size={14} />
            </span>
          )}
        </button>

        <ImageCropModal
          open={!!raw}
          src={raw}
          title="裁剪封面"
          onClose={() => setRaw(null)}
          onConfirm={async (blob) => {
            onChange(await putBlob(blob))
            push('封面已更新')
            setRaw(null)
          }}
        />
      </>
    )
  }

  const s = size ?? 72
  return (
    <button
      className="pressable"
      onClick={pick}
      disabled={busy}
      title="从相册导入头像"
      style={{
        position: 'relative',
        width: s,
        height: s,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'var(--bg-panel)',
        border: '1px solid rgba(255,255,255,0.16)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
      }}
    >
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImagePlus size={Math.round(s * 0.3)} />}
      {value && (
        <span
          className="pressable"
          onClick={(e) => {
            e.stopPropagation()
            onChange(null)
            push('已清除头像', 'info')
          }}
          style={{ position: 'absolute', right: 0, bottom: 0, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8a8a' }}
        >
          <X size={11} />
        </span>
      )}
    </button>
  )
}
