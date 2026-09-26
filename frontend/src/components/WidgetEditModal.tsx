import { useState } from 'react'
import { Modal, SliderRow, Toggle } from './common'
import { useDesktop, WidgetInstance, WidgetType, WIDGET_META, Song } from '../store/desktop'
import { useSettings } from '../store/settings'
import { useToast } from '../store/ui'
import { putBlob } from '../lib/idb'
import { compressImage } from '../lib/image'
import {
  Clock,
  CloudSun,
  Music as MusicIcon,
  LayoutGrid,
  Type,
  UserRound,
  Info,
  Upload,
  Trash2,
  Plus,
} from 'lucide-react'

export const WIDGET_TYPE_ICONS: Record<WidgetType, React.ReactNode> = {
  time: <Clock size={20} />,
  weather: <CloudSun size={20} />,
  music: <MusicIcon size={20} />,
  shortcut: <LayoutGrid size={20} />,
  text: <Type size={20} />,
  avatar: <UserRound size={20} />,
  sysinfo: <Info size={20} />,
}

export function AddWidgetSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const addWidget = useDesktop((s) => s.addWidget)
  const select = useDesktop((s) => s.select)
  const push = useToast((s) => s.push)
  return (
    <Modal open={open} onClose={onClose} title="添加桌面组件">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(Object.keys(WIDGET_META) as WidgetType[]).map((type) => (
          <button
            key={type}
            className="pressable"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-primary)',
            }}
            onClick={() => {
              const id = addWidget(type)
              select(id)
              push(`已添加「${WIDGET_META[type].name}」组件`)
              onClose()
            }}
          >
            {WIDGET_TYPE_ICONS[type]}
            <span className="fs-body">{WIDGET_META[type].name}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

async function pickImage(maxDim = 1920): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const compressed = await compressImage(file, maxDim)
      const id = await putBlob(compressed)
      resolve(id)
    }
    input.click()
  })
}

