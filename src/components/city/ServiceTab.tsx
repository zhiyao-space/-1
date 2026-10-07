import { useState } from 'react'
import {
  Activity,
  Clock,
  Cross,
  GraduationCap,
  Landmark,
  Mail,
  Pill,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react'
import { randInt } from '../../lib/cityCatalog'
import { generateDiagnosis, hasCityAi } from '../../lib/cityEngine'
import { useMe, useMulCity, type Loan } from '../../store/mulCity'
import { Card, Empty, Field, PersonRow, Row, SubTabs, Stat, fmtWhen } from './cityParts'
import { useCityNav } from './cityNav'

/* ============================================================
   Tab5 · 公共服务
   医院 | 银行 | 学校 | 其他（派出所 / 邮局 / 社区中心）
   ============================================================ */

type Sub = 'hospital' | 'bank' | 'school' | 'other'
const SUBS: { key: Sub; label: string }[] = [
  { key: 'hospital', label: '医院' },
  { key: 'bank', label: '银行' },
  { key: 'school', label: '学校' },
  { key: 'other', label: '其他' },
]

export default function ServiceTab() {
  const [sub, setSub] = useState<Sub>('hospital')
  return (
    <>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === 'hospital' && <HospitalPanel />}
      {sub === 'bank' && <BankPanel />}
      {sub === 'school' && <SchoolPanel />}
      {sub === 'other' && <OtherPanel />}
    </>
  )
}

/* ---------- 支付助手 ---------- */

function usePay() {
  const me = useMe()
  const banks = useMulCity((s) => s.banks)
  const ensureBank = useMulCity((s) => s.ensureBank)
  const bankWithdraw = useMulCity((s) => s.bankWithdraw)
  const balance = banks.find((b) => b.personId === me.id)?.balance ?? me.bankAccount
  const pay = (amount: number): boolean => {
    ensureBank(me.id)
    return bankWithdraw(me.id, amount)
  }
  return { pay, balance, me }
}

/* ============================================================
   医院
   ============================================================ */

const DEPTS: { name: string; desc: string; cost: number }[] = [
  { name: '内科', desc: '发热、咳嗽、肠胃不适', cost: 80 },
  { name: '外科', desc: '外伤、扭伤、换药', cost: 120 },
  { name: '心理科', desc: '情绪、睡眠、压力', cost: 200 },
  { name: '体检', desc: '全身体检，出具健康报告', cost: 300 },
]

