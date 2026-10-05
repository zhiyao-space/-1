import { useMemo, useState } from 'react'
import { Heart, MessageCircle, UserCheck } from 'lucide-react'
import { useSocial, MATCH_WEIGHTS, RELATIONSHIP_LABEL, ONLINE_LABEL } from '../../store/social'
import type { SocialCharacter, SocialMatch } from '../../store/social'
import { useToast } from '../../store/ui'
import { EmptyHint, Pill, SectionTitle } from './SocialParts'

/* 「mu社区恋爱交友软件」· 匹配 Tab
   缘分墙：按算法匹配度展示角色，可搜索 / 按个性筛选，卡片进详细资料或直接打招呼 */

const PERSONALITY_FILTERS = ['全部', '温柔', '阳光', '安静', '有趣', '文艺', '治愈', '活泼', '高冷']

const WEIGHT_TEXT = `性格 ${Math.round(MATCH_WEIGHTS.personality * 100)}% · 技能 ${Math.round(
  MATCH_WEIGHTS.skill * 100
)}% · 兴趣 ${Math.round(MATCH_WEIGHTS.interest * 100)}% · 随机 ${Math.round(MATCH_WEIGHTS.random * 100)}%`

export default function MatchTab({ onOpenCard, onOpenChat }: { onOpenCard: (charId: string) => void; onOpenChat: (charId: string) => void }) {
  const characters = useSocial((s) => s.characters)
  const matches = useSocial((s) => s.matches)
  const following = useSocial((s) => s.following)
  const refreshMatches = useSocial((s) => s.refreshMatches)
  const push = useToast((s) => s.push)

  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState('全部')

  const list = useMemo(() => {
    const byId = new Map<string, SocialCharacter>(characters.map((c) => [c.id, c]))
    const kw = keyword.trim().toLowerCase()
    const rows: { match: SocialMatch; char: SocialCharacter }[] = []
    matches.forEach((m) => {
      const char = byId.get(m.charId)
      if (!char || char.blocked) return
      if (filter !== '全部' && !char.personality.includes(filter)) return
      if (kw) {
        const hay = [char.nickname, ...char.personality, ...char.interests].join(' ').toLowerCase()
        if (!hay.includes(kw)) return
      }
      rows.push({ match: m, char })
    })
    return rows
  }, [matches, characters, keyword, filter])

  const handleRefresh = () => {
    refreshMatches()
    push('已刷新缘分池')
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* 顶部：算法说明 + 刷新 + 搜索 + 个性筛选 */}
      <div style={{ flexShrink: 0, padding: '14px 16px 0' }}>
        <SectionTitle
          right={
            <button
              className="sc-pill fx-press-soft"
              onClick={handleRefresh}
              style={{ flexShrink: 0, border: 0, cursor: 'pointer', gap: 5, color: 'var(--fx-accent)', fontWeight: 600 }}
            >
              <Heart size={13} />
              刷新
            </button>
          }
        >
          {WEIGHT_TEXT}
        </SectionTitle>
        <input
          className="fx-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索昵称 / 个性 / 兴趣"
        />
      </div>

      <div className="fx-tabs">
        {PERSONALITY_FILTERS.map((p) => (
          <span key={p} style={{ flex: '0 0 auto', display: 'inline-flex' }}>
            <Pill on={filter === p} onClick={() => setFilter(p)}>
              {p}
            </Pill>
          </span>
        ))}
      </div>

      {/* 缘分墙 */}
      <div className="fx-scroll">
        {list.length === 0 ? (
          <EmptyHint>还没有匹配结果，点右上角刷新缘分池</EmptyHint>
        ) : (
          <div className="sc-waterfall">
            {list.map(({ match, char }) => {
              const followed = following.includes(char.id)
              return (
                <div key={char.id} className="sc-card fx-press" onClick={() => onOpenCard(char.id)}>
                  <div className="sc-card__cover">{char.avatar}</div>

                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                    <span
                      className="sc-title"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 'calc(13.5px * var(--fs-scale))',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {char.nickname}
                    </span>
                    <span className="sc-score" style={{ flex: '0 0 auto', fontSize: 'calc(15px * var(--fs-scale))' }}>
                      {match.matchScore}
                      <small>%</small>
                    </span>
                  </div>

                  {followed && (
                    <div style={{ marginTop: 6 }}>
                      <span className="sc-pill" style={{ padding: '2px 8px', gap: 4, color: 'var(--fx-accent)' }}>
                        <UserCheck size={11} />
                        已关注
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 7,
                      fontSize: 'calc(11.5px * var(--fs-scale))',
                      lineHeight: 1.5,
                      color: 'var(--fx-t2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {match.reason}
                  </div>

                  <div className="sc-sub" style={{ marginTop: 5 }}>
                    {RELATIONSHIP_LABEL[char.relationship]} · {ONLINE_LABEL[char.onlineStatus]}
                  </div>

                  <button
                    className="sc-act fx-press-soft"
                    style={{ marginTop: 9, width: '100%' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenChat(char.id)
                    }}
                  >
                    <MessageCircle size={13} />
                    打招呼
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}