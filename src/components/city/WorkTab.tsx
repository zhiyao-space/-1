import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Coins,
  RefreshCw,
  Star,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react'
import { randInt } from '../../lib/cityCatalog'
import { useMe, useMulCity, type Job, type Person } from '../../store/mulCity'
import { Card, Empty, Progress, Row, Stat, SubTabs, fmtWhen } from './cityParts'
import { useCityNav } from './cityNav'

/* ============================================================
   Tab7 · 工作与经济
   我的工作 | 职业市场 | 排行榜 | 经济总览
   收入 - 消费 - 账单 闭环 / 等级体系 / 城市贡献
   ============================================================ */

type Sub = 'work' | 'market' | 'rank' | 'economy'
const SUBS: { key: Sub; label: string }[] = [
  { key: 'work', label: '我的工作' },
  { key: 'market', label: '职业市场' },
  { key: 'rank', label: '排行榜' },
  { key: 'economy', label: '经济总览' },
]

export default function WorkTab() {
  const [sub, setSub] = useState<Sub>('work')
  return (
    <>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === 'work' && <MyWorkPanel onGoMarket={() => setSub('market')} />}
      {sub === 'market' && <JobMarketPanel />}
      {sub === 'rank' && <RankPanel />}
      {sub === 'economy' && <EconomyPanel />}
    </>
  )
}

/* ============================================================
   我的工作
   ============================================================ */

function MyWorkPanel({ onGoMarket }: { onGoMarket: () => void }) {
  const me = useMe()
  const work = useMulCity((s) => s.work)
  const jobs = useMulCity((s) => s.jobs)
  const banks = useMulCity((s) => s.banks)
  const doTask = useMulCity((s) => s.doTask)
  const refreshDailyTasks = useMulCity((s) => s.refreshDailyTasks)
  const takeJob = useMulCity((s) => s.takeJob)
  const [msg, setMsg] = useState('')

  const job = jobs.find((j) => j.id === work.jobId) ?? null
  const done = work.tasks.filter((t) => t.done).length
  const balance = banks.find((b) => b.personId === me.id)?.balance ?? me.bankAccount
  const todayPay = work.tasks.filter((t) => t.done).reduce((s, t) => s + t.rewardMoney, 0)

  const promote = useMemo(() => {
    if (!job) return null
    return (
      jobs.find(
        (j) =>
          j.salary > job.salary &&
          me.attributes.level >= j.levelReq &&
          me.attributes.socialCredit >= j.creditReq &&
          (!j.skillReq || me.skills.includes(j.skillReq))
      ) ?? null
    )
  }, [job, jobs, me])

  return (
    <div className="cx-scroll">
      <Card front>
        <div className="cx-row__title"><Briefcase size={15} /> {job ? job.title : '待业中'}</div>
        <div className="cx-row__sub">{job ? job.desc : '去职业市场看看，挑一份适合自己的工作。'}</div>
        <div className="cx-stats" style={{ marginTop: 12 }}>
          <Stat value={job ? `¥${job.salary.toLocaleString()}` : '—'} label="月薪" />
          <Stat value={`LV.${me.attributes.level}`} label="等级" />
          <Stat value={`¥${balance.toLocaleString()}`} label="账户余额" />
        </div>
        <div className="cx-acts" style={{ marginTop: 12 }}>
          <button className="fx-btn fx-btn--front fx-press" onClick={onGoMarket}>
            <ArrowUpRight size={14} /> 换工作
          </button>
          {job && promote && (
            <button
              className="fx-btn fx-btn--accent fx-press"
              onClick={() => {
                const r = takeJob(promote.id)
                setMsg(r.ok ? `已晋升为「${promote.title}」，月薪 ¥${promote.salary.toLocaleString()}。` : r.reason ?? '晋升失败')
              }}
            >
              <TrendingUp size={14} /> 晋升「{promote.title}」
            </button>
          )}
        </div>
      </Card>

      {job && (
        <>
          <div className="cx-sechead">
            <span className="cx-sechead__t">每日任务</span>
            <span className="cx-sechead__sub">{done}/{work.tasks.length} · 今日已赚 ¥{todayPay}</span>
          </div>
          <Card>
            <Progress value={done} max={Math.max(1, work.tasks.length)} />
            <div style={{ marginTop: 10 }}>
              {work.tasks.map((t) => (
                <Row
                  key={t.id}
                  icon={t.done ? <CheckCircle2 size={15} /> : <Star size={15} />}
                  title={t.text}
                  sub={`经验 +${t.rewardExp}${t.rewardMoney ? ` · 工资 +¥${t.rewardMoney}` : ''}`}
                  right={
                    t.done ? (
                      <span className="cx-tag">已完成</span>
                    ) : (
                      <button className="cx-tag cx-tag--on fx-press" onClick={() => doTask(t.id)}>完成</button>
                    )
                  }
                />
              ))}
            </div>
            <button
              className="fx-btn fx-btn--soft fx-press"
              style={{ width: '100%', marginTop: 10 }}
              onClick={() => { refreshDailyTasks(); setMsg('已刷新今日任务。') }}
            >
              <RefreshCw size={14} /> 刷新每日任务
            </button>
          </Card>
        </>
      )}

      <div className="cx-sechead"><span className="cx-sechead__t">升职与成长</span></div>
      <Card>
        {promote ? (
          <Row
            icon={<TrendingUp size={15} />}
            title={`可晋升：${promote.title}`}
            sub={`月薪 ¥${promote.salary.toLocaleString()} · 要求 LV.${promote.levelReq} · 社信 ${promote.creditReq}${promote.skillReq ? ` · 技能 ${promote.skillReq}` : ''}`}
            right={<span className="cx-tag cx-tag--on">已达标</span>}
          />
        ) : (
          <>
            <Row icon={<Briefcase size={15} />} title={`当前等级 LV.${me.attributes.level}`} sub="完成任务、提升城市贡献可升级" />
            <Row icon={<BadgeCheck size={15} />} title={`社会信用 ${me.attributes.socialCredit}`} sub="社信影响职业门槛与贷款额度" />
            <Row icon={<Star size={15} />} title={`技能 ${me.skills.join('、') || '暂无'}`} sub="去公共服务 → 学校 参加培训获取技能" />
          </>
        )}
      </Card>

      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: 'var(--fx-t2)' }}>{msg}</div>}
    </div>
  )
}