function HospitalPanel() {
  const me = useMe()
  const records = useMulCity((s) => s.medicalRecords)
  const addMedical = useMulCity((s) => s.addMedical)
  const updatePerson = useMulCity((s) => s.updatePerson)
  const { pay, balance } = usePay()
  const [dept, setDept] = useState('')
  const [stage, setStage] = useState<'idle' | 'queue' | 'consult'>('idle')
  const [queue, setQueue] = useState(0)
  const [symptom, setSymptom] = useState('')
  const [result, setResult] = useState<{ diagnosis: string; advice: string; prescription: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const deptCost = DEPTS.find((d) => d.name === dept)?.cost ?? 0
  const myRecords = records.filter((r) => r.personId === me.id).slice(0, 4)

  const enter = (name: string) => {
    setDept(name)
    setResult(null)
    setMsg('')
    if (name === '体检') {
      runPhysical()
      return
    }
    setQueue(randInt(1, 7))
    setStage('queue')
  }

  const runPhysical = () => {
    if (!pay(300)) {
      setMsg(`余额不足（¥${balance.toFixed(0)}）`)
      return
    }
    const score = Math.round((me.attributes.fitness + me.health) / 2)
    const delta = score >= 80 ? 1 : score >= 60 ? 0 : -1
    updatePerson(me.id, {
      health: Math.max(30, Math.min(100, me.health + delta * 2)),
      attributes: { ...me.attributes, fitness: Math.max(20, Math.min(95, me.attributes.fitness + delta)) },
    })
    addMedical({
      personId: me.id,
      dept: '体检',
      symptom: '常规体检',
      diagnosis: `综合评分 ${score} 分，${score >= 80 ? '各项指标良好' : score >= 60 ? '基本正常，注意作息' : '体质偏弱，建议规律锻炼'}`,
      prescription: [],
      cost: 300,
    })
    setDept('体检')
    setStage('consult')
    setResult({
      diagnosis: `体检报告 · 综合评分 ${score}`,
      advice: delta >= 0 ? '继续保持规律作息与运动。' : '近期减少熬夜，下周复检一次。',
      prescription: [],
    })
  }

  const consult = async () => {
    if (!symptom.trim()) {
      setMsg('请先描述症状。')
      return
    }
    if (!pay(deptCost)) {
      setMsg(`余额不足（¥${balance.toFixed(0)}）`)
      return
    }
    setBusy(true)
    const out = await generateDiagnosis(symptom, dept)
    const final =
      out ||
      {
        diagnosis: '轻度疲劳综合征，暂时没有大碍。',
        advice: '多喝水，早点睡，三天内没有好转再来复诊。',
        prescription: ['维生素C', '感冒冲剂'],
      }
    addMedical({ personId: me.id, dept, symptom, diagnosis: final.diagnosis, prescription: final.prescription, cost: deptCost })
    setResult(final)
    setBusy(false)
    setStage('consult')
  }

  return (
    <div className="cx-scroll">
      <div className="cx-sechead"><span className="cx-sechead__t">Mul市社区医院</span><span className="cx-sechead__sub">余额 ¥{balance.toLocaleString()}</span></div>
      <div className="cx-dept-grid">
        {DEPTS.map((d) => (
          <button key={d.name} className="cx-dept fx-press" onClick={() => enter(d.name)}>
            <b>{d.name}</b>
            <span>{d.desc}</span>
            <span style={{ marginTop: 6, color: 'var(--fx-t2)' }}>挂号 ¥{d.cost}</span>
          </button>
        ))}
      </div>

      {stage === 'queue' && dept && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">候诊中 · {dept}</span></div>
          <Card front>
            <div className="cx-stats">
              <Stat value={queue} label="前面排队" />
              <Stat value={`${queue * 6} 分`} label="预计等待" />
              <Stat value={deptCost} label="挂号费" />
            </div>
            <div className="cx-row__sub" style={{ marginTop: 10 }}>候诊区坐满了人，广播每隔一会儿念一个号。</div>
            <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%', marginTop: 10 }} onClick={() => setStage('consult')}>
              已叫到号，进入诊室
            </button>
          </Card>
        </>
      )}

      {stage === 'consult' && dept && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">{dept} 诊室</span></div>
          <Card front>
            {dept !== '体检' && (
              <>
                <Field label="描述你的症状">
                  <textarea className="fx-textarea" rows={3} value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="例如：这两天总睡不着，白天没什么精神。" />
                </Field>
                <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={() => void consult()} disabled={busy}>
                  <Stethoscope size={14} /> {busy ? '医生正在诊断…' : `就诊（¥${deptCost}）`}
                </button>
              </>
            )}
            {result && (
              <div style={{ marginTop: dept === '体检' ? 0 : 12 }}>
                <div className="cx-hr" />
                <Row icon={<Activity size={15} />} title="诊断" sub={result.diagnosis} />
                <Row icon={<Pill size={15} />} title="医嘱" sub={result.advice} />
                {result.prescription.length > 0 && (
                  <>
                    <div className="cx-row__sub" style={{ marginTop: 4 }}>处方（已放入背包）</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {result.prescription.map((p) => <span key={p} className="cx-tag cx-tag--front"><Pill size={10} /> {p}</span>)}
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: '#ff8a8a' }}>{msg}</div>}
      {!hasCityAi() && stage === 'consult' && dept !== '体检' && (
        <div className="cx-muted" style={{ fontSize: 'calc(9.5px * var(--fs-scale))', margin: '0 2px 8px' }}>未接入 LLM，诊断使用本地兜底</div>
      )}

      <div className="cx-sechead"><span className="cx-sechead__t">我的就诊记录</span></div>
      {myRecords.length ? (
        myRecords.map((r) => (
          <Card key={r.id}>
            <div className="cx-row__title"><Cross size={14} /> {r.dept}<span className="cx-tag" style={{ marginLeft: 'auto' }}>¥{r.cost}</span></div>
            <div className="cx-row__sub">{r.diagnosis}</div>
            <div className="cx-muted" style={{ fontSize: 'calc(10px * var(--fs-scale))', marginTop: 4 }}>{fmtWhen(r.at)}</div>
          </Card>
        ))
      ) : (
        <Empty icon={<Cross size={26} />} text="还没有就诊记录" />
      )}
    </div>
  )
}

/* ============================================================
   银行
   ============================================================ */

const FUNDS = [
  { name: '稳健定期 · 90 天', rate: 0.03, risk: '低风险' },
  { name: '城市成长基金', rate: 0.09, risk: '中风险' },
  { name: '新锐科技混合', rate: 0.2, risk: '高风险' },
]

function BankPanel() {
  const me = useMe()
  const banks = useMulCity((s) => s.banks)
  const ensureBank = useMulCity((s) => s.ensureBank)
  const bankDeposit = useMulCity((s) => s.bankDeposit)
  const bankWithdraw = useMulCity((s) => s.bankWithdraw)
  const applyLoan = useMulCity((s) => s.applyLoan)
  const applyCreditCard = useMulCity((s) => s.applyCreditCard)
  const payBill = useMulCity((s) => s.payBill)
  const [amount, setAmount] = useState(500)
  const [msg, setMsg] = useState('')
  const [loanKind, setLoanKind] = useState<Loan['kind']>('credit')
  const [fund, setFund] = useState(FUNDS[0].name)

  const bank = banks.find((b) => b.personId === me.id)
  const balance = bank?.balance ?? me.bankAccount
  const creditLimit = bank?.creditLimit ?? 0

  const doDeposit = () => {
    ensureBank(me.id)
    bankDeposit(me.id, amount)
    setMsg(`存入 ¥${amount}。`)
  }
  const doWithdraw = () => {
    ensureBank(me.id)
    setMsg(bankWithdraw(me.id, amount) ? `取出 ¥${amount}。` : '余额不足，取款失败。')
  }
  const doLoan = () => {
    ensureBank(me.id)
    const res = applyLoan(me.id, loanKind, amount)
    setMsg(res.ok ? `贷款 ¥${amount} 已到账。` : res.reason ?? '贷款失败')
  }
  const doCard = () => {
    ensureBank(me.id)
    const limit = Math.round(3000 + me.attributes.socialCredit * 40)
    applyCreditCard(me.id, limit)
    setMsg(`信用卡申请通过，额度 ¥${limit}。`)
  }
  const doInvest = () => {
    const product = FUNDS.find((f) => f.name === fund)!
    if (!bankWithdraw(me.id, amount)) {
      setMsg('余额不足，无法购买理财。')
      return
    }
    const swing = product.rate * (Math.random() * 2 - 0.6)
    const gain = Math.round(amount * swing)
    const back = Math.max(0, amount + gain)
    bankDeposit(me.id, back)
    setMsg(`${product.name} 到期结算：${gain >= 0 ? '收益' : '亏损'} ¥${Math.abs(gain)}，到账 ¥${back}。`)
  }

  return (
    <div className="cx-scroll">
      <Card front>
        <div className="cx-row__title"><Landmark size={15} /> Mul市 市民银行</div>
        <div className="cx-stats" style={{ marginTop: 12 }}>
          <Stat value={`¥${balance.toLocaleString()}`} label="账户余额" />
          <Stat value={`¥${creditLimit.toLocaleString()}`} label="信用额度" />
          <Stat value={me.attributes.socialCredit} label="社信评级" />
        </div>
        {!bank && <button className="fx-btn fx-press" style={{ width: '100%', marginTop: 10 }} onClick={() => { ensureBank(me.id); setMsg('开户成功。') }}>一键开户</button>}
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">存取款</span></div>
      <Card>
        <Field label="金额">
          <input className="fx-input" type="number" value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
        </Field>
        <div className="cx-acts">
          <button className="fx-btn fx-btn--front fx-press" onClick={doDeposit}>存入</button>
          <button className="fx-btn fx-press" onClick={doWithdraw}>取出</button>
          {[200, 1000, 5000].map((n) => (
            <button key={n} className="fx-btn fx-btn--soft fx-press" onClick={() => setAmount(n)}>¥{n}</button>
          ))}
        </div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">贷款与信用卡</span></div>
      <Card>
        <Field label="贷款类型">
          <select className="fx-input" value={loanKind} onChange={(e) => setLoanKind(e.target.value as Loan['kind'])}>
            <option value="credit">消费贷 · 利率 12%</option>
            <option value="car">车贷 · 利率 4.5%</option>
            <option value="mortgage">房贷 · 利率 4.5%</option>
          </select>
        </Field>
        <div className="cx-acts">
          <button className="fx-btn fx-btn--front fx-press" onClick={doLoan}>申请贷款</button>
          <button className="fx-btn fx-press" onClick={doCard}><Wallet size={14} /> 申请信用卡</button>
        </div>
        <div className="cx-row__sub" style={{ marginTop: 6 }}>额度与等级、社信、收入挂钩。房贷 / 车贷需 LV.2 以上。</div>
      </Card>

      {(bank?.loans.length ?? 0) > 0 && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">我的贷款</span></div>
          {bank!.loans.map((l) => (
            <Row
              key={l.id}
              icon={<Wallet size={15} />}
              title={l.kind === 'mortgage' ? '房贷' : l.kind === 'car' ? '车贷' : '消费贷'}
              sub={`剩余 ¥${l.remaining.toLocaleString()} · 利率 ${(l.rate * 100).toFixed(1)}% · ${l.months} 期`}
              right={<span className="cx-price">¥{l.principal.toLocaleString()}</span>}
            />
          ))}
        </>
      )}

      <div className="cx-sechead"><span className="cx-sechead__t">理财</span></div>
      <Card>
        <Field label="产品">
          <select className="fx-input" value={fund} onChange={(e) => setFund(e.target.value)}>
            {FUNDS.map((f) => <option key={f.name} value={f.name}>{f.name} · 参考 {(f.rate * 100).toFixed(0)}% · {f.risk}</option>)}
          </select>
        </Field>
        <button className="fx-btn fx-btn--front fx-press" style={{ width: '100%' }} onClick={doInvest}>买入 ¥{amount}（到期结算）</button>
        <div className="cx-row__sub" style={{ marginTop: 6 }}>高风险产品收益与亏损都更剧烈，请留意余额。</div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">账单管理</span></div>
      {(bank?.bills.length ?? 0) > 0 ? (
        bank!.bills.map((b) => (
          <Row
            key={b.id}
            icon={<Clock size={15} />}
            title={b.title}
            sub={`${b.paid ? '已缴清' : `${fmtWhen(b.dueAt)}到期`}`}
            right={
              b.paid ? (
                <span className="cx-tag">已缴</span>
              ) : (
                <button className="cx-tag cx-tag--on fx-press" onClick={() => { payBill(me.id, b.id); setMsg(`已缴纳「${b.title}」¥${b.amount}。`) }}>缴纳 ¥{b.amount}</button>
              )
            }
          />
        ))
      ) : (
        <Empty icon={<Clock size={26} />} text="没有待缴账单" />
      )}

      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: 'var(--fx-t2)' }}>{msg}</div>}
    </div>
  )
}

