import { useState } from 'react'
import { Modal } from '../common'

export function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="page-enter"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      <img src={src} alt="" style={{ maxWidth: '94%', maxHeight: '86%', objectFit: 'contain' }} />
    </div>
  )
}

export function useImageViewer(): [React.ReactNode, (url: string | null) => void] {
  const [url, setUrl] = useState<string | null>(null)
  const node = url ? <ImageViewer src={url} onClose={() => setUrl(null)} /> : null
  return [node, setUrl]
}

export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 2px' }}>
      <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
        {name ? `${name} 正在输入` : '正在输入'}
      </span>
      <span className="typing-dots">
        <i /><i /><i />
      </span>
    </div>
  )
}

export function TimeText({ ts }: { ts: number }) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return (
    <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
      {hh}:{mm}
    </span>
  )
}

export { Modal }
