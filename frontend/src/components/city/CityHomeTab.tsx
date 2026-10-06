import { useMemo, useRef, useState } from 'react'
import { ImagePlus, Minus, Plus, Radio, Send, Sparkles, Target, Users, Clock } from 'lucide-react'
import { LANDMARKS, pick } from '../../lib/cityCatalog'
import { analyzeImageScene, hasCityAi, searchCity } from '../../lib/cityEngine'
import { useMe, useMulCity } from '../../store/mulCity'
import type { Landmark } from '../../store/mulCity'
import { Card, Empty, Row, Stat, fmtWhen } from './cityParts'
import { useCityNav } from './cityNav'

/* ============================================================
   Tab1 · Mul市（城市首页）
   全景地图 + 实时动态 + 世界事件 + AI 自然语言 / 传图
   ============================================================ */

export default function CityHomeTab() {
  const city = useMulCity((s) => s.city)
  const people = useMulCity((s) => s.people)
  const worldEvents = useMulCity((s) => s.worldEvents)
  const activities = useMulCity((s) => s.activities)
  const advanceHours = useMulCity((s) => s.advanceHours)
  const me = useMe()
  const nav = useCityNav()
  const online = people.filter((p) => p.isOnline).length

  const [zoom, setZoom] = useState(1)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [scene, setScene] = useState<{ title: string; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string>('')

  // 每个人当前所在地标 → 地图标记
  const markers = useMemo(() => {
    const map = new Map<string, typeof people>()
    people.forEach((p) => {
      const arr = map.get(p.lastSeenLocation) ?? []
      arr.push(p)
      map.set(p.lastSeenLocation, arr)
    })
    return map
  }, [people])

  // 优先展示城市自转产生的真实动态；没有时回退到按人物派生的时间线
  const timeline = useMemo(() => {
    if (activities?.length) {
      return activities.slice(0, 10).map((a) => ({
        id: a.id,
        time: a.at,
        title: a.kind === 'meet' ? '有人相遇了' : '居民在移动',
        desc: a.text,
        hot: a.personIds.includes(me.id),
        route: { view: 'landmark' as const, id: a.landmarkId },
      }))
    }
    const others = people.filter((p) => p.type !== 'user')
    const feed = others.slice(0, 6).map((p) => ({
      id: `f_${p.id}`,
      time: p.lastActive,
      title: `${p.name} 在${landmarkName(city.landmarks, p.lastSeenLocation)}`,
      desc: `心情${p.currentEmotion}，${p.isOnline ? '此刻在线' : '刚刚离线'}。`,
      hot: p.isOnline,
      route: { view: 'person' as const, id: p.id },
    }))
    return feed.sort((a, b) => b.time - a.time)
  }, [activities, people, city.landmarks, me.id])

  const onSearch = async (text: string) => {
    const q = text.trim()
    if (!q) return
    setBusy(true)
    setScene(null)
    const res = await searchCity(q, people)
    if (res && res.landmarkIds.length) {
      setFocusId(res.landmarkIds[0])
      setReply(res.reply || `找到了 ${res.landmarkIds.map((id) => landmarkName(city.landmarks, id)).join('、')}。`)
      setZoom(1.35)
    } else {
      const lower = q.toLowerCase()
      const hit = LANDMARKS.find(
        (l) => lower.includes(l.name) || lower.includes(l.type) || l.name.includes(q)
      )
      if (hit) {
        setFocusId(hit.id)
        setReply(`${hit.name}：${hit.description}`)
        setZoom(1.35)
      } else {
        // 兴趣关键词兜底
        const kw = ['猫', '咖啡', '书', '海', '山', '夜', '吃']
        const found = kw.find((k) => q.includes(k))
        const pool = found ? LANDMARKS.filter((l) => matches(l, found)) : []
        const guessed = (pool.length ? pick(pool) : pick(LANDMARKS)).id
        setFocusId(guessed)
        setReply(`按你的描述，先去 ${landmarkName(city.landmarks, guessed)} 看看。`)
      }
    }
    setBusy(false)
  }

  const onPickImage = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    setScene({ title: '正在读取画面…', text: '把这张图放进 Mul市 的某个角落。' })
    ;(async () => {
      const res = await analyzeImageScene(`用户上传了一张图片（文件名：${file.name}），请把它转写成 Mul市 的场景`)
      if (res && res.landmarkId) {
        setFocusId(res.landmarkId)
        setScene({ title: res.sceneTitle || file.name, text: res.sceneText })
        setZoom(1.25)
      } else {
        const lm = pick(LANDMARKS)
        setFocusId(lm.id)
        setScene({
          title: `${lm.name} · 一帧`,
          text: `${lm.description} 画面里的光落在这条街上，像 Mul市 里普通的一天。`,
        })
        setZoom(1.25)
      }
    })()
  }

  return (
    <>
      <div className="cx-scroll">
        {/* 地图 */}
        <div className="cx-map">
          <div className="cx-map__grid" />
          {/* 区域厚块 */}
          {city.districts.map((d, i) => {
            const anchor = LANDMARKS.filter((l) => l.districtId === d.id)
            if (!anchor.length) return null
            const cx = anchor.reduce((s, l) => s + l.x, 0) / anchor.length
            const cy = anchor.reduce((s, l) => s + l.y, 0) / anchor.length
            const size = 20 + i * 1.6
            return (
              <div
                key={d.id}
                className="cx-map__blob"
                style={{ left: `${cx - size / 2}%`, top: `${cy - size / 2}%`, width: `${size}%`, height: `${size * 0.82}%` }}
              />
            )
          })}
          <div className="cx-map__view" style={{ transform: `scale(${zoom})` }}>
            {city.landmarks.map((l) => (
              <button
                key={l.id}
                className={`cx-lm fx-press ${focusId === l.id ? 'cx-lm--active' : ''}`}
                style={{ left: `${l.x}%`, top: `${l.y}%` }}
                onClick={() => setFocusId(l.id)}
                onDoubleClick={() => nav.push({ view: 'landmark', id: l.id })}
              >
                <span className="cx-lm__dot" />
                <span className="cx-lm__label">{l.name}</span>
              </button>
            ))}
            {Array.from(markers.entries()).map(([lmId, list]) => {
              const lm = city.landmarks.find((x) => x.id === lmId)
              if (!lm) return null
              return (
                <span key={lmId} className="cx-pm">
                  {list.slice(0, 3).map((p, i) => (
                    <span
                      key={p.id}
                      className={`cx-pm__dot ${p.type === 'npc' ? 'cx-pm--npc' : 'cx-pm--character'}`}
                      style={{
                        position: 'absolute',
                        left: `${lm.x + (i - 1) * 1.6}%`,
                        top: `${lm.y - 3}%`,
                        transform: 'translate(-50%,-50%)',
                        display: 'block',
                      }}
                    />
                  ))}
                </span>
              )
            })}
          </div>

          <div className="cx-map__legend">
            <i><span className="cx-pm__dot" style={{ position: 'static', display: 'inline-block' }} /> 在线居民</i>
            <i><span className="cx-pm__dot cx-pm--npc" style={{ position: 'static', display: 'inline-block' }} /> NPC</i>
          </div>

          <div className="cx-map__hud">
            <button className="cx-mapbtn fx-press" onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.25).toFixed(2)))} aria-label="放大"><Plus size={15} /></button>
            <button className="cx-mapbtn fx-press" onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.25).toFixed(2)))} aria-label="缩小"><Minus size={15} /></button>
            <button className="cx-mapbtn fx-press" onClick={() => setZoom(1)} aria-label="复位"><Target size={15} /></button>
          </div>
        </div>

        {/* 聚焦地标 */}
        {focusId && (() => {
          const lm = city.landmarks.find((l) => l.id === focusId)
          if (!lm) return null
          const here = people.filter((p) => p.lastSeenLocation === lm.id)
          return (
            <Card style={{ marginTop: 12 }}>
              <Row
                icon={<Target size={15} />}
                title={lm.name}
                sub={lm.description}
                right={<span className="cx-tag">{lm.type}</span>}
                onClick={() => nav.push({ view: 'landmark', id: lm.id })}
                arrow
              />
              <div className="cx-row__sub" style={{ marginTop: 2 }}>
                此刻在此 {here.length} 人{here.length ? `：${here.slice(0, 4).map((p) => p.name).join('、')}${here.length > 4 ? ' 等' : ''}` : ''}
              </div>
              {reply && <div className="cx-row__sub" style={{ marginTop: 8, color: 'var(--fx-t2)' }}>程行：{reply}</div>}
            </Card>
          )
        })()}

        {/* 传图场景 */}
        {preview && (
          <Card style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 11 }}>
              <img src={preview} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 14, flex: '0 0 auto' }} />
              <div style={{ minWidth: 0 }}>
                <div className="cx-row__title">{scene?.title ?? '图片场景'}</div>
                <div className="cx-row__sub">{scene?.text}</div>
              </div>
            </div>
          </Card>
        )}

        {/* 城市脉搏 */}
        <div className="cx-sechead">
          <span className="cx-sechead__t">城市脉搏</span>
          <span className="cx-sechead__sub">
            <Radio size={11} /> {city.timeScale === 0 ? '已暂停' : `自转中 · ${city.timeScale}×`}
          </span>
        </div>
        <Card>
          <div className="cx-stats">
            <Stat value={`${online}/${people.length}`} label="在线居民" />
            <Stat value={activities?.length ?? 0} label="实时动态" />
            <Stat value={worldEvents.filter((e) => !e.outcome).length} label="进行中事件" />
          </div>
          <button
            className="fx-btn fx-btn--front fx-press"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => advanceHours(1)}
          >
            <Clock size={14} /> 快进 1 小时看看
          </button>
        </Card>

        {/* 今日动态 */}
        <div className="cx-sechead">
          <span className="cx-sechead__t">今日动态</span>
          <span className="cx-sechead__sub">Mul市实时{activities?.length ? ' · 自转' : ''}</span>
        </div>
        <div className="cx-tl">
          {timeline.map((t) => (
            <div className="cx-tl__item" key={t.id}>
              <span className={`cx-tl__dot ${t.hot ? 'cx-tl__dot--hot' : ''}`} />
              <button className="cx-tl__card fx-press" onClick={() => nav.push(t.route)}>
                <div className="cx-tl__time">{fmtWhen(t.time)}</div>
                <div className="cx-tl__title">{t.title}</div>
                <div className="cx-tl__desc">{t.desc}</div>
              </button>
            </div>
          ))}
        </div>

        {/* 世界事件 */}
        <div className="cx-sechead"><span className="cx-sechead__t">世界事件</span></div>
        {worldEvents.length ? (
          worldEvents.slice(0, 5).map((e) => (
            <Row
              key={e.id}
              icon={<Sparkles size={15} />}
              title={e.title}
              sub={e.description}
              right={<span className="cx-tag">{e.type}</span>}
              onClick={() => nav.push({ view: 'event', id: e.id })}
              arrow
            />
          ))
        ) : (
          <Empty icon={<Sparkles size={26} />} text="Mul市此刻很安静" hint="去「管理」里推动一个事件" />
        )}

        <div className="cx-sechead"><span className="cx-sechead__t">关于我</span></div>
        <Card>
          <Row
            icon={<Users size={15} />}
            title={me.name}
            sub={`${me.occupation} · ${me.rank} · 信用 ${me.attributes.socialCredit}`}
            right={<span className="cx-tag">{me.civilId}</span>}
            onClick={() => nav.push({ view: 'person', id: me.id })}
            arrow
          />
          {/* 在线居民抽样 */}
          <div className="cx-row__sub" style={{ marginTop: 2 }}>
            此刻在线：{people.filter((p) => p.isOnline && p.id !== me.id).slice(0, 6).map((p) => p.name).join('、') || '只有你'}
          </div>
        </Card>
      </div>

      {/* AI 输入 */}
      <div className="cx-quick">
        {['找附近有猫的地方', '今晚哪里热闹', '能看海的地方'].map((q) => (
          <button key={q} className="cx-quick__btn fx-press" onClick={() => { setQuery(q); void onSearch(q) }}>{q}</button>
        ))}
      </div>
      <div className="cx-ai">
        <div className="cx-ai__field">
          <textarea
            rows={1}
            placeholder="告诉 Mul市 你想做什么…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void onSearch(query)
              }
            }}
          />
          <button className="cx-ai__icon fx-press" onClick={() => fileRef.current?.click()} aria-label="传图">
            <ImagePlus size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPickImage(f)
              e.target.value = ''
            }}
          />
        </div>
        <button className="cx-ai__send fx-press" disabled={busy} onClick={() => void onSearch(query)} aria-label="发送">
          <Send size={17} />
        </button>
      </div>
      {!hasCityAi() && (
        <div className="cx-muted" style={{ padding: '0 16px 8px', fontSize: 'calc(9.5px * var(--fs-scale))' }}>
          未接入 LLM，当前使用本地检索与场景兜底
        </div>
      )}
    </>
  )
}

function landmarkName(list: Landmark[], id: string): string {
  return list.find((l) => l.id === id)?.name ?? '城里'
}

function matches(l: Landmark, kw: string): boolean {
  return (l.name + l.type + l.description).includes(kw)
}