/* ============================================================
   学校 / 培训机构
   ============================================================ */

const UNIVERSITIES = [
  { name: 'Mul市 大学', rank: 1, bonus: '毕业后月薪 +22%' },
  { name: '海滨理工学院', rank: 2, bonus: '毕业后月薪 +16%' },
  { name: '老城文理学院', rank: 3, bonus: '毕业后月薪 +11%' },
]

function SchoolPanel() {
  const courses = useMulCity((s) => s.courses)
  const enrolls = useMulCity((s) => s.courseEnrolls)
  const people = useMulCity((s) => s.people)
  const enrollCourse = useMulCity((s) => s.enrollCourse)
  const finishCourse = useMulCity((s) => s.finishCourse)
  const { balance } = usePay()
  const [msg, setMsg] = useState('')

  const mine = enrolls.filter((e) => e.personId === 'person_me')
  const students = people.filter((p) => p.occupation === '学生').length

  return (
    <div className="cx-scroll">
      <Card front>
        <div className="cx-row__title"><GraduationCap size={15} /> Mul市 技能培训中心</div>
        <div className="cx-row__sub">报名 → 上课 → 考试 → 获得技能等级。余额 ¥{balance.toLocaleString()}</div>
        <div className="cx-stats" style={{ marginTop: 12 }}>
          <Stat value={courses.length} label="在招课程" />
          <Stat value={students} label="在读学生" />
          <Stat value={mine.filter((m) => m.done).length} label="已结课" />
        </div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">技能培训班</span></div>
      {courses.map((c) => {
        const enr = mine.find((e) => e.courseId === c.id)
        const dis = !!enr && !enr.done
        return (
          <Card key={c.id}>
            <div className="cx-row__title">{c.title}<span className="cx-tag" style={{ marginLeft: 'auto' }}>{c.skill} Lv.{c.level}</span></div>
            <div className="cx-row__sub">{c.weeks} 周 · 讲师 {c.teacher}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span className="cx-price">¥{c.price}</span>
              {enr?.done ? (
                <span className="cx-tag cx-tag--on">已获得「{c.skill}」 · 成绩 {enr.score}</span>
              ) : enr ? (
                <button className="fx-btn fx-btn--accent fx-press" style={{ marginLeft: 'auto' }} onClick={() => { finishCourse(enr.id); setMsg(`完成《${c.title}》，获得技能「${c.skill}」。`) }}>上课并考试</button>
              ) : (
                <button
                  className="fx-btn fx-btn--front fx-press"
                  style={{ marginLeft: 'auto' }}
                  disabled={dis}
                  onClick={() => { const r = enrollCourse(c.id); setMsg(r.ok ? `已报名《${c.title}》。` : r.reason ?? '报名失败') }}
                >
                  报名
                </button>
              )}
            </div>
          </Card>
        )
      })}

      <div className="cx-sechead"><span className="cx-sechead__t">大学排名</span></div>
      {UNIVERSITIES.map((u) => (
        <Row key={u.name} icon={<GraduationCap size={15} />} title={`${u.rank}. ${u.name}`} sub={u.bonus} />
      ))}

      <div className="cx-sechead"><span className="cx-sechead__t">在读居民</span></div>
      {people.filter((p) => p.occupation === '学生').slice(0, 6).map((p) => <PersonRow key={p.id} person={p} />)}

      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: 'var(--fx-t2)' }}>{msg}</div>}
    </div>
  )
}

