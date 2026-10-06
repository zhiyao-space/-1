import { useMemo, useState } from 'react'
import {
  Bookmark,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Repeat2,
  Send,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import { HOBBY_TAGS, pick, randInt } from '../../lib/cityCatalog'
import { generateGroupTopics, hasCityAi } from '../../lib/cityEngine'
import {
  RELATION_LABEL,
  landmarkById,
  personById,
  relationOf,
  useMe,
  useMulCity,
  type Person,
} from '../../store/mulCity'
import { Avatar, Card, ChipRow, Empty, Field, PersonRow, Row, Sheet, SubTabs, Stat, fmtWhen } from './cityParts'
import { useCityNav } from './cityNav'

/* ============================================================
   Tab6 · 社交
   朋友圈 | 群聊 | 人际关系 | 偶遇
   ============================================================ */

type Sub = 'moments' | 'groups' | 'graph' | 'meet'
const SUBS: { key: Sub; label: string }[] = [
  { key: 'moments', label: '朋友圈' },
  { key: 'groups', label: '群聊' },
  { key: 'graph', label: '人际关系' },
  { key: 'meet', label: '偶遇' },
]

export default function SocialTab() {
  const [sub, setSub] = useState<Sub>('moments')
  return (
    <>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === 'moments' && <MomentsPanel />}
      {sub === 'groups' && <GroupsPanel />}
      {sub === 'graph' && <GraphPanel />}
      {sub === 'meet' && <MeetPanel />}
    </>
  )
}

/* ============================================================
   朋友圈
   ============================================================ */

const POST_TAGS = ['日常', '随手记', '碎碎念', 'Mul市', '深夜', '看展']

