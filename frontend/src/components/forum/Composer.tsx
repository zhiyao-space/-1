import { useState } from 'react'
import { ImagePlus, X, Plus, Minus } from 'lucide-react'
import { useForum, PLAY_STYLE_LABEL, userAuthor, type ForumPost, type PlayStyle } from '../../store/forum'
import { aliasAuthor } from '../../lib/forumEngine'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { Modal } from '../common'

type PostType = 'text' | 'image' | 'poll' | 'relay'

export default function Composer({ open, onClose, quoteOf, defaultCircleId }: { open: boolean; onClose: () => void; quoteOf: ForumPost | null; defaultCircleId: string | null }) {
  const circles = useForum((s) => s.circles).filter((c) => c.userJoined)
  const aliases = useForum((s) => s.aliases)
  const activeAliasId = useForum((s) => s.activeAliasId)
  const addPost = useForum((s) => s.addPost)
  const push = useToast((s) => s.push)

  const [type, setType] = useState<PostType>('text')
  const [playStyle, setPlayStyle] = useState<PlayStyle>('normal')
  const [circleId, setCircleId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [imageIds, setImageIds] = useState<string[]>([])
  const [imageDesc, setImageDesc] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [aliasId, setAliasId] = useState<string | null>(null)
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [pollMulti, setPollMulti] = useState(false)
  const [pollHours, setPollHours] = useState(0)
  const [relayRules, setRelayRules] = useState('')
  const [relayTarget, setRelayTarget] = useState(6)
  const [fanfic, setFanfic] = useState({ outline: '', cp: '', words: '', style: '', ending: '' })

  const limit = playStyle === 'twitter' ? 280 : 500
  const pickedCircle = circleId ?? defaultCircleId

  const reset = () => {
    setType('text')
    setPlayStyle('normal')
    setCircleId(null)
    setTitle('')
    setContent('')
    setTags('')
    setImageIds([])
    setImageDesc('')
    setAnonymous(false)
    setAliasId(null)
    setPollOptions(['', ''])
    setPollMulti(false)
    setPollHours(0)
    setRelayRules('')
    setRelayTarget(6)
  }

  const addImages = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).slice(0, 6)
      const ids: string[] = []
      for (const f of files) {
        const compressed = await compressImage(f, 1080)
        ids.push(await putBlob(compressed))
      }
      setImageIds((s) => [...s, ...ids].slice(0, 6))
    }
    input.click()
  }

  const submit = () => {
    if (!pickedCircle) {
      push('先选择要发布到的圈子', 'error')
      return
    }
    if (!content.trim() && imageIds.length === 0) {
      push('写点什么再发吧', 'error')
      return
    }
    if (type === 'poll') {
      const opts = pollOptions.map((o) => o.trim()).filter(Boolean)
      if (opts.length < 2) {
        push('投票至少需要两个选项', 'error')
        return
      }
    }
    const author = anonymous
      ? aliasAuthor(aliases.find((a) => a.id === (aliasId ?? activeAliasId))?.name ?? '匿名用户')
      : userAuthor('')
    const finalType: PostType = type === 'text' && playStyle === 'event' ? 'poll' : type
    addPost({
      circleId: pickedCircle,
      author,
      title: title.trim(),
      content: content.trim(),
      imageIds: type === 'image' || playStyle === 'insta' ? imageIds : [],
      imageDesc: playStyle === 'insta' ? imageDesc.trim() : '',
      tags: tags.split(/[\s,，#]+/).map((t) => t.trim()).filter(Boolean).slice(0, 4),
      playStyle: type === 'poll' && playStyle === 'normal' ? 'event' : playStyle,
      threadParts: [],
      quoteOf: quoteOf?.id ?? null,
      fanficMeta:
        playStyle === 'fanfic'
          ? { outline: fanfic.outline.trim(), cp: fanfic.cp.trim(), words: fanfic.words.trim(), style: fanfic.style.trim(), ending: fanfic.ending.trim() }
          : null,
      type: finalType,
      poll:
        finalType === 'poll'
          ? {
              options: pollOptions.map((o) => o.trim()).filter(Boolean),
              multi: pollMulti,
              deadline: pollHours > 0 ? Date.now() + pollHours * 3600_000 : null,
              votes: {},
            }
          : null,
      relay:
        finalType === 'relay'
          ? {
              rules: relayRules.trim() || '往下接一段，每次不超过 80 字，保持风格',
              target: relayTarget,
              parts: [{ authorKey: 'user:user', authorName: author.name || '我', text: content.trim(), time: Date.now() }],
            }
          : null,
      anonymous,
    })
    push(quoteOf ? '引用发布成功' : '发布成功')
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={quoteOf ? '引用转发' : '发帖'} width={360}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {quoteOf && (
          <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 8 }}>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>@{quoteOf.author.name}：</span>
            <span className="fs-micro" style={{ color: 'var(--text-secondary)' }}>{quoteOf.content.slice(0, 80)}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(
            [
              ['text', '文字帖'],
              ['image', '图片帖'],
              ['poll', '投票帖'],
              ['relay', '接力帖'],
            ] as [PostType, string][]
          ).map(([k, label]) => (
            <TypeChip key={k} label={label} active={type === k} onClick={() => setType(k)} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(PLAY_STYLE_LABEL) as PlayStyle[]).map((k) => (
            <TypeChip key={k} label={PLAY_STYLE_LABEL[k]} active={playStyle === k} onClick={() => setPlayStyle(k)} small />
          ))}
        </div>

        {circles.length === 0 ? (
          <div className="fs-micro" style={{ color: '#ffb08a' }}>
            你还没有加入任何圈子。先到「圈子」页创建或加入一个，再回来发帖
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {circles.map((c) => (
              <TypeChip key={c.id} label={c.name} active={pickedCircle === c.id} onClick={() => setCircleId(c.id)} small />
            ))}
          </div>
        )}

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题（可选）" maxLength={40} />
        <div style={{ position: 'relative' }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, limit))}
            placeholder={
              playStyle === 'insta'
                ? '配文（简短）'
                : playStyle === 'rule'
                  ? '列出你的诡异规则，让评论区推理真相…'
                  : playStyle === 'event'
                    ? '描述一个正在发酵的事件…'
                    : '正文…'
            }
            rows={4}
            style={{ resize: 'none' }}
          />
          <span className="fs-micro mono" style={{ position: 'absolute', right: 10, bottom: 8, color: content.length >= limit ? '#ff8a8a' : 'var(--text-disabled)' }}>
            {content.length}/{limit}
          </span>
        </div>

        {(type === 'image' || playStyle === 'insta') && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {imageIds.map((id) => (
                <Thumb key={id} id={id} onRemove={() => setImageIds((s) => s.filter((x) => x !== id))} />
              ))}
              {imageIds.length < 6 && (
                <button className="pressable" onClick={addImages} style={{ width: 64, height: 64, borderRadius: 10, border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <ImagePlus size={18} />
                </button>
              )}
            </div>
            <input value={imageDesc} onChange={(e) => setImageDesc(e.target.value)} placeholder="图片描述（可选，显示为「点击查看图片描述」）" maxLength={200} />
          </>
        )}

        {type === 'poll' && (
          <>
            {pollOptions.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input
                  value={o}
                  onChange={(e) => setPollOptions((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`选项 ${i + 1}`}
                  maxLength={30}
                />
                {pollOptions.length > 2 && (
                  <button className="pressable" onClick={() => setPollOptions((s) => s.filter((_, j) => j !== i))} style={{ color: '#ff8a8a', padding: 4 }}>
                    <Minus size={15} />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 6 && (
              <button className="btn btn-sm pressable" style={{ alignSelf: 'flex-start' }} onClick={() => setPollOptions((s) => [...s, ''])}>
                <Plus size={13} /> 添加选项
              </button>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <TypeChip label="单选" active={!pollMulti} onClick={() => setPollMulti(false)} small />
              <TypeChip label="多选" active={pollMulti} onClick={() => setPollMulti(true)} small />
              <select value={pollHours} onChange={(e) => setPollHours(Number(e.target.value))} style={{ flex: 1, height: 30, padding: '0 8px' }}>
                <option value={0}>永久</option>
                <option value={24}>1 天截止</option>
                <option value={72}>3 天截止</option>
                <option value={168}>7 天截止</option>
              </select>
            </div>
          </>
        )}

        {type === 'relay' && (
          <>
            <input value={relayRules} onChange={(e) => setRelayRules(e.target.value)} placeholder="接力规则（可选）" maxLength={60} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>目标段数</span>
              <input type="range" min={3} max={20} value={relayTarget} onChange={(e) => setRelayTarget(Number(e.target.value))} style={{ flex: 1 }} />
              <span className="fs-micro mono" style={{ color: 'var(--text-primary)' }}>{relayTarget}</span>
            </div>
          </>
        )}

        {playStyle === 'fanfic' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <input value={fanfic.cp} onChange={(e) => setFanfic({ ...fanfic, cp: e.target.value })} placeholder="CP" maxLength={20} />
            <input value={fanfic.words} onChange={(e) => setFanfic({ ...fanfic, words: e.target.value })} placeholder="预计字数" maxLength={12} />
            <input value={fanfic.style} onChange={(e) => setFanfic({ ...fanfic, style: e.target.value })} placeholder="文风" maxLength={16} />
            <input value={fanfic.ending} onChange={(e) => setFanfic({ ...fanfic, ending: e.target.value })} placeholder="结局走向" maxLength={16} />
            <input value={fanfic.outline} onChange={(e) => setFanfic({ ...fanfic, outline: e.target.value })} placeholder="大纲" maxLength={60} style={{ gridColumn: '1 / -1' }} />
          </div>
        )}

        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="话题标签，空格分隔（会进热搜）" maxLength={60} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TypeChip label={anonymous ? '匿名' : '实名'} active={anonymous} onClick={() => setAnonymous(!anonymous)} small />
          {anonymous && (
            <>
              {aliases.length === 0 ? (
                <span className="fs-micro" style={{ color: '#ffb08a' }}>还没有马甲，去「我的」创建，或将以「匿名用户」发布</span>
              ) : (
                <select value={aliasId ?? activeAliasId ?? aliases[0].id} onChange={(e) => setAliasId(e.target.value)} style={{ flex: 1, height: 30, padding: '0 8px' }}>
                  {aliases.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        <button className="btn btn-accent" onClick={submit}>发布</button>
      </div>
    </Modal>
  )
}

function TypeChip({ label, active, onClick, small }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      style={{
        fontSize: `calc(${small ? 11 : 13}px * var(--fs-scale))`,
        padding: small ? '3px 10px' : '6px 14px',
        borderRadius: 999,
        background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      {label}
    </button>
  )
}

function Thumb({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useBlobURL(id)
  return (
    <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <button className="pressable" onClick={onRemove} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8a8a' }}>
        <X size={11} />
      </button>
    </div>
  )
}