/* ============================================================
   职业市场
   ============================================================ */

const PART_TIME = [
  { title: '周末咖啡店帮工', pay: 260, energy: 12 },
  { title: '展会临时引导', pay: 200, energy: 10 },
  { title: '深夜便利店顶班', pay: 320, energy: 18 },
  { title: '帮人拍一组照片', pay: 400, energy: 14 },
]

function matchScore(job: Job, me: Person): number {
  let s = 0
  if (job.skillReq && me.skills.includes(job.skillReq)) s += 3
  if (job.skillReq && me.hobbies.includes(job.skillReq)) s += 1
  if (me.attributes.level >= job.levelReq) s += 1
  if (me.attributes.socialCredit >= job.creditReq) s += 1
  return s
}

function JobMarketPanel() {
  const me = useMe()
  const jobs = useMulCity((s) => s.jobs)
  const work = useMulCity((s) => s.work)
  const takeJob = useMulCity((s) => s.takeJob)
  const updatePerson = useMulCity((s) => s.updatePerson)
  const ensureBank = useMulCity((s) => s.ensureBank)
  const bankDeposit = useMulCity((s) => s.bankDeposit)
  const pushCivilRecord = useMulCity((s) => s.pushCivilRecord)
  const [sort, setSort] = useState<'salary' | 'req' | 'match'>('salary')
  const [msg, setMsg] = useState('')

  const list = useMemo(() => {
    const arr = [...jobs]
    if (sort === 'salary') arr.sort((a, b) => b.salary - a.salary)
    if (sort === 'req') arr.sort((a, b) => a.levelReq - b.levelReq || a.creditReq - b.creditReq)
    if (sort === 'match') arr.sort((a, b) => matchScore(b, me) - matchScore(a, me))
    return arr
  }, [jobs, sort, me])

  const doPart = (p: (typeof PART_TIME)[number]) => {
    if (me.energy < p.energy) {
      setMsg('精力不足，先休息一下。')
      return
    }
    const payout = p.pay + randInt(-30, 60)
    updatePerson(me.id, { energy: Math.max(0, me.energy - p.energy) })
    ensureBank(me.id)
    bankDeposit(me.id, payout)
    pushCivilRecord(`${me.name} 做了一份兼职：${p.title}`)
    setMsg(`完成「${p.title}」，收入 ¥${payout}，精力 -${p.energy}。`)
  }

  return (
    <div className="cx-scroll">
      <div className="cx-acts" style={{ marginBottom: 4 }}>
        {([
          { key: 'salary', label: '按薪资' },
          { key: 'match', label: '按匹配' },
          { key: 'req', label: '按门槛' },
        ] as const).map((s) => (
          <button key={s.key} className={`cx-tag ${sort === s.key ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setSort(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="cx-sechead"><span className="cx-sechead__t">全职职位</span><span className="cx-sechead__sub">等级 / 社信 / 技能 门槛</span></div>
      {list.map((j) => {
        const cur = work.jobId === j.id
        const lackLevel = me.attributes.level < j.levelReq
        const lackCredit = me.attributes.socialCredit < j.creditReq
        const lackSkill = !!j.skillReq && !me.skills.includes(j.skillReq)
        const qualified = !lackLevel && !lackCredit && !lackSkill
        return (
          <Card key={j.id}>
            <div className="cx-row__title">
              {j.title}
              <span className={`cx-tag ${cur ? 'cx-tag--on' : ''}`} style={{ marginLeft: 'auto' }}>{cur ? '在职' : j.tags[0]}</span>
            </div>
            <div className="cx-row__sub">{j.desc}</div>
            <div className="cx-row__sub" style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>LV.{j.levelReq}</span>
              <span>社信 {j.creditReq}</span>
              <span>{j.skillReq ? `技能 ${j.skillReq}` : '无技能要求'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
              <span className="cx-price"><small>¥</small>{j.salary.toLocaleString()}<small> /月</small></span>
              {cur ? (
                <span className="cx-tag cx-tag--on" style={{ marginLeft: 'auto' }}>当前在职</span>
              ) : (
                <button
                  className="fx-btn fx-btn--front fx-press"
                  style={{ marginLeft: 'auto' }}
                  disabled={!qualified}
                  onClick={() => {
                    const r = takeJob(j.id)
                    setMsg(r.ok ? `已入职「${j.title}」，月薪 ¥${j.salary.toLocaleString()}。` : r.reason ?? '入职失败')
                  }}
                >
                  {qualified ? '应聘' : lackLevel ? '等级不足' : lackCredit ? '社信不足' : '缺少技能'}
                </button>
              )}
            </div>
          </Card>
        )
      })}

      <div className="cx-sechead"><span className="cx-sechead__t">兼职</span><span className="cx-sechead__sub">临时收入 · 消耗精力</span></div>
      {PART_TIME.map((p) => (
        <Row
          key={p.title}
          icon={<Coins size={15} />}
          title={p.title}
          sub={`收入约 ¥${p.pay} · 精力 -${p.energy}`}
          right={<button className="cx-tag cx-tag--on fx-press" onClick={() => doPart(p)}>接单</button>}
        />
      ))}

      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: 'var(--fx-t2)' }}>{msg}</div>}
    </div>
  )
}

/* ============================================================
   排行榜
   ============================================================ */

type RankKey = 'wealth' | 'credit' | 'contribution' | 'popular'
const RANK_TABS: { key: RankKey; label: string }[] = [
  { key: 'wealth', label: '财富榜' },
  { key: 'credit', label: '社信榜' },
  { key: 'contribution', label: '贡献榜' },
  { key: 'popular', label: '人气榜' },
]

function rankValue(p: Person, key: RankKey): number {
  if (key === 'wealth') return p.bankAccount
  if (key === 'credit') return p.attributes.socialCredit
  if (key === 'contribution') return p.attributes.cityContribution
  return p.relationships.filter((r) => r.type !== 'self').reduce((s, r) => s + r.affinity, 0)
}

function RankPanel() {
  const me = useMe()
  const people = useMulCity((s) => s.people)
  const [key, setKey] = useState<RankKey>('wealth')

  const list = useMemo(
    () => [...people].sort((a, b) => rankValue(b, key) - rankValue(a, key)).slice(0, 20),
    [people, key]
  )
  const myRank = useMemo(
    () => [...people].sort((a, b) => rankValue(b, key) - rankValue(a, key)).findIndex((p) => p.id === me.id) + 1,
    [people, key, me.id]
  )

  return (
    <div className="cx-scroll">
      <SubTabs tabs={RANK_TABS} value={key} onChange={setKey} />

      <Card front>
        <div className="cx-row__title"><Trophy size={15} /> {RANK_TABS.find((r) => r.key === key)?.label} · 每月刷新</div>
        <div className="cx-stats" style={{ marginTop: 12 }}>
          <Stat value={`#${myRank}`} label="我的排名" />
          <Stat value={rankValue(me, key).toLocaleString()} label="我的数值" />
          <Stat value={people.length} label="参与居民" />
        </div>
      </Card>

      {list.map((p, i) => (
        <Row
          key={p.id}
          thumb={<span className={`cx-tag ${i < 3 ? 'cx-tag--on' : 'cx-tag--front'}`} style={{ width: 34, height: 34, justifyContent: 'center', fontSize: 'calc(12px * var(--fs-scale))' }}>{i + 1}</span>}
          title={<>{p.name}{p.id === me.id && <span className="cx-tag cx-tag--on">我</span>}</>}
          sub={`${p.occupation} · LV.${p.attributes.level}`}
          right={<span className="cx-price">{rankValue(p, key).toLocaleString()}</span>}
        />
      ))}

      {list.length === 0 && <Empty icon={<Trophy size={26} />} text="还没有居民上榜" />}
    </div>
  )
}

/* ============================================================
   经济总览
   ============================================================ */

function EconomyPanel() {
  const me = useMe()
  const banks = useMulCity((s) => s.banks)
  const work = useMulCity((s) => s.work)
  const monthlySettle = useMulCity((s) => s.monthlySettle)
  const payBill = useMulCity((s) => s.payBill)
  const nav = useCityNav()
  const [msg, setMsg] = useState('')

  const bank = banks.find((b) => b.personId === me.id)
  const balance = bank?.balance ?? me.bankAccount
  const income = work.salary || me.monthlyIncome
  const expense = me.monthlyExpenses
  const net = income - expense
  const scale = Math.max(income, expense, 1)
  const bills = bank?.bills ?? []

  return (
    <div className="cx-scroll">
      <Card front>
        <div className="cx-row__title"><Wallet size={15} /> Mul市 经济循环</div>
        <div className="cx-row__sub">收入 → 消费 → 账单，每月自动结算。</div>
        <div className="cx-stats" style={{ marginTop: 12 }}>
          <Stat value={`¥${income.toLocaleString()}`} label="月收入" />
          <Stat value={`¥${expense.toLocaleString()}`} label="月支出" />
          <Stat value={`${net >= 0 ? '+' : ''}¥${net.toLocaleString()}`} label="月结余" />
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="cx-row__sub" style={{ marginBottom: 4 }}>收入 ¥{income.toLocaleString()}</div>
          <Progress value={income} max={scale} />
          <div className="cx-row__sub" style={{ margin: '8px 0 4px' }}>支出 ¥{expense.toLocaleString()}</div>
          <Progress value={expense} max={scale} />
        </div>
        <button
          className="fx-btn fx-btn--accent fx-press"
          style={{ width: '100%', marginTop: 12 }}
          onClick={() => { monthlySettle(); setMsg(`本月结算完成：收入 ¥${income.toLocaleString()}，支出 ¥${expense.toLocaleString()}。`) }}
        >
          <Coins size={14} /> 结算本月工资与账单
        </button>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">我的账单</span><span className="cx-sechead__sub">共 {bills.length} 项</span></div>
      {bills.length ? (
        bills.map((b) => (
          <Row
            key={b.id}
            icon={<Wallet size={15} />}
            title={b.title}
            sub={b.paid ? '已缴清' : `${fmtWhen(b.dueAt)}到期`}
            right={
              b.paid ? (
                <span className="cx-tag">已缴</span>
              ) : (
                <button className="cx-tag cx-tag--on fx-press" onClick={() => { payBill(me.id, b.id); setMsg(`已缴纳「${b.title}」¥${b.amount}。`) }}>
                  缴纳 ¥{b.amount}
                </button>
              )
            }
          />
        ))
      ) : (
        <Empty icon={<Wallet size={26} />} text="没有账单" hint="去公共服务 → 银行 开户后会有固定支出" />
      )}

      <div className="cx-sechead"><span className="cx-sechead__t">消费途径</span></div>
      <Card>
        <Row icon={<ArrowUpRight size={15} />} title="交通出行" sub="机票 / 火车 / 高铁 / 地铁" onClick={() => nav.goTab('travel')} arrow />
        <Row icon={<ArrowUpRight size={15} />} title="演出票务" sub="演唱会 / 剧场 / 展览" onClick={() => nav.goTab('show')} arrow />
        <Row icon={<ArrowUpRight size={15} />} title="公共服务" sub="医院 / 学校 / 生活缴费" onClick={() => nav.goTab('service')} arrow />
        <Row icon={<ArrowUpRight size={15} />} title="mulin 商城" sub="与商城余额互通，购物直接扣款" />
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">等级体系</span></div>
      <Card>
        <Row icon={<Star size={15} />} title={`当前 LV.${me.attributes.level} · ${me.rank}`} sub={`城市贡献 ${me.attributes.cityContribution}`} />
        <Row icon={<BadgeCheck size={15} />} title="等级影响" sub="解锁权限、职业范围、福利待遇与贷款额度" />
        <Row icon={<Coins size={15} />} title="贡献来源" sub="参与社区活动 / 志愿服务 / 纳税累计" />
      </Card>

      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: 'var(--fx-t2)' }}>{msg}</div>}
    </div>
  )
}
