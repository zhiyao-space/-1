import { useMemo, useRef, useState } from 'react'
import { BadgeCheck, Download, Search, Sparkles, UserPlus, Users, Wand2 } from 'lucide-react'
import { HOBBY_TAGS, JOBS, OCCUPATIONS, PERSONALITY_TAGS, SKILL_POOL, randInt } from '../../lib/cityCatalog'
import { generatePersonDrafts, hasCityAi, type PersonDraft } from '../../lib/cityEngine'
import { districtById, landmarkById, useMe, useMulCity, visiblePeople, type PersonAttrs, type PersonType } from '../../store/mulCity'
import { AttrGrid, Avatar, Card, ChipRow, Empty, Field, IdCard, PersonRow, Progress, Row, Sheet, SubTabs, fmtDateFull } from './cityParts'
import { useCityNav } from './cityNav'

/* ============================================================
   Tab2 · 市籍（身份系统）
   我的档案 | 全城居民 | 申请新身份
   ============================================================ */

type Sub = 'me' | 'all' | 'new'
const SUBS: { key: Sub; label: string }[] = [
  { key: 'me', label: '我的档案' },
  { key: 'all', label: '全城居民' },
  { key: 'new', label: '申请新身份' },
]

export default function CivilTab() {
  const [sub, setSub] = useState<Sub>('me')
  return (
    <>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === 'me' && <MyProfile />}
      {sub === 'all' && <AllResidents />}
      {sub === 'new' && <NewIdentity />}
    </>
  )
}

/* ---------- 我的档案 ---------- */

function MyProfile() {
  const me = useMe()
  const updatePerson = useMulCity((s) => s.updatePerson)
  const city = useMulCity((s) => s.city)
  const nav = useCityNav()
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(me)
  const [alloc, setAlloc] = useState(false)
  const [pool, setPool] = useState(30)
  const [attrDraft, setAttrDraft] = useState<PersonAttrs>(me.attributes)

  const home = landmarkById(city, me.lastSeenLocation)
  const quotaUsed = ['intelligence', 'emotional', 'aesthetic', 'courage', 'fitness', 'luck'] as const
  const badges = useMemo(() => {
    const list: { name: string; got: boolean }[] = [
      { name: '初来报到', got: true },
      { name: '稳定居民', got: me.attributes.level >= 2 },
      { name: '资深市民', got: me.attributes.level >= 4 },
      { name: '城市名流', got: me.attributes.level >= 7 },
      { name: '公益之星', got: me.attributes.cityContribution >= 200 },
    ]
    return list
  }, [me.attributes])

  const save = () => {
    updatePerson(me.id, {
      avatar: draft.avatar,
      nickname: draft.nickname,
      occupation: draft.occupation,
      bio: draft.bio,
      hobbies: draft.hobbies,
      phone: draft.phone,
    })
    setEdit(false)
  }

  const bump = (k: keyof PersonAttrs, d: number) => {
    const cur = attrDraft[k] as number
    const next = cur + d
    if (d > 0 && pool <= 0) return
    if (next < 50 || next > 80) return
    setAttrDraft((a) => ({ ...a, [k]: next }))
    setPool((p) => p - d)
  }

  return (
    <div className="cx-scroll">
      <IdCard person={me} />

      <div className="cx-acts" style={{ marginTop: 12 }}>
        <button className="fx-btn fx-btn--front fx-press" onClick={() => { setDraft(me); setEdit(true) }}>编辑档案</button>
        <button className="fx-btn fx-press" onClick={() => { setAttrDraft(me.attributes); setPool(30); setAlloc(true) }}>六维分配</button>
        <button className="fx-btn fx-press" onClick={() => nav.goTab('travel')}>办理出行票</button>
        <button className="fx-btn fx-press" onClick={() => nav.goTab('show')}>看演出</button>
      </div>

      <div className="cx-stats" style={{ marginTop: 14 }}>
        <div className="cx-stat"><b>LV.{me.attributes.level}</b><span>{me.rank}</span></div>
        <div className="cx-stat"><b>{me.attributes.cityContribution}</b><span>城市贡献</span></div>
        <div className="cx-stat"><b>{me.attributes.socialCredit}</b><span>信用评级</span></div>
      </div>

      <div className="cx-sechead"><span className="cx-sechead__t">成长进度</span><span className="cx-sechead__sub">距离下一级</span></div>
      <Card>
        <Progress value={me.attributes.cityContribution % 100} />
        <div className="cx-row__sub" style={{ marginTop: 7 }}>
          贡献 {me.attributes.cityContribution % 100}/100 · 参与社区活动、志愿服务、纳税可累积
        </div>
        <div className="cx-hr" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {badges.map((b) => (
            <span key={b.name} className={`cx-tag ${b.got ? 'cx-tag--on' : ''}`}>
              {b.got && <BadgeCheck size={11} />} {b.name}
            </span>
          ))}
        </div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">六维属性</span></div>
      <AttrGrid attrs={me.attributes} />

      <div className="cx-sechead"><span className="cx-sechead__t">市籍信息</span></div>
      <Card>
        <Row title="市籍编号" right={me.civilId} />
        <Row title="登记日期" right={fmtDateFull(me.createdAt)} />
        <Row title="户籍地址" right={me.address} />
        <Row title="当前所在地" right={home?.name ?? '未知'} onClick={() => home && nav.push({ view: 'landmark', id: home.id })} arrow={!!home} />
        <Row title="出生地 / 生日" right={`${me.birthPlace} · ${me.birthday}`} />
        <Row title="电话" right={me.phone} />
        <Row title="技能" right={me.skills.join('、') || '—'} />
        <Row title="收入 / 支出" right={`¥${me.monthlyIncome} / ¥${me.monthlyExpenses}`} />
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">个人简介</span></div>
      <Card><div className="cx-row__sub" style={{ marginTop: 0 }}>{me.bio || '还没有写简介。'}</div></Card>

      <Sheet open={edit} onClose={() => setEdit(false)} title="编辑市籍档案">
        <Field label="昵称">
          <input className="fx-input" value={draft.nickname} onChange={(e) => setDraft({ ...draft, nickname: e.target.value })} />
        </Field>
        <Field label="头像地址（可留空）">
          <input className="fx-input" placeholder="https://…" value={draft.avatar} onChange={(e) => setDraft({ ...draft, avatar: e.target.value })} />
        </Field>
        <Field label="职业">
          <input className="fx-input" value={draft.occupation} onChange={(e) => setDraft({ ...draft, occupation: e.target.value })} />
        </Field>
        <Field label="电话">
          <input className="fx-input" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </Field>
        <Field label="兴趣标签">
          <ChipRow
            options={HOBBY_TAGS}
            value={draft.hobbies}
            onToggle={(v) =>
              setDraft((d) => ({ ...d, hobbies: d.hobbies.includes(v) ? d.hobbies.filter((x) => x !== v) : [...d.hobbies, v] }))
            }
          />
        </Field>
        <Field label="个人简介">
          <textarea className="fx-textarea" rows={3} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
        </Field>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={save}>保存</button>
      </Sheet>

      <Sheet open={alloc} onClose={() => setAlloc(false)} title={`六维分配 · 剩余 ${pool} 点`}>
        <div className="cx-attrs">
          {quotaUsed.map((k) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="cx-attr cx-attr--alloc fx-press" onClick={() => bump(k, 1)}>
                <b>{attrDraft[k] as number}</b>
                <span>{ATTR_CN[k]}</span>
              </button>
              <button className="fx-btn fx-btn--soft fx-press" style={{ minHeight: 30, fontSize: 'calc(11px * var(--fs-scale))' }} onClick={() => bump(k, -1)}>−1</button>
            </div>
          ))}
        </div>
        <div className="cx-row__sub" style={{ margin: '10px 2px' }}>基础 50，上限 80，共 30 点自由分配。</div>
        <button
          className="fx-btn fx-btn--accent fx-press"
          style={{ width: '100%' }}
          disabled={pool > 0}
          onClick={() => {
            const total = quotaUsed.reduce((s, k) => s + (attrDraft[k] as number), 0)
            updatePerson(me.id, { attributes: { ...attrDraft, level: Math.max(1, Math.min(10, Math.round(total / 60))) } })
            setAlloc(false)
          }}
        >
          {pool > 0 ? `还需分配 ${pool} 点` : '确认分配'}
        </button>
      </Sheet>
    </div>
  )
}

const ATTR_CN: Record<string, string> = {
  intelligence: '智商',
  emotional: '情商',
  aesthetic: '审美',
  courage: '魄力',
  fitness: '体质',
  luck: '运气',
}

/* ---------- 全城居民 ---------- */

function AllResidents() {
  const people = useMulCity((s) => s.people)
  const city = useMulCity((s) => s.city)
  const nav = useCityNav()
  const [type, setType] = useState<PersonType | 'all'>('all')
  const [district, setDistrict] = useState<string>('')
  const [kw, setKw] = useState('')
  const [occ, setOcc] = useState('')
  const [teleport, setTeleport] = useState(false)

  const occupations = useMemo(() => Array.from(new Set(people.map((p) => p.occupation))).slice(0, 14), [people])
  const list = useMemo(
    () => visiblePeople(people, { type, districtId: district || undefined, keyword: kw || undefined }).filter((p) => !occ || p.occupation === occ),
    [people, type, district, kw, occ]
  )

  return (
    <div className="cx-scroll">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="cx-ai__field" style={{ padding: '0 8px 0 12px', flex: 1 }}>
          <Search size={15} className="cx-muted" />
          <input
            className="fx-input"
            style={{ background: 'none', boxShadow: 'none', padding: '10px 0', height: 38 }}
            placeholder="按姓名搜索居民"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
          />
        </div>
        <button className="cx-mapbtn fx-press" onClick={() => setTeleport(true)} aria-label="快速传送"><Sparkles size={15} /></button>
      </div>

      <div className="cx-chips" style={{ marginTop: 10 }}>
        {(['all', 'user', 'character', 'npc'] as const).map((t) => (
          <button key={t} className={`cx-tag ${type === t ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setType(t)}>
            {t === 'all' ? '全部' : t === 'user' ? '用户' : t === 'character' ? '角色' : 'NPC'}
          </button>
        ))}
      </div>
      <div className="cx-chips">
        <button className={`cx-tag ${!district ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setDistrict('')}>全部区域</button>
        {city.districts.map((d) => (
          <button key={d.id} className={`cx-tag ${district === d.id ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setDistrict(d.id)}>{d.name}</button>
        ))}
      </div>
      <div className="cx-chips">
        <button className={`cx-tag ${!occ ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setOcc('')}>全部职业</button>
        {occupations.map((o) => (
          <button key={o} className={`cx-tag ${occ === o ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setOcc(o)}>{o}</button>
        ))}
      </div>

      <div className="cx-sechead"><span className="cx-sechead__t">{list.length} 位居民</span></div>
      {list.length ? (
        list.map((p) => (
          <PersonRow key={p.id} person={p} onClick={() => nav.push({ view: 'person', id: p.id })} arrow />
        ))
      ) : (
        <Empty icon={<Users size={28} />} text="没有符合条件的居民" hint="试试放宽筛选" />
      )}

      <Sheet open={teleport} onClose={() => setTeleport(false)} title="快速传送 · 选择居民">
        <div className="cx-row__sub" style={{ marginBottom: 10 }}>传送到 Ta 当前所在的位置。</div>
        {people.slice(0, 24).map((p) => {
          const lm = landmarkById(city, p.lastSeenLocation)
          return (
            <Row
              key={p.id}
              thumb={<Avatar person={p} size={38} />}
              title={p.name}
              sub={lm ? `在 ${lm.name}` : '位置未知'}
              onClick={() => {
                setTeleport(false)
                if (lm) nav.push({ view: 'landmark', id: lm.id })
              }}
              arrow
            />
          )
        })}
      </Sheet>
    </div>
  )
}

/* ---------- 申请新身份 ---------- */

const EMPTY_FORM = {
  desc: '',
  name: '',
  nickname: '',
  avatar: '',
  gender: 'other' as 'male' | 'female' | 'other',
  age: 24,
  birthday: '01-01',
  birthPlace: '',
  address: '',
  districtId: 'd_center',
  occupation: OCCUPATIONS[0],
  personality: [] as string[],
  hobbies: [] as string[],
  skills: [] as string[],
}

function NewIdentity() {
  const city = useMulCity((s) => s.city)
  const createPerson = useMulCity((s) => s.createPerson)
  const createNpcs = useMulCity((s) => s.createNpcs)
  const importCharacters = useMulCity((s) => s.importCharacters)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const applyDraft = (d: PersonDraft) => {
    setForm((f) => ({
      ...f,
      name: d.name || f.name,
      nickname: d.nickname || f.nickname,
      gender: d.gender,
      age: d.age,
      birthPlace: d.birthPlace || f.birthPlace,
      address: d.address || f.address,
      occupation: d.occupation || f.occupation,
      personality: d.personality,
      hobbies: d.hobbies.length ? d.hobbies : f.hobbies,
      desc: d.bio || f.desc,
    }))
    setMsg('AI 已填好档案，检查后提交登记。')
  }

  const aiFill = async () => {
    setBusy(true)
    setMsg('正在生成档案…')
    const drafts = await generatePersonDrafts(form.desc || form.name || '一位有故事的 Mul市 新居民', 1)
    if (drafts[0]) applyDraft(drafts[0])
    else setMsg(hasCityAi() ? '生成失败，请重试。' : '未接入 LLM，已使用本地模板。')
    setBusy(false)
  }

  const submit = () => {
    if (!form.name.trim()) {
      setMsg('请先填写姓名。')
      return
    }
    const district = districtById(city, form.districtId)
    const landmarkId = district?.landmarks[randInt(0, Math.max(0, district.landmarks.length - 1))] ?? 'lm_square'
    createPerson({
      type: 'user',
      name: form.name.trim(),
      nickname: form.nickname.trim() || form.name.trim(),
      avatar: form.avatar,
      gender: form.gender,
      age: form.age,
      birthday: form.birthday,
      birthPlace: form.birthPlace || district?.name,
      address: form.address || `${district?.name ?? '市中心'}一带`,
      occupation: form.occupation,
      bio: form.desc,
      hobbies: form.hobbies,
      skills: form.skills,
      lastSeenLocation: landmarkId,
      isOnline: true,
    })
    setMsg(`市籍登记完成：${form.name}。`)
    setForm(EMPTY_FORM)
  }

  const quickNpc = () => {
    const ids = createNpcs(randInt(3, 5), { districtId: form.districtId || undefined, occupation: form.occupation || undefined })
    setMsg(`已生成 ${ids.length} 位 NPC，自动落位到 Mul市 各区域。`)
  }

  const importCards = () => {
    const n = importCharacters()
    setMsg(n > 0 ? `已从恋爱 App 导入 ${n} 位角色卡。` : '没有可导入的角色卡（或已全部导入）。')
  }

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result)) as { name?: string; identity?: string; personality?: string; description?: string }
        setForm((f) => ({
          ...f,
          name: json.name ?? f.name,
          occupation: json.identity ?? f.occupation,
          desc: json.personality ?? json.description ?? f.desc,
        }))
        setMsg('角色卡已读取，检查后提交登记。')
      } catch {
        setMsg('角色卡解析失败，请确认是 JSON 格式。')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="cx-scroll">
      <Card front>
        <div className="cx-row__title"><Wand2 size={15} /> AI 自动生成完整档案</div>
        <div className="cx-row__sub">用一句话描述，程行会补全姓名、职业、性格、兴趣与六维。</div>
        <textarea
          className="fx-textarea"
          rows={2}
          style={{ marginTop: 10 }}
          placeholder="例如：一位刚到 Mul市 的录音师，话少但很会听。"
          value={form.desc}
          onChange={(e) => set('desc', e.target.value)}
        />
        <div className="cx-acts" style={{ marginTop: 10 }}>
          <button className="fx-btn fx-btn--accent fx-press" onClick={() => void aiFill()} disabled={busy}>
            <Sparkles size={14} /> {busy ? '生成中…' : 'AI 自动生成'}
          </button>
          <button className="fx-btn fx-press" onClick={quickNpc}><Users size={14} /> 快速生成 NPC</button>
          <button className="fx-btn fx-press" onClick={importCards}><Download size={14} /> 导入角色卡</button>
          <button className="fx-btn fx-press" onClick={() => fileRef.current?.click()}>从 JSON 导入</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
        </div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">登记表单</span></div>
      <Card>
        <Field label="姓名">
          <input className="fx-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="必填" />
        </Field>
        <Field label="昵称">
          <input className="fx-input" value={form.nickname} onChange={(e) => set('nickname', e.target.value)} />
        </Field>
        <Field label="头像地址（可留空）">
          <input className="fx-input" placeholder="https://…" value={form.avatar} onChange={(e) => set('avatar', e.target.value)} />
        </Field>
        <div className="cx-2col">
          <Field label="性别">
            <select className="fx-input" value={form.gender} onChange={(e) => set('gender', e.target.value as typeof form.gender)}>
              <option value="female">女</option>
              <option value="male">男</option>
              <option value="other">其他</option>
            </select>
          </Field>
          <Field label="年龄">
            <input className="fx-input" type="number" value={form.age} onChange={(e) => set('age', Number(e.target.value) || 0)} />
          </Field>
        </div>
        <div className="cx-2col">
          <Field label="生日">
            <input className="fx-input" placeholder="MM-DD" value={form.birthday} onChange={(e) => set('birthday', e.target.value)} />
          </Field>
          <Field label="出生地">
            <input className="fx-input" value={form.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} />
          </Field>
        </div>
        <Field label="户籍区域">
          <select className="fx-input" value={form.districtId} onChange={(e) => set('districtId', e.target.value)}>
            {city.districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field label="详细住址（可留空）">
          <input className="fx-input" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="职业">
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="fx-input" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} />
            <select className="fx-input" style={{ width: 130 }} value="" onChange={(e) => e.target.value && set('occupation', e.target.value)}>
              <option value="">预设…</option>
              {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </Field>
        <Field label="性格标签">
          <ChipRow options={PERSONALITY_TAGS} value={form.personality} onToggle={(v) => set('personality', toggle(form.personality, v))} />
        </Field>
        <Field label="兴趣标签">
          <ChipRow options={HOBBY_TAGS} value={form.hobbies} onToggle={(v) => set('hobbies', toggle(form.hobbies, v))} />
        </Field>
        <Field label="技能">
          <ChipRow options={SKILL_POOL} value={form.skills} onToggle={(v) => set('skills', toggle(form.skills, v))} />
        </Field>
      </Card>

      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px' }}>{msg}</div>}

      <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%', marginTop: 12 }} onClick={submit}>
        <UserPlus size={15} /> 提交市籍登记
      </button>

      <div className="cx-sechead"><span className="cx-sechead__t">已开放职业</span></div>
      {JOBS.slice(0, 6).map((j) => (
        <Row key={j.id} title={j.title} sub={j.desc} right={<span className="cx-price">¥{j.salary}</span>} />
      ))}
    </div>
  )
}

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}
