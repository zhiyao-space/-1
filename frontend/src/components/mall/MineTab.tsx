import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  GripVertical,
  LayoutGrid,
  MapPin,
  RotateCw,
  Settings2,
  Store,
  Ticket,
  Wallet,
} from 'lucide-react'
import { useMall, visibleModules } from '../../store/mall'
import { MALL_TEMPLATES, MODULE_TYPE_LABEL } from '../../lib/mallCatalog'
import { useToast } from '../../store/ui'
import { Toggle } from '../common'
import { Empty, Sheet, fmtTime } from './mallParts'

/* ============================================================
   mulin 商城 ✦ MALLÉ · 我的
   资产 / 虚拟小店 / 模块管理与拖拽排序 / 地址 / 刷新历史 / 设置
   ============================================================ */

type Sub = null | 'modules' | 'address' | 'shop' | 'settings' | 'history'

function SubPageHead({ title, sub, onBack }: { title: string; sub?: string; onBack: () => void }) {
  return (
    <div className="ml-pagehead">
      <button className="ml-iconbtn ml-iconbtn--sm fx-press" onClick={onBack} aria-label="返回">
        <ChevronLeft size={17} />
      </button>
      <span className="ml-pagehead__title">{title}</span>
      {sub && <span className="ml-pagehead__sub">{sub}</span>}
    </div>
  )
}

/* ---------- 模块管理（拖拽排序 + 显隐） ---------- */

