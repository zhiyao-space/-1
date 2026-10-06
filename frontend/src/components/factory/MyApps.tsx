import { useMemo, useRef, useState } from 'react'
import { Download, Layers, Package, Pencil, Plus, Search, Trash2, Copy, Rocket, Archive, MonitorSmartphone } from 'lucide-react'
import { APP_CATEGORIES, buildExportDoc, type AppCategory, type CustomApp, useFactory } from '../../store/factory'
import { useUI, useToast } from '../../store/ui'
import { AppGlyph, Chip, Divider, EmptyBlock } from './parts'

const SIZE_LABEL: Record<string, string> = { small: '小组件', medium: '卡片', full: '全屏' }

function downloadHtml(app: CustomApp) {
  const blob = new Blob([buildExportDoc(app)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${app.name}.html`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function MyApps({ onEdit }: { onEdit: (id: string) => void }) {
  const apps = useFactory((s) => s.apps)
  const sandbox = useFactory((s) => s.sandbox)
  const removeApp = useFactory((s) => s.removeApp)
  const duplicateApp = useFactory((s) => s.duplicateApp)
  const setDesktopVisible = useFactory((s) => s.setDesktopVisible)
  const publishExperiment = useFactory((s) => s.publishExperiment)
  const updateExperiment = useFactory((s) => s.updateExperiment)
  const removeExperiment = useFactory((s) => s.removeExperiment)
  const setRunningApp = useUI((s) => s.setRunningApp)
  const push = useToast((s) => s.push)

  const [zone, setZone] = useState<'apps' | 'sandbox'>('apps')
  const [category, setCategory] = useState<AppCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [menuFor, setMenuFor] = useState<CustomApp | null>(null)
  const pressRef = useRef<{ timer: number | null; fired: boolean }>({ timer: null, fired: false })

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return apps.filter((a) => (category === 'all' || a.category === category) && (!q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)))
  }, [apps, category, query])

  const openLongPress = (app: CustomApp) => {
    pressRef.current.fired = false
    pressRef.current.timer = window.setTimeout(() => {
      pressRef.current.fired = true
      navigator.vibrate?.(12)
      setMenuFor(app)
    }, 480)
  }
  const clearLongPress = () => {
    if (pressRef.current.timer) {
      window.clearTimeout(pressRef.current.timer)
      pressRef.current.timer = null
    }
  }

  return (
    <div className="fx-scroll">
      {/* 区域切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className={`fx-press ${zone === 'apps' ? 'fx-sunken' : 'fx-block fx-mid'}`}
          onClick={() => setZone('apps')}
          style={{ flex: 1, border: 0, minHeight: 42, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: zone === 'apps' ? 'var(--fx-t1,#fff)' : 'var(--fx-t3,#999)', cursor: 'pointer', fontSize: 'calc(13px * var(--fs-scale))' }}
        >
          <Package size={15} /> 我的应用{apps.length ? ` ${apps.length}` : ''}
        </button>
        <button
          className={`fx-press ${zone === 'sandbox' ? 'fx-sunken' : 'fx-block fx-mid'}`}
          onClick={() => setZone('sandbox')}
          style={{ flex: 1, border: 0, minHeight: 42, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: zone === 'sandbox' ? 'var(--fx-t1,#fff)' : 'var(--fx-t3,#999)', cursor: 'pointer', fontSize: 'calc(13px * var(--fs-scale))' }}
        >
          <Layers size={15} /> 沙盒{sandbox.filter((s) => s.status !== 'archived').length ? ` ${sandbox.filter((s) => s.status !== 'archived').length}` : ''}
        </button>
      </div>

      {zone === 'apps' ? (
        <>
          <div className="fx-sunken" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 44, marginBottom: 12 }}>
            <Search size={15} color="var(--fx-t3,#999)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索我的应用"
              style={{ flex: 1, background: 'none', border: 0, outline: 'none', color: 'var(--fx-t1,#fff)', fontSize: 'calc(13px * var(--fs-scale))' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
            <Chip active={category === 'all'} onClick={() => setCategory('all')}>
              全部
            </Chip>
            {APP_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </Chip>
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyBlock
              icon={<Package size={30} />}
              text={apps.length === 0 ? '还没有自己的应用' : '没有匹配的应用'}
              hint={apps.length === 0 ? '去「模板工厂」挑一个，或在「AI造应用」里描述你想要的' : '换个分类或关键词试试'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {list.map((app) => (
                <div key={app.id} className="fx-block fx-front fx-in" style={{ padding: 13 }}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                    <button
                      className="fx-press-soft"
                      onClick={() => setRunningApp(app.id)}
                      onPointerDown={() => openLongPress(app)}
                      onPointerUp={clearLongPress}
                      onPointerLeave={clearLongPress}
                      style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                      title="运行"
                    >
                      <AppGlyph icon={app.icon} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fs-body" style={{ color: 'var(--fx-t1,#fff)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                        <span className="fx-chip">{app.category}</span>
                        <span className="fx-chip">{SIZE_LABEL[app.size]}</span>
                        <span className="fs-micro" style={{ color: 'var(--fx-t3,#999)' }}>
                          {new Date(app.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                    <button className="fx-btn fx-press" style={{ flex: 1 }} onClick={() => onEdit(app.id)}>
                      <Pencil size={13} /> 编辑
                    </button>
                    <button
                      className={`fx-btn fx-press ${app.isVisibleOnDesktop ? 'fx-btn--accent' : ''}`}
                      style={{ flex: 1 }}
                      onClick={() => {
                        setDesktopVisible(app.id, !app.isVisibleOnDesktop)
                        const asWidget = app.size === 'small'
                        push(
                          app.isVisibleOnDesktop
                            ? '已从桌面移除'
                            : asWidget
                              ? '已作为小组件放到桌面'
                              : '已添加到桌面'
                        )
                      }}
                    >
                      <MonitorSmartphone size={13} /> {app.isVisibleOnDesktop ? (app.size === 'small' ? '在桌面·小组件' : '在桌面') : '加到桌面'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {sandbox.length === 0 ? (
            <EmptyBlock icon={<Layers size={30} />} text="沙盒里还没有实验" hint="在代码工坊点「存沙盒」，把没想好的改动先放这里" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sandbox.map((exp) => (
                <div key={exp.id} className="fx-block fx-mid fx-in" style={{ padding: 13, opacity: exp.status === 'archived' ? 0.55 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AppGlyph icon={exp.status === 'archived' ? 'Package' : 'FlaskConical'} size={40} level="mid" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fs-body" style={{ color: 'var(--fx-t1,#fff)', fontWeight: 600 }}>
                        {exp.name}
                      </div>
                      <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', marginTop: 3 }}>
                        {exp.status === 'draft' ? '草稿' : exp.status === 'published' ? '已发布' : '已归档'} · {new Date(exp.updatedAt).toLocaleString('zh-CN', { hour12: false })}
                      </div>
                    </div>
                  </div>
                  <Divider style={{ margin: '11px 0' }} />
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    <button
                      className="fx-btn fx-btn--soft fx-press-soft"
                      onClick={() => {
                        const app = publishExperiment(exp.id)
                        if (app) {
                          push(`已发布到我的应用：${app.name}`)
                          setZone('apps')
                        }
                      }}
                      disabled={exp.status === 'published'}
                    >
                      <Rocket size={13} /> 发布
                    </button>
                    <button
                      className="fx-btn fx-btn--soft fx-press-soft"
                      onClick={() => {
                        const app = useFactory.getState().addApp({ name: exp.name, html: exp.html, css: exp.css, js: exp.js, source: 'custom' })
                        removeExperiment(exp.id)
                        push('已移入我的应用')
                        onEdit(app.id)
                      }}
                    >
                      <Pencil size={13} /> 编辑
                    </button>
                    <button
                      className="fx-btn fx-btn--soft fx-press-soft"
                      onClick={() => {
                        updateExperiment(exp.id, { status: exp.status === 'archived' ? 'draft' : 'archived' })
                      }}
                    >
                      <Archive size={13} /> {exp.status === 'archived' ? '取消归档' : '归档'}
                    </button>
                    <button
                      className="fx-btn fx-btn--soft fx-press-soft"
                      onClick={() => {
                        removeExperiment(exp.id)
                        push('已删除实验', 'info')
                      }}
                    >
                      <Trash2 size={13} /> 删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 长按菜单 */}
      {menuFor && (
        <div onClick={() => setMenuFor(null)} style={{ position: 'absolute', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.55)' }}>
          <div
            className="fx-block fx-front fx-in"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)', width: '82%', maxWidth: 320, padding: 16 }}
          >
            <div className="fs-body" style={{ color: 'var(--fx-t1,#fff)', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AppGlyph icon={menuFor.icon} size={30} /> {menuFor.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                className="fx-btn fx-press"
                onClick={() => {
                  setMenuFor(null)
                  setRunningApp(menuFor.id)
                }}
              >
                <Rocket size={13} /> 运行
              </button>
              <button
                className="fx-btn fx-press"
                onClick={() => {
                  setMenuFor(null)
                  onEdit(menuFor.id)
                }}
              >
                <Pencil size={13} /> 编辑
              </button>
              <button
                className="fx-btn fx-press"
                onClick={() => {
                  const c = duplicateApp(menuFor.id)
                  setMenuFor(null)
                  if (c) push(`已复制为「${c.name}」`)
                }}
              >
                <Copy size={13} /> 复制
              </button>
              <button
                className="fx-btn fx-press"
                onClick={() => {
                  downloadHtml(menuFor)
                  setMenuFor(null)
                  push('已导出 HTML 文件')
                }}
              >
                <Download size={13} /> 导出
              </button>
              <button
                className="fx-btn fx-press"
                style={{ gridColumn: 'span 2', color: '#ff8a8a' }}
                onClick={() => {
                  removeApp(menuFor.id)
                  setMenuFor(null)
                  push('已删除应用', 'info')
                }}
              >
                <Trash2 size={13} /> 删除应用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提示 */}
      {apps.length > 0 && zone === 'apps' && (
        <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', textAlign: 'center', marginTop: 16, lineHeight: 1.7 }}>
          点图标直接运行；长按卡片可复制 / 导出 / 删除
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14, marginBottom: 6 }}>
        <button className="fx-btn fx-btn--soft fx-press-soft" onClick={() => setZone(zone === 'apps' ? 'sandbox' : 'apps')}>
          <Plus size={13} /> {zone === 'apps' ? '查看沙盒' : '回到我的应用'}
        </button>
      </div>
    </div>
  )
}