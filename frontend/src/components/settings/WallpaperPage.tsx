import { useEffect, useRef, useState } from 'react'
import { Upload, Trash2, Check } from 'lucide-react'
import { useSettings } from '../../store/settings'
import { useToast } from '../../store/ui'
import { SectionCard, SliderRow } from '../common'
import { WallpaperLayer, useBlobURL } from '../WallpaperLayer'
import { compressImage, cropImage, CropState } from '../../lib/image'
import { putBlob } from '../../lib/idb'

type Slot = 'desktop' | 'lock' | 'chat'

const SLOT_NAMES: Record<Slot, string> = { desktop: '桌面壁纸', lock: '锁屏壁纸', chat: '聊天背景' }

export default function WallpaperPage() {
  const settings = useSettings()
  const push = useToast((s) => s.push)
  const [cropFor, setCropFor] = useState<{ slot: Slot; src: Blob } | null>(null)

  const pickFor = async (slot: Slot) => {
    return new Promise<void>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return resolve()
        try {
          const compressed = await compressImage(file, 1920)
          setCropFor({ slot, src: compressed })
        } catch {
          push('图片读取失败', 'error')
        }
        resolve()
      }
      input.click()
    })
  }

  return (
    <>
      <SectionCard title="壁纸设置">
        <div className="fs-aux" style={{ color: 'var(--text-tertiary)', marginBottom: 12 }}>
          三类壁纸相互独立，上传后可裁剪、加滤镜
        </div>
        {(['desktop', 'lock', 'chat'] as Slot[]).map((slot) => (
          <SlotRow
            key={slot}
            slot={slot}
            onPick={() => pickFor(slot)}
            onClear={() => {
              settings.setWallpaper(slot, null)
              push(`已清除${SLOT_NAMES[slot]}`, 'info')
            }}
          />
        ))}
      </SectionCard>

      {cropFor && (
        <CropModal
          src={cropFor.src}
          title={`裁剪 · ${SLOT_NAMES[cropFor.slot]}`}
          onCancel={() => setCropFor(null)}
          onApply={async (blob) => {
            const id = await putBlob(blob)
            settings.setWallpaper(cropFor.slot, id)
            setCropFor(null)
            push(`${SLOT_NAMES[cropFor.slot]}已应用`)
          }}
        />
      )}
    </>
  )
}

function SlotRow({ slot, onPick, onClear }: { slot: Slot; onPick: () => void; onClear: () => void }) {
  const settings = useSettings()
  const id = settings.wallpapers[slot]
  const fx = settings.wallpaperFx[slot]
  const setFx = (patch: Partial<{ dark: number; blur: number }>) => settings.setWallpaperFx(slot, patch)

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: 74, height: 120, borderRadius: 12, overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
        <WallpaperLayer imageId={id} fx={fx} radius={0} />
        {!id && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>未设置</span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fs-body" style={{ color: 'var(--text-primary)', marginBottom: 6 }}>{SLOT_NAMES[slot]}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button className="btn btn-sm" onClick={onPick}>
            <Upload size={12} /> 上传
          </button>
          {id && (
            <button className="btn btn-sm" onClick={onClear} style={{ color: '#ff8a8a' }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {id && (
          <>
            <SliderRow
              label="暗度"
              value={fx.dark}
              min={0}
              max={0.8}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => setFx({ dark: v })}
            />
            <SliderRow
              label="模糊"
              value={fx.blur}
              min={0}
              max={20}
              format={(v) => `${v}px`}
              onChange={(v) => setFx({ blur: v })}
            />
          </>
        )}
      </div>
    </div>
  )
}

const ASPECTS: { key: string; label: string; value: number | null }[] = [
  { key: 'free', label: '自由', value: null },
  { key: '11', label: '1:1', value: 1 },
  { key: '169', label: '16:9', value: 16 / 9 },
  { key: '916', label: '9:16', value: 9 / 16 },
]

function CropModal({
  src,
  title,
  onCancel,
  onApply,
}: {
  src: Blob
  title: string
  onCancel: () => void
  onApply: (blob: Blob) => void
}) {
  const [aspect, setAspect] = useState<number | null>(9 / 16)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const [applying, setApplying] = useState(false)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const previewBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    setRendering(true)
    const t = setTimeout(async () => {
      try {
        const blob = await cropImage(src, { aspect, scale, offsetX: offset.x, offsetY: offset.y }, 360)
        if (!alive) return
        const url = URL.createObjectURL(blob)
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return url
        })
      } finally {
        if (alive) setRendering(false)
      }
    }, 80)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [src, aspect, scale, offset])

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    const box = previewBoxRef.current
    if (!d || !box) return
    const w = box.clientWidth
    const h = box.clientHeight
    setOffset({ x: d.ox + (e.clientX - d.x) / w, y: d.oy + (e.clientY - d.y) / h })
  }
  const onPointerUp = () => {
    dragRef.current = null
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 950,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 20,
      }}
    >
      <div className="nav-title fs-h2" style={{ color: 'var(--text-primary)' }}>{title}</div>
      <div
        ref={previewBoxRef}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          width: 'min(240px, 60vw)',
          aspectRatio: aspect ? `${aspect}` : '4 / 3',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)',
          background: '#000',
          touchAction: 'none',
          cursor: 'grab',
          position: 'relative',
        }}
      >
        {previewUrl && (
          <img
            src={previewUrl}
            alt=""
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: rendering ? 0.7 : 1, transition: 'opacity 150ms' }}
          />
        )}
        {rendering && (
          <div className="timestamp" style={{ position: 'absolute', bottom: 8, left: 12 }}>
            渲染中…
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
        {ASPECTS.map((a) => (
          <button
            key={a.key}
            className="btn btn-sm"
            style={{
              background: aspect === a.value ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
              color: aspect === a.value ? '#000' : 'var(--text-primary)',
            }}
            onClick={() => {
              setAspect(a.value)
              setScale(1)
              setOffset({ x: 0, y: 0 })
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ width: 'min(300px, 80vw)' }} onClick={(e) => e.stopPropagation()}>
        <SliderRow
          label="缩放"
          value={scale}
          min={0.5}
          max={3}
          step={0.05}
          format={(v) => `${v.toFixed(2)}×`}
          onChange={setScale}
        />
      </div>

      <div style={{ display: 'flex', gap: 12 }} onClick={(e) => e.stopPropagation()}>
        <button className="btn" onClick={onCancel}>
          取消
        </button>
        <button
          className="btn btn-accent"
          disabled={applying || rendering}
          onClick={async () => {
            setApplying(true)
            try {
              const blob = await cropImage(src, { aspect, scale, offsetX: offset.x, offsetY: offset.y }, 1920)
              onApply(blob)
            } finally {
              setApplying(false)
            }
          }}
        >
          <Check size={15} /> {applying ? '处理中…' : '应用壁纸'}
        </button>
      </div>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
        拖动画面调整位置 · 滑块调整缩放
      </div>
    </div>
  )
}