export function WidgetEditModal({
  widget,
  onClose,
}: {
  widget: WidgetInstance | null
  onClose: () => void
}) {
  const updateWidget = useDesktop((s) => s.updateWidget)
  const updateConfig = useDesktop((s) => s.updateWidgetConfig)
  const removeWidget = useDesktop((s) => s.removeWidget)
  const push = useToast((s) => s.push)
  const [cityDraft, setCityDraft] = useState('')

  if (!widget) return null
  const w = widget
  const id = w.id

  return (
    <Modal open={!!widget} onClose={onClose} title={`编辑「${WIDGET_META[w.type].name}」组件`}>
      <SliderRow label="宽度" value={w.w} min={60} max={380} onChange={(v) => updateWidget(id, { w: v })} />
      <SliderRow label="高度" value={w.h} min={44} max={320} onChange={(v) => updateWidget(id, { h: v })} />
      <SliderRow
        label="透明度"
        value={w.opacity}
        min={0.2}
        max={1}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => updateWidget(id, { opacity: v })}
      />
      <SliderRow label="圆角" value={w.radius} min={0} max={24} onChange={(v) => updateWidget(id, { radius: v })} />

      <div style={{ marginBottom: 14 }}>
        <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>样式预设</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(
            [
              ['glass', '玻璃底'],
              ['solid', '纯色底'],
              ['transparent', '纯文字'],
              ['image', '图片底'],
              ['border', '边框'],
            ] as const
          ).map(([key, name]) => (
            <button
              key={key}
              className="btn btn-sm"
              style={{
                background: w.theme === key ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: w.theme === key ? '#000' : 'var(--text-primary)',
              }}
              onClick={() => updateWidget(id, { theme: key })}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {(w.theme === 'image' || w.type === 'music') && (
        <div className="row-item">
          <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>背景图 / 封面图</span>
          <button
            className="btn btn-sm"
            onClick={async () => {
              const imgId = await pickImage(800)
              if (imgId) {
                updateWidget(id, { imageUrlId: imgId })
                push('图片已更新')
              }
            }}
          >
            <Upload size={13} /> 上传
          </button>
        </div>
      )}

      {w.type === 'time' && (
        <>
          <div className="row-item">
            <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>显示秒数</span>
            <Toggle
              checked={!!w.config.showSeconds}
              onChange={(v) => updateConfig(id, { showSeconds: v })}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>样式方案</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                ['A', '大数字横排'],
                ['B', '日期在上'],
                ['C', '英文格式'],
              ].map(([key, name]) => (
                <button
                  key={key}
                  className="btn btn-sm"
                  style={{
                    background: w.style === key ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                    color: w.style === key ? '#000' : 'var(--text-primary)',
                  }}
                  onClick={() => updateWidget(id, { style: key })}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {w.type === 'weather' && (
        <div style={{ marginBottom: 14 }}>
          <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>城市</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={cityDraft || w.config.city || ''}
              onChange={(e) => setCityDraft(e.target.value)}
              placeholder="如：上海"
            />
            <button
              className="btn btn-sm"
              onClick={() => {
                updateConfig(id, { city: cityDraft.trim() })
                push('城市已保存')
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}

      {w.type === 'shortcut' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>指向功能</div>
            <select
              value={w.config.appId ?? 'settings'}
              onChange={(e) => updateConfig(id, { appId: e.target.value })}
            >
              <option value="settings">设置</option>
              <option value="contacts">通讯录</option>
              <option value="messages">信息</option>
              <option value="forum">论坛</option>
              <option value="moments">朋友圈</option>
              <option value="music">音乐</option>
              <option value="about">关于</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>显示名称</div>
            <input
              value={w.config.label ?? ''}
              onChange={(e) => updateConfig(id, { label: e.target.value })}
              placeholder="留空使用功能名"
            />
          </div>
          <div className="row-item">
            <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>自定义图标</span>
            <button
              className="btn btn-sm"
              onClick={async () => {
                const imgId = await pickImage(256)
                if (imgId) {
                  updateConfig(id, { iconUrlId: imgId })
                  push('图标已更新')
                }
              }}
            >
              <Upload size={13} /> 上传
            </button>
          </div>
        </>
      )}

      {w.type === 'text' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>文案内容</div>
            <textarea
              rows={3}
              value={w.content}
              onChange={(e) => updateWidget(id, { content: e.target.value })}
              placeholder="输入你想要的文字"
            />
          </div>
          <SliderRow
            label="字号"
            value={w.config.fontSize ?? 14}
            min={10}
            max={28}
            onChange={(v) => updateConfig(id, { fontSize: v })}
          />
          <div className="row-item">
            <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>文字颜色</span>
            <input
              type="color"
              value={w.config.color ?? '#ffffff'}
              onChange={(e) => updateConfig(id, { color: e.target.value })}
              style={{ width: 48 }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>对齐方式</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  className="btn btn-sm"
                  style={{
                    background: (w.config.align ?? 'center') === a ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                    color: (w.config.align ?? 'center') === a ? '#000' : 'var(--text-primary)',
                  }}
                  onClick={() => updateConfig(id, { align: a })}
                >
                  {a === 'left' ? '左对齐' : a === 'center' ? '居中' : '右对齐'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {w.type === 'avatar' && (
        <>
          <div className="row-item">
            <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>头像图片</span>
            <button
              className="btn btn-sm"
              onClick={async () => {
                const imgId = await pickImage(512)
                if (imgId) {
                  updateConfig(id, { avatarId: imgId })
                  push('头像已更新')
                }
              }}
            >
              <Upload size={13} /> 上传
            </button>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>名称</div>
            <input value={w.config.label ?? ''} onChange={(e) => updateConfig(id, { label: e.target.value })} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>角色文案</div>
            <textarea
              rows={2}
              value={w.content}
              onChange={(e) => updateWidget(id, { content: e.target.value })}
              placeholder="自定义一句话"
            />
          </div>
        </>
      )}

      {w.type === 'music' && (
        <SongManager widget={w} />
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          className="btn"
          style={{ flex: 1, color: '#ff8a8a' }}
          onClick={() => {
            removeWidget(id)
            push('组件已删除', 'info')
            onClose()
          }}
        >
          <Trash2 size={14} /> 删除组件
        </button>
        <button className="btn btn-accent" style={{ flex: 1 }} onClick={onClose}>
          完成
        </button>
      </div>
    </Modal>
  )
}

function SongManager({ widget }: { widget: WidgetInstance }) {
  const updateConfig = useDesktop((s) => s.updateWidgetConfig)
  const push = useToast((s) => s.push)
  const songs = widget.config.songs ?? []

  const addSongs = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.multiple = true
    input.onchange = async () => {
      const files = Array.from(input.files ?? [])
      if (files.length === 0) return
      const newSongs: Song[] = []
      for (const f of files) {
        const blobId = await putBlob(f)
        newSongs.push({ id: `${Date.now()}${Math.random()}`, blobId, name: f.name.replace(/\.[^.]+$/, '') })
      }
      updateConfig(widget.id, { songs: [...songs, ...newSongs] })
      push(`已添加 ${newSongs.length} 首歌曲`)
    }
    input.click()
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>歌曲列表（{songs.length}）</span>
        <button className="btn btn-sm" onClick={addSongs}>
          <Plus size={13} /> 添加歌曲
        </button>
      </div>
      {songs.length === 0 ? (
        <div className="fs-aux" style={{ color: 'var(--text-disabled)', padding: '8px 0' }}>
          还没有歌曲，点击上方按钮从本地添加
        </div>
      ) : (
        songs.map((s, i) => (
          <div key={s.id} className="row-item">
            <span className="fs-aux" style={{ color: 'var(--text-body)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {i + 1}. {s.name}
            </span>
            <button
              className="pressable"
              style={{ color: '#ff8a8a' }}
              onClick={() => updateConfig(widget.id, { songs: songs.filter((x) => x.id !== s.id) })}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}