function ModuleManager({ onBack, onEdit }: { onBack: () => void; onEdit: (id: string) => void }) {
  const modules = useMall((s) => s.modules)
  const reorder = useMall((s) => s.reorderModules)
  const toggle = useMall((s) => s.toggleModuleEnabled)
  const push = useToast((s) => s.push)
  const ordered = useMemo(() => [...modules].sort((a, b) => a.sortOrder - b.sortOrder), [modules])
  const [dragId, setDragId] = useState<string | null>(null)
  const dragRef = useRef<string | null>(null)

  // 拖拽期间监听全局指针，按落点行实时换位
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragRef.current) return
      const row = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-mid]') as HTMLElement | null
      const targetId = row?.dataset.mid
      if (!targetId || targetId === dragRef.current) return
      const ids = ordered.map((m) => m.id)
      const from = ids.indexOf(dragRef.current)
      const to = ids.indexOf(targetId)
      if (from < 0 || to < 0) return
      ids.splice(to, 0, ids.splice(from, 1)[0])
      reorder(ids)
    }
    const up = () => {
      if (dragRef.current) push('排序已保存')
      dragRef.current = null
      setDragId(null)
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [ordered, reorder, push])

  return (
    <div className="fx-root ml-root">
      <SubPageHead title="模块管理" sub={`${visibleModules(modules).length}/${modules.length} 显示中`} onBack={onBack} />
      <div className="ml-orderscroll">
        <div className="ml-mgroup">按住左侧手柄拖动排序，右侧开关控制显隐</div>
        {ordered.map((m) => (
          <div
            key={m.id}
            data-mid={m.id}
            className={`ml-manage-row${dragId === m.id ? ' ml-manage-row--dragging' : ''}`}
          >
            <span
              style={{ color: 'var(--fx-t3)', cursor: 'grab', touchAction: 'none', display: 'flex' }}
              onPointerDown={(e) => {
                e.preventDefault()
                dragRef.current = m.id
                setDragId(m.id)
              }}
            >
              <GripVertical size={17} />
            </span>
            <span className="ml-manage-row__icon">{m.icon}</span>
            <span className="ml-manage-row__name" onClick={() => onEdit(m.id)}>
              {m.name}
              <span className="ml-manage__val" style={{ display: 'block', fontSize: 'calc(10px * var(--fs-scale))', color: 'var(--fx-t3)', marginTop: 2 }}>
                {MODULE_TYPE_LABEL[m.type]}
              </span>
            </span>
            <Toggle checked={m.enabled} onChange={() => toggle(m.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- 地址管理 ---------- */

function AddressManager({ onBack }: { onBack: () => void }) {
  const addresses = useMall((s) => s.addresses)
  const addAddress = useMall((s) => s.addAddress)
  const updateAddress = useMall((s) => s.updateAddress)
  const removeAddress = useMall((s) => s.removeAddress)
  const setDefaultAddress = useMall((s) => s.setDefaultAddress)
  const push = useToast((s) => s.push)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', detail: '' })

  const openNew = () => {
    setForm({ name: '', phone: '', detail: '' })
    setEditing('new')
  }
  const openEdit = (id: string) => {
    const a = addresses.find((x) => x.id === id)
    if (!a) return
    setForm({ name: a.name, phone: a.phone, detail: a.detail })
    setEditing(id)
  }

  return (
    <div className="fx-root ml-root">
      <SubPageHead title="地址管理" sub={`${addresses.length} 个`} onBack={onBack} />
      <div className="ml-orderscroll">
        {addresses.length === 0 ? (
          <Empty icon={<MapPin size={30} />} text="还没有收货地址" hint="添加一个，下单时自动带上" />
        ) : (
          addresses.map((a) => (
            <div key={a.id} className="ml-order">
              <div className="ml-order__head">
                <span className="ml-order__no">
                  {a.name} · {a.phone}
                </span>
                {a.isDefault && <span className="ml-order__status">默认</span>}
              </div>
              <div className="ml-detail__desc" style={{ marginTop: 0 }}>
                {a.detail}
              </div>
              <div className="ml-order__foot">
                <button className="ml-chip" onClick={() => setDefaultAddress(a.id)}>
                  设为默认
                </button>
                <span className="ml-order__acts">
                  <button className="ml-chip" onClick={() => openEdit(a.id)}>
                    编辑
                  </button>
                  <button
                    className="ml-chip"
                    onClick={() => {
                      removeAddress(a.id)
                      push('地址已删除')
                    }}
                  >
                    删除
                  </button>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="ml-bottombar" style={{ justifyContent: 'center' }}>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={openNew}>
          新增地址
        </button>
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? '新增地址' : '编辑地址'}>
        <input
          className="fx-input"
          placeholder="收货人"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{ marginBottom: 10 }}
        />
        <input
          className="fx-input"
          placeholder="手机号"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          style={{ marginBottom: 10 }}
        />
        <textarea
          className="fx-textarea"
          rows={2}
          placeholder="详细地址"
          value={form.detail}
          onChange={(e) => setForm({ ...form, detail: e.target.value })}
          style={{ marginBottom: 12 }}
        />
        <button
          className="fx-btn fx-btn--accent fx-press"
          style={{ width: '100%' }}
          onClick={() => {
            if (!form.name.trim() || !form.detail.trim()) {
              push('请填写收货人和地址', 'error')
              return
            }
            if (editing === 'new') addAddress(form)
            else if (editing) updateAddress(editing, form)
            push('地址已保存')
            setEditing(null)
          }}
        >
          保存
        </button>
      </Sheet>
    </div>
  )
}

/* ---------- 虚拟小店 ---------- */

function ShopPanel({ onBack }: { onBack: () => void }) {
  const shop = useMall((s) => s.shop)
  const patchShop = useMall((s) => s.patchShop)
  const modules = useMall((s) => s.modules)
  const createModule = useMall((s) => s.createModule)
  const push = useToast((s) => s.push)
  const [form, setForm] = useState(shop)

  return (
    <div className="fx-root ml-root">
      <SubPageHead title="我的店铺" sub={shop.open ? '营业中' : '未开张'} onBack={onBack} />
      <div className="ml-orderscroll">
        <div className="ml-store" style={{ marginBottom: 16 }}>
          <span className="ml-store__avatar">{shop.icon}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="ml-store__name">{shop.name}</span>
            <span className="ml-store__desc" style={{ display: 'block' }}>
              {shop.desc}
            </span>
          </span>
          <Toggle checked={shop.open} onChange={(v) => patchShop({ open: v })} />
        </div>

        <div className="ml-field">
          <span className="ml-field__label">店铺名</span>
          <input className="fx-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="ml-field">
          <span className="ml-field__label">店铺简介</span>
          <textarea className="fx-textarea" rows={2} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
        </div>
        <div className="ml-field">
          <span className="ml-field__label">店铺图标</span>
          <input
            className="fx-input"
            value={form.icon}
            maxLength={4}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            style={{ width: 90 }}
          />
        </div>
        <button
          className="fx-btn fx-press"
          style={{ width: '100%', marginBottom: 10 }}
          onClick={() => {
            patchShop(form)
            push('店铺信息已保存')
          }}
        >
          保存店铺信息
        </button>
        <button
          className="fx-btn fx-btn--accent fx-press"
          style={{ width: '100%' }}
          onClick={() => {
            const exists = modules.some((m) => m.type === 'store')
            if (exists) {
              push('你已有一个小店模块了')
              return
            }
            createModule({ name: form.name || '我的小店', type: 'store', icon: form.icon || '🏪', description: form.desc })
            push('小店模块已生成，去首页看看 ✦')
          }}
        >
          用店铺信息生成首页模块
        </button>
      </div>
    </div>
  )
}

/* ---------- 设置 ---------- */

function SettingsPanel({ onBack }: { onBack: () => void }) {
  const settings = useMall((s) => s.settings)
  const patchSettings = useMall((s) => s.patchSettings)
  const resetAll = useMall((s) => s.resetAll)
  const push = useToast((s) => s.push)
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="fx-root ml-root">
      <SubPageHead title="设置" onBack={onBack} />
      <div className="ml-orderscroll">
        <div className="ml-menu">
          <div className="ml-menu__row">
            <span>刷新完成提醒</span>
            <span className="ml-menu__val">
              <Toggle checked={settings.notify} onChange={(v) => patchSettings({ notify: v })} />
            </span>
          </div>
          <div className="ml-menu__row">
            <span>刷新动画</span>
            <span className="ml-menu__val">
              <Toggle checked={settings.animate} onChange={(v) => patchSettings({ animate: v })} />
            </span>
          </div>
        </div>
        <button className="fx-btn fx-press" style={{ width: '100%' }} onClick={() => setConfirm(true)}>
          重置商城数据
        </button>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="确认重置">
        <div className="ml-detail__desc" style={{ marginTop: 0, marginBottom: 14 }}>
          将清空所有模块、商品、订单与自定义内容，恢复为初始示例。此操作不可撤销。
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="fx-btn fx-press" style={{ flex: 1 }} onClick={() => setConfirm(false)}>
            再想想
          </button>
          <button
            className="fx-btn fx-btn--accent fx-press"
            style={{ flex: 1 }}
            onClick={() => {
              resetAll()
              push('已恢复初始数据')
              setConfirm(false)
            }}
          >
            确认重置
          </button>
        </div>
      </Sheet>
    </div>
  )
}

/* ---------- 我的主页面 ---------- */

export default function MineTab({
  onOpenTemplates,
  onEditModule,
}: {
  onOpenTemplates: () => void
  onEditModule: (id: string) => void
}) {
  const user = useMall((s) => s.user)
  const modules = useMall((s) => s.modules)
  const addresses = useMall((s) => s.addresses)
  const refreshHistory = useMall((s) => s.refreshHistory)
  const shop = useMall((s) => s.shop)
  const useCoupon = useMall((s) => s.useCoupon)
  const push = useToast((s) => s.push)
  const [sub, setSub] = useState<Sub>(null)
  const [couponsOpen, setCouponsOpen] = useState(false)

  if (sub === 'modules') return <ModuleManager onBack={() => setSub(null)} onEdit={onEditModule} />
  if (sub === 'address') return <AddressManager onBack={() => setSub(null)} />
  if (sub === 'shop') return <ShopPanel onBack={() => setSub(null)} />
  if (sub === 'settings') return <SettingsPanel onBack={() => setSub(null)} />

  const unusedCoupons = user.coupons.filter((c) => !c.used)
  const visibleCount = visibleModules(modules).length

  const row = (icon: React.ReactNode, label: string, value: string | undefined, onClick: () => void) => (
    <button className="ml-menu__row fx-press-soft" onClick={onClick}>
      {icon}
      <span>{label}</span>
      <span className="ml-menu__val">{value}</span>
      <ChevronRight size={15} color="var(--fx-t3)" />
    </button>
  )

  return (
    <div className="fx-root ml-root">
      <div className="ml-pagehead">
        <span className="ml-pagehead__title">我的</span>
        <span className="ml-pagehead__sub">{user.id}</span>
      </div>

      <div className="ml-orderscroll">
        <div className="ml-assets">
          <div className="ml-asset">
            <Wallet size={15} color="var(--fx-t3)" />
            <b>¥{user.balance.toFixed(0)}</b>
            <span>余额</span>
          </div>
          <div className="ml-asset">
            <Coins size={15} color="var(--fx-t3)" />
            <b>{user.points}</b>
            <span>积分</span>
          </div>
          <button className="ml-asset" onClick={() => setCouponsOpen(true)}>
            <Ticket size={15} color="var(--fx-t3)" />
            <b>{unusedCoupons.length}</b>
            <span>优惠券</span>
          </button>
        </div>

        <div className="ml-mgroup">我的</div>
        <div className="ml-menu">
          {row(<Store size={16} />, '我的店铺', shop.open ? '营业中' : '未开张', () => setSub('shop'))}
          {row(<LayoutGrid size={16} />, '模块管理', `${visibleCount}/${modules.length}`, () => setSub('modules'))}
          {row(<Ticket size={16} />, '模板库', `${MALL_TEMPLATES.length} 套`, onOpenTemplates)}
          {row(<MapPin size={16} />, '地址管理', `${addresses.length} 个`, () => setSub('address'))}
          {row(<RotateCw size={16} />, '刷新历史', `${refreshHistory.length} 次`, () => setSub('history'))}
          {row(<Settings2 size={16} />, '设置', undefined, () => setSub('settings'))}
        </div>
      </div>

      <Sheet open={couponsOpen} onClose={() => setCouponsOpen(false)} title="我的优惠券">
        {user.coupons.length === 0 ? (
          <Empty icon={<Ticket size={26} />} text="还没有优惠券" />
        ) : (
          user.coupons.map((c) => (
            <div key={c.id} className="ml-prodrow">
              <span className="ml-prodrow__thumb ml-store__avatar" style={{ width: 50, height: 50, borderRadius: 12 }}>
                <Ticket size={20} />
              </span>
              <span className="ml-prodrow__body">
                <span className="ml-name">{c.title}</span>
                <span className="ml-desc">{c.minSpend > 0 ? `满 ¥${c.minSpend} 可用` : '无门槛使用'}</span>
              </span>
              <button
                className="ml-chip"
                disabled={c.used}
                style={{ opacity: c.used ? 0.5 : 1 }}
                onClick={() => {
                  useCoupon(c.id)
                  push('优惠券已标记使用')
                }}
              >
                {c.used ? '已使用' : '使用'}
              </button>
            </div>
          ))
        )}
      </Sheet>

      <Sheet open={sub === 'history'} onClose={() => setSub(null)} title="刷新历史">
        {refreshHistory.length === 0 ? (
          <Empty icon={<RotateCw size={26} />} text="还没有刷新记录" hint="去首页点右上角刷新试试" />
        ) : (
          refreshHistory.map((r) => (
            <div key={r.id} className="ml-prodrow">
              <span className="ml-prodrow__body">
                <span className="ml-name">
                  {r.moduleIds.length > 1 ? `刷新全部 · ${r.moduleIds.length} 个模块` : '刷新单个模块'}
                </span>
                <span className="ml-desc">生成 {r.count} 件商品</span>
              </span>
              <span className="ml-menu__val">{fmtTime(r.at)}</span>
            </div>
          ))
        )}
      </Sheet>
    </div>
  )
}
