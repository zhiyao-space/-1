import { Ban, BellOff, MessageCircle } from 'lucide-react'
import {
  ONLINE_LABEL,
  RELATIONSHIP_LABEL,
  daysSince,
  useCharacter,
  useSocial,
} from '../../store/social'
import { useToast } from '../../store/ui'
import { AffinityBar, Pill, Sheet } from './SocialParts'
import { ImageField } from '../common'

/* 「mu社区恋爱交友软件」角色卡：资料 / 好感度 / 主动来信 / 快捷操作 */

export default function CharacterCard({
  charId,
  onClose,
  onOpenChat,
}: {
  charId: string | null
  onClose: () => void
  onOpenChat: (charId: string) => void
}) {
  const character = useCharacter(charId)
  const patchCharacter = useSocial((s) => s.patchCharacter)
  const toggleProactive = useSocial((s) => s.toggleProactive)
  const toggleMute = useSocial((s) => s.toggleMute)
  const toggleBlock = useSocial((s) => s.toggleBlock)
  const push = useToast((s) => s.push)

  function tagRow(label: string, items: string[]) {
    if (!items.length) return null
    return (
      <div style={{ marginTop: 12 }}>
        <div className="sc-sub" style={{ marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((it) => (
            <Pill key={it}>{it}</Pill>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Sheet open={!!charId} onClose={onClose} title={character?.nickname ?? '角色'}>
      {character && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <ImageField
                value={character.avatarId}
                onChange={(id) => patchCharacter(character.id, { avatarId: id ?? undefined })}
                size={64}
              />
              <span className={`sc-online-dot sc-online-dot--${character.onlineStatus}`} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sc-title" style={{ fontSize: 18 }}>
                {character.nickname}
              </div>
              <div className="sc-sub" style={{ marginTop: 3 }}>
                {ONLINE_LABEL[character.onlineStatus]}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                <Pill>{RELATIONSHIP_LABEL[character.relationship]}</Pill>
                <Pill>{character.zodiac}</Pill>
                <Pill>{character.mbti}</Pill>
              </div>
            </div>
          </div>

          <p style={{ margin: '14px 0 0', color: 'var(--fx-t2)', fontSize: 13, lineHeight: 1.65 }}>
            {character.bio}
          </p>

          {tagRow('性格', character.personality)}
          {tagRow('兴趣', character.interests)}
          {tagRow('擅长', character.skills)}

          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <span className="sc-sub">好感度</span>
              <span style={{ color: 'var(--fx-t1)', fontSize: 13, fontWeight: 600 }}>
                {character.affinity} / 100
              </span>
            </div>
            <AffinityBar value={character.affinity} />
            <div className="sc-sub" style={{ marginTop: 6 }}>
              相识 {daysSince(character.metAt)} 天
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div>
              <div className="sc-sub">主动来信</div>
              <div className="sc-sub" style={{ marginTop: 2 }}>
                开启后 TA 会按你的动态主动发消息
              </div>
            </div>
            <Pill
              on={character.proactive}
              onClick={() => {
                toggleProactive(character.id)
                push(character.proactive ? '已关闭主动来信' : '已开启主动来信')
              }}
            >
              {character.proactive ? '已开启' : '已关闭'}
            </Pill>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button
              className="fx-btn fx-btn--accent fx-press"
              style={{ flex: 1, padding: '0 8px', whiteSpace: 'nowrap' }}
              onClick={() => onOpenChat(character.id)}
            >
              <MessageCircle size={16} />
              发消息
            </button>
            <button
              className="fx-btn fx-press"
              style={{ flex: 1, padding: '0 8px', whiteSpace: 'nowrap' }}
              onClick={() => {
                toggleMute(character.id)
                push(character.muted ? '已取消暂离' : '已设为暂离')
              }}
            >
              <BellOff size={16} />
              {character.muted ? '取消暂离' : '暂离'}
            </button>
            <button
              className="fx-btn fx-press"
              style={{ flex: 1, padding: '0 8px', whiteSpace: 'nowrap' }}
              onClick={() => {
                toggleBlock(character.id)
                push(character.blocked ? '已解除拉黑' : '已拉黑')
              }}
            >
              <Ban size={16} />
              {character.blocked ? '解除拉黑' : '拉黑'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}