/* ============================================================
   其他：派出所 / 邮局 / 社区中心
   ============================================================ */

function OtherPanel() {
  const me = useMe()
  const people = useMulCity((s) => s.people)
  const letters = useMulCity((s) => s.letters)
  const sendLetter = useMulCity((s) => s.sendLetter)
  const updatePerson = useMulCity((s) => s.updatePerson)
  const pushCivilRecord = useMulCity((s) => s.pushCivilRecord)
  const nav = useCityNav()
  const [msg, setMsg] = useState('')
  const [toId, setToId] = useState('')
  const [kind, setKind] = useState<'letter' | 'parcel'>('letter')
  const [content, setContent] = useState('')

  const communityEvents = [
    { title: '社区清洁日', reward: 20 },
    { title: '邻里读书会', reward: 12 },
    { title: '公园夜跑团', reward: 15 },
  ]

  const report = () => {
    pushCivilRecord(`${me.name} 在派出所完成一次报案登记`)
    setMsg('报案已受理，回执号 ' + Math.random().toString(36).slice(2, 8).toUpperCase())
  }
  const reissue = () => {
    pushCivilRecord(`${me.name} 申领了新证件`)
    setMsg('新证件已制卡，稍后可在「市籍」查看。')
  }
  const checkCredit = () => setMsg(`当前社信评级 ${me.attributes.socialCredit}，状态正常。`)

  const doSend = () => {
    if (!toId) {
      setMsg('请选择收件人。')
      return
    }
    sendLetter(toId, kind, content || '（空白信纸）')
    setMsg(`已寄出${kind === 'letter' ? '信件' : '包裹'}。`)
    setContent('')
  }

  const joinEvent = (title: string, reward: number) => {
    updatePerson(me.id, { attributes: { ...me.attributes, cityContribution: me.attributes.cityContribution + reward } })
    pushCivilRecord(`${me.name} 参加了「${title}」`)
    setMsg(`参加「${title}」，城市贡献 +${reward}。`)
  }

  return (
    <div className="cx-scroll">
      <div className="cx-sechead"><span className="cx-sechead__t">派出所</span></div>
      <Card>
        <div className="cx-acts">
          <button className="fx-btn fx-btn--front fx-press" onClick={report}><Shield size={14} /> 报案</button>
          <button className="fx-btn fx-press" onClick={reissue}>申领新证件</button>
          <button className="fx-btn fx-press" onClick={checkCredit}>查询社信</button>
        </div>
        <div className="cx-row__sub" style={{ marginTop: 8 }}>社信评级影响贷款额度、职业门槛与管理员审查。</div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">邮局</span></div>
      <Card>
        <div className="cx-2col">
          <Field label="收件人">
            <select className="fx-input" value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">选择居民</option>
              {people.filter((p) => p.id !== me.id).slice(0, 24).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="类型">
            <select className="fx-input" value={kind} onChange={(e) => setKind(e.target.value as 'letter' | 'parcel')}>
              <option value="letter">信件</option>
              <option value="parcel">包裹</option>
            </select>
          </Field>
        </div>
        <Field label="内容">
          <textarea className="fx-textarea" rows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="写点什么…" />
        </Field>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={doSend}><Mail size={14} /> 寄出</button>
        {letters.length > 0 && (
          <div className="cx-row__sub" style={{ marginTop: 8 }}>已寄出 {letters.length} 件，最近一件寄给 {people.find((p) => p.id === letters[0].toId)?.name ?? '—'}。</div>
        )}
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">社区中心</span></div>
      {communityEvents.map((e) => (
        <Row
          key={e.title}
          icon={<Users size={15} />}
          title={e.title}
          sub={`参与可获得城市贡献 +${e.reward}`}
          right={<button className="cx-tag cx-tag--on fx-press" onClick={() => joinEvent(e.title, e.reward)}>参加</button>}
        />
      ))}

      <div className="cx-sechead"><span className="cx-sechead__t">城市公告</span></div>
      <Card>
        <Row icon={<Sparkles size={15} />} title="夏季音乐节即将开票" sub="海滨栈桥连开三晚" onClick={() => nav.goTab('show')} arrow />
        <Row icon={<Sparkles size={15} />} title="地铁 3 号线临时检修" sub="晚高峰请预留时间" />
        <Row icon={<Sparkles size={15} />} title="美术馆新展《雾与钟塔》" sub="展期两个月，首周半价" onClick={() => nav.goTab('show')} arrow />
      </Card>

      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: 'var(--fx-t2)' }}>{msg}</div>}
    </div>
  )
}