function MomentsPanel() {
  const me = useMe()
  const people = useMulCity((s) => s.people)
  const posts = useMulCity((s) => s.posts)
  const addPost = useMulCity((s) => s.addPost)
  const toggleLike = useMulCity((s) => s.toggleLike)
  const addComment = useMulCity((s) => s.addComment)
  const bumpAffinity = useMulCity((s) => s.bumpAffinity)
  const nav = useCityNav()

  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [image, setImage] = useState('')
  const [openComment, setOpenComment] = useState('')
  const [commentText, setCommentText] = useState('')
  const [favs, setFavs] = useState<string[]>([])

  const submit = () => {
    if (!text.trim()) return
    addPost(text.trim(), tags, image.trim() ? [image.trim()] : [])
    setText('')
    setTags([])
    setImage('')
  }

  return (
    <div className="cx-scroll">
      <Card front>
        <textarea className="fx-textarea" rows={2} placeholder="此刻的 Mul市，你在做什么？" value={text} onChange={(e) => setText(e.target.value)} />
        <div style={{ marginTop: 10 }}>
          <ChipRow options={POST_TAGS} value={tags} onToggle={(v) => setTags((t) => (t.includes(v) ? t.filter((x) => x !== v) : [...t, v]))} />
        </div>
        <input className="fx-input" style={{ marginTop: 8 }} placeholder="图片地址（可选）" value={image} onChange={(e) => setImage(e.target.value)} />
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%', marginTop: 10 }} onClick={submit} disabled={!text.trim()}>
          <Send size={14} /> 发布动态
        </button>
      </Card>

      <div className="cx-row__sub" style={{ margin: '10px 2px' }}>
        NPC 发帖规则：好感度 &lt;30 只发自己的日常 · 30-60 偶尔提到你 · &gt;60 常与你互动
      </div>

      {posts.map((p) => {
        const author = personById(people, p.personId)
        if (!author) return null
        const affinity = author.id === me.id ? 100 : relationOf(me, author.id).affinity
        const liked = p.likes.includes(me.id)
        const faved = favs.includes(p.id)
        return (
          <Card key={p.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar person={author} size={38} showOnline />
              <button
                style={{ border: 0, background: 'none', textAlign: 'left', padding: 0 }}
                onClick={() => nav.push({ view: 'person', id: author.id })}
              >
                <div className="cx-row__title">{author.name}</div>
                <div className="cx-muted" style={{ fontSize: 'calc(10px * var(--fs-scale))' }}>
                  {author.occupation} · 好感度 {affinity}
                </div>
              </button>
              <span className="cx-muted" style={{ marginLeft: 'auto', fontSize: 'calc(10px * var(--fs-scale))' }}>{fmtWhen(p.at)}</span>
            </div>

            <div className="cx-row__sub" style={{ marginTop: 10, color: 'var(--fx-t1)', fontSize: 'calc(12.5px * var(--fs-scale))' }}>{p.text}</div>
            {p.images.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {p.images.map((src, i) => <img key={i} src={src} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 14 }} />)}
              </div>
            )}
            {p.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {p.tags.map((t) => <span key={t} className="cx-tag">#{t}</span>)}
              </div>
            )}

            {p.comments.length > 0 && (
              <div className="cx-row--sunken" style={{ marginTop: 10, padding: 10, borderRadius: 14 }}>
                {p.comments.map((c) => {
                  const cAuthor = personById(people, c.personId)
                  return (
                    <div key={c.id} style={{ fontSize: 'calc(11.5px * var(--fs-scale))', color: 'var(--fx-t2)', lineHeight: 1.6 }}>
                      <b>{cAuthor?.name ?? '有人'}</b>：{c.text}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="cx-hr" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className={`cx-tag fx-press ${liked ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => toggleLike(p.id)}>
                <Heart size={11} /> {p.likes.length}
              </button>
              <button className="cx-tag cx-tag--front fx-press" onClick={() => { setOpenComment(openComment === p.id ? '' : p.id); setCommentText('') }}>
                <MessageCircle size={11} /> {p.comments.length}
              </button>
              <button className="cx-tag cx-tag--front fx-press" onClick={() => addPost(`转发 @${author.name}：${p.text.slice(0, 40)}`, p.tags)}>
                <Repeat2 size={11} /> 转发
              </button>
              <button
                className={`cx-tag fx-press ${faved ? 'cx-tag--on' : 'cx-tag--front'}`}
                onClick={() => setFavs((f) => (f.includes(p.id) ? f.filter((x) => x !== p.id) : [...f, p.id]))}
              >
                <Bookmark size={11} /> {faved ? '已收藏' : '收藏'}
              </button>
              {author.id !== me.id && (
                <button className="cx-tag cx-tag--front fx-press" style={{ marginLeft: 'auto' }} onClick={() => bumpAffinity(me.id, author.id, 2, '关注了对方')}>
                  <UserPlus size={11} /> 关注
                </button>
              )}
            </div>

            {openComment === p.id && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input className="fx-input" placeholder="说点什么…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                <button
                  className="fx-btn fx-btn--front fx-press"
                  onClick={() => {
                    if (!commentText.trim()) return
                    addComment(p.id, commentText.trim())
                    bumpAffinity(me.id, author.id, 1, '评论了对方的动态')
                    setCommentText('')
                  }}
                >
                  发送
                </button>
              </div>
            )}
          </Card>
        )
      })}

      {posts.length === 0 && <Empty icon={<MessageCircle size={28} />} text="还没有动态" hint="发一条试试" />}
    </div>
  )
}

/* ============================================================
   群聊
   ============================================================ */

function GroupsPanel() {
  const me = useMe()
  const people = useMulCity((s) => s.people)
  const groups = useMulCity((s) => s.groups)
  const createGroup = useMulCity((s) => s.createGroup)
  const sendGroupMessage = useMulCity((s) => s.sendGroupMessage)
  const [openId, setOpenId] = useState('')
  const [msg, setMsg] = useState('')
  const [create, setCreate] = useState(false)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  const open = groups.find((g) => g.id === openId)

  const doCreate = async () => {
    if (!name.trim() || picked.length === 0) return
    const members = picked.map((id) => personById(people, id)).filter((p): p is Person => !!p)
    const hobbies = Array.from(new Set(members.flatMap((m) => m.hobbies)))
    const aiTopics = await generateGroupTopics(members.map((m) => m.name), hobbies)
    const id = createGroup(name.trim(), picked)
    if (aiTopics.length) {
      useMulCity.setState((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, topics: aiTopics } : g)) }))
    }
    setName('')
    setPicked([])
    setCreate(false)
    setOpenId(id)
  }

  if (open) {
    return (
      <div className="cx-scroll">
        <button className="fx-btn fx-btn--soft fx-press" style={{ marginBottom: 10 }} onClick={() => setOpenId('')}>← 返回群列表</button>
        <Card front>
          <div className="cx-row__title"><Users size={15} /> {open.name}</div>
          <div className="cx-row__sub">{open.memberIds.length} 位成员 · 话题：{open.topics.join('、')}</div>
        </Card>

        <div className="cx-chat" style={{ marginTop: 12 }}>
          {open.messages.map((m) => {
            const mine = m.personId === me.id
            return (
              <div key={m.id} className={`cx-bubble ${mine ? 'cx-bubble--me' : 'cx-bubble--ai'}`}>
                {!mine && <div style={{ fontSize: 'calc(8.5px * var(--fs-scale))', opacity: 0.6, marginBottom: 3 }}>{personById(people, m.personId)?.name}</div>}
                {m.text}
              </div>
            )
          })}
          {open.messages.length === 0 && <Empty icon={<MessageCircle size={26} />} text="群里还很安静" hint="说第一句话" />}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input className="fx-input" placeholder="发消息…" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button
            className="fx-btn fx-btn--accent fx-press"
            onClick={() => {
              if (!msg.trim()) return
              sendGroupMessage(open.id, msg.trim())
              setMsg('')
            }}
          >
            发送
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cx-scroll">
      <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={() => setCreate(true)}>
        <Plus size={14} /> 创建群聊
      </button>

      <div className="cx-sechead"><span className="cx-sechead__t">我的群聊</span><span className="cx-sechead__sub">{groups.length} 个</span></div>
      {groups.length ? (
        groups.map((g) => (
          <Row
            key={g.id}
            icon={<Users size={15} />}
            title={g.name}
            sub={`${g.memberIds.length} 人 · ${g.topics.slice(0, 3).join('、')}`}
            right={g.messages.length ? <span className="cx-tag">{fmtWhen(g.messages[g.messages.length - 1].at)}</span> : undefined}
            onClick={() => setOpenId(g.id)}
            arrow
          />
        ))
      ) : (
        <Empty icon={<Users size={26} />} text="还没有群聊" hint="创建一个，NPC 也会自己建群" />
      )}

      <Sheet open={create} onClose={() => setCreate(false)} title="创建群聊">
        <Field label="群名称">
          <input className="fx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：梧桐里夜聊" />
        </Field>
        <Field label="邀请成员">
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {people.filter((p) => p.id !== me.id).slice(0, 30).map((p) => {
              const on = picked.includes(p.id)
              return (
                <Row
                  key={p.id}
                  thumb={<Avatar person={p} size={36} />}
                  title={p.name}
                  sub={p.occupation}
                  right={<span className={`cx-tag ${on ? 'cx-tag--on' : 'cx-tag--front'}`}>{on ? '已选' : '选择'}</span>}
                  onClick={() => setPicked((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                />
              )
            })}
          </div>
        </Field>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={() => void doCreate()} disabled={!name.trim() || !picked.length}>
          创建（{picked.length} 位成员）
        </button>
      </Sheet>
    </div>
  )
}

/* ============================================================
   人际关系图谱
   ============================================================ */

function GraphPanel() {
  const me = useMe()
  const people = useMulCity((s) => s.people)
  const nav = useCityNav()
  const [focus, setFocus] = useState<string>('')

  const nodes = useMemo(() => {
    const rels = me.relationships.filter((r) => r.type !== 'self').slice(0, 10)
    return rels.map((r, i) => {
      const angle = (i / Math.max(1, rels.length)) * Math.PI * 2 - Math.PI / 2
      return {
        rel: r,
        person: personById(people, r.personId),
        x: 50 + Math.cos(angle) * 37,
        y: 50 + Math.sin(angle) * 37,
      }
    }).filter((n) => n.person)
  }, [me, people])

  const current = focus ? personById(people, focus) ?? me : me
  const currentRel = focus ? relationOf(me, focus) : null

  return (
    <div className="cx-scroll">
      <div className="cx-graph">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          {nodes.map((n) => (
            <line
              key={`l_${n.rel.personId}`}
              x1={50}
              y1={50}
              x2={n.x}
              y2={n.y}
              stroke="rgba(255,255,255,0.32)"
              strokeWidth={0.4 + (n.rel.affinity / 100) * 1.4}
            />
          ))}
        </svg>
        <button className="cx-gnode" style={{ left: '50%', top: '50%' }} onClick={() => setFocus('')}>
          <Avatar person={me} size={44} />
          <span className={`cx-gnode__name ${!focus ? 'cx-gnode--on' : ''}`}>{me.name}（我）</span>
        </button>
        {nodes.map((n) => (
          <button key={n.person!.id} className="cx-gnode" style={{ left: `${n.x}%`, top: `${n.y}%` }} onClick={() => setFocus(n.person!.id)}>
            <Avatar person={n.person!} size={34} />
            <span className={`cx-gnode__name ${focus === n.person!.id ? 'cx-gnode--on' : ''}`}>{n.person!.name}</span>
          </button>
        ))}
      </div>

      <Card style={{ marginTop: 12 }}>
        {focus ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar person={current} size={46} />
              <div>
                <div className="cx-row__title">{current.name}</div>
                <div className="cx-row__sub">
                  {RELATION_LABEL[currentRel!.type]} · 好感度 {currentRel!.affinity}
                </div>
              </div>
              <button className="fx-btn fx-press" style={{ marginLeft: 'auto' }} onClick={() => nav.push({ view: 'person', id: current.id })}>主页</button>
            </div>
            {currentRel!.memories.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="cx-field__label">相处记忆</div>
                {currentRel!.memories.map((m, i) => <div key={i} className="cx-row__sub" style={{ marginTop: 2 }}>· {m}</div>)}
              </div>
            )}
          </>
        ) : (
          <div className="cx-row__sub" style={{ marginTop: 0 }}>点击任一节点查看关系与好感度。连线越粗，代表好感度越高。</div>
        )}
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">全部关系</span></div>
      {nodes.map((n) => (
        <Row
          key={n.person!.id}
          thumb={<Avatar person={n.person!} size={38} />}
          title={n.person!.name}
          sub={`${RELATION_LABEL[n.rel.type]} · 好感度 ${n.rel.affinity}`}
          onClick={() => setFocus(n.person!.id)}
          arrow
        />
      ))}
    </div>
  )
}

/* ============================================================
   偶遇
   ============================================================ */

const MEET_LINES = [
  '在 %s 门口碰到了 %s，两个人都愣了一下才认出来。',
  '%s 也在这里，手里拎着刚买的东西，说正好顺路。',
  '你在 %s 坐下不久，%s 就从门口进来了。',
  '排队的时候，你发现前面站着的竟然是 %s。',
]

function MeetPanel() {
  const me = useMe()
  const city = useMulCity((s) => s.city)
  const people = useMulCity((s) => s.people)
  const encounters = useMulCity((s) => s.encounters)
  const addEncounter = useMulCity((s) => s.addEncounter)
  const bumpAffinity = useMulCity((s) => s.bumpAffinity)
  const setRelation = useMulCity((s) => s.setRelation)
  const nav = useCityNav()
  const [msg, setMsg] = useState('')

  const others = people.filter((p) => p.id !== me.id)

  const wander = () => {
    if (!others.length) return
    const who = pick(others)
    const lm = landmarkById(city, who.lastSeenLocation) ?? pick(city.landmarks)
    const tpl = pick(MEET_LINES)
    const text = tpl.replace('%s', lm.name).replace('%s', who.name)
    addEncounter(who.id, lm.id, text)
    bumpAffinity(me.id, who.id, 3, `在${lm.name}偶遇`)
    setMsg(text)
  }

  return (
    <div className="cx-scroll">
      <Card front>
        <div className="cx-row__title"><Sparkles size={15} /> 在 Mul市 走走</div>
        <div className="cx-row__sub">随机触发一次偶遇，可能遇见任何居民，也可能认识新的关系。</div>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%', marginTop: 10 }} onClick={wander}>
          <MapPin size={14} /> 出门走走，触发偶遇
        </button>
      </Card>

      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: 'var(--fx-t1)' }}>{msg}</div>}

      <div className="cx-stats" style={{ marginBottom: 14 }}>
        <Stat value={encounters.length} label="偶遇次数" />
        <Stat value={me.relationships.filter((r) => r.affinity > 0 && r.type !== 'self').length} label="已认识" />
        <Stat value={people.filter((p) => p.type !== 'user' && p.isOnline).length} label="在线居民" />
      </div>

      <div className="cx-sechead"><span className="cx-sechead__t">偶遇记录</span><span className="cx-sechead__sub">由 AI 主动生成</span></div>
      {encounters.length ? (
        encounters.map((e) => {
          const p = personById(people, e.personId)
          if (!p) return null
          return (
            <Card key={e.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar person={p} size={38} showOnline />
                <div style={{ minWidth: 0 }}>
                  <div className="cx-row__title">{p.name}</div>
                  <div className="cx-muted" style={{ fontSize: 'calc(10px * var(--fs-scale))' }}>
                    {landmarkById(city, e.locationId)?.name ?? '城里'} · {fmtWhen(e.at)}
                  </div>
                </div>
                <button className="fx-btn fx-press" style={{ marginLeft: 'auto' }} onClick={() => nav.push({ view: 'person', id: p.id })}>主页</button>
              </div>
              <div className="cx-row__sub" style={{ marginTop: 9, color: 'var(--fx-t2)' }}>{e.text}</div>
              <div className="cx-acts" style={{ marginTop: 10 }}>
                <button className="fx-btn fx-press" onClick={() => { setRelation(me.id, p.id, 'friend'); bumpAffinity(me.id, p.id, 6, '偶遇后互换了联系方式') }}>
                  <UserPlus size={14} /> 加为朋友
                </button>
                {HOBBY_TAGS.filter((h) => p.hobbies.includes(h)).slice(0, 2).map((h) => (
                  <span key={h} className="cx-tag">共同兴趣 · {h}</span>
                ))}
              </div>
            </Card>
          )
        })
      ) : (
        <Empty icon={<MapPin size={28} />} text="还没有偶遇" hint={hasCityAi() ? '出门走走，AI 会写一段相遇' : '出门走走，遇见城里的人'} />
      )}

      <div className="cx-sechead"><span className="cx-sechead__t">可能遇到的人</span></div>
      {others.slice(0, 8).map((p) => (
        <PersonRow key={p.id} person={p} sub={`${p.occupation} · 常在 ${landmarkById(city, p.lastSeenLocation)?.name ?? '城里'}`} onClick={() => nav.push({ view: 'person', id: p.id })} arrow />
      ))}
      <div className="cx-muted" style={{ fontSize: 'calc(9.5px * var(--fs-scale))', marginTop: 8 }}>
        共 {people.length} 位居民，其中 {others.filter((p) => p.isOnline).length} 位此刻在线。{randInt(0, 0) === 0 ? '' : ''}
      </div>
    </div>
  )
}
