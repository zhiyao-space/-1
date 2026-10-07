import { useEffect, useState } from 'react'
import { Ban, BellOff, MessageCircle, Link2, UserPlus, Check } from 'lucide-react'
import {
  ONLINE_LABEL,
  RELATIONSHIP_LABEL,
  daysSince,
  useCharacter,
  useSocial,
} from '../../store/social'
import { useCharacters } from '../../store/characters'
import { useToast, useUI } from '../../store/ui'
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
  const [remark, setRemark] = useState('')
  const [editRemark, setEditRemark] = useState(false)

  useEffect(() => {
    setRemark(character?.remark ?? '')
    setEditRemark(false)
  }, [charId, character?.remark])

  /** 同步到「聊天」模块（已存在同名角色则直接关联） */
  function addToChat() {
    if (!character) return
    if (character.linkedCharacterId) {
      useUI.getState().openApp('chat')
      useUI.getState().setPendingChat({ kind: 'single', characterId: character.linkedCharacterId })
      return
    }
    const name = character.remark?.trim() || character.nickname
    const existing = useCharacters.getState().characters.find((c) => c.name === name)
    const id =
      existing?.id ??
      useCharacters.getState().addCharacter({
        name,
        identity: '',
        appearance: '',
        personality:
          character.bio + (character.personality.length ? `\n性格：${character.personality.join('、')}` : ''),
        commStyle: '',
        forbidden: '',
        extraFields: [],
        avatarId: character.avatarId ?? null,
        apiPresetId: null,
        source: 'manual',
      })
    patchCharacter(character.id, { linkedCharacterId: id })
    push(existing ? '已关联到聊天中的同名角色' : '已添加到聊天')
    useUI.getState().openApp('chat')
    useUI.getState().setPendingChat({ kind: 'single', characterId: id })
  }

  /** 让角色主动添加用户（发来好友申请） */
  function proactiveAddUser() {
    if (!character) return
    useSocial
      .getState()
      .receiveMessage(character.id, { text: `嗨，我是${character.nickname}～看你很有意思，想加你做好友，可以吗？` })
    if (character.relationship === 'stranger') patchCharacter(character.id, { relationship: 'friend' })
    push(`${character.nickname} 主动来加你好友啦`)
    onOpenChat(character.id)
  }

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
    <Sheet open={!!charId} onClose={onClose} title={character?.remark?.trim() || character?.nickname || '角色'}>
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

          {/* 备注名 */}
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
              <div className="sc-sub">备注名</div>
              <div className="sc-sub" style={{ marginTop: 2 }}>
                {character.remark?.trim() || '未设置（显示昵称）'}
              </div>
            </div>
            <Pill on={editRemark} onClick={() => setEditRemark((v) => !v)}>
              {editRemark ? '收起' : '编辑'}
            </Pill>
          </div>
          {editRemark && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                className="fx-input"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="给 TA 起个备注名"
                maxLength={12}
                style={{ flex: 1 }}
              />
              <button
                className="fx-btn fx-btn--accent fx-press"
                style={{ padding: '0 14px', whiteSpace: 'nowrap' }}
                onClick={() => {
                  patchCharacter(character.id, { remark: remark.trim() || undefined })
                  setEditRemark(false)
                  push('备注已保存')
                }}
              >
                <Check size={15} />
                保存
              </button>
            </div>
          )}

          {/* 互通到「聊天」 */}
          <div style={{ marginTop: 16 }}>
            <div className="sc-sub">互通到「聊天」</div>
            <div className="sc-sub" style={{ marginTop: 2, lineHeight: 1.6 }}>
              {character.linkedCharacterId
                ? '已同步到聊天模块，可用完整聊天功能'
                : '把 TA 同步到聊天模块，即可用完整聊天功能'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                className="fx-btn fx-btn--accent fx-press"
                style={{ flex: 1, padding: '0 8px', whiteSpace: 'nowrap' }}
                onClick={addToChat}
              >
                {character.linkedCharacterId ? <Check size={15} /> : <Link2 size={15} />}
                {character.linkedCharacterId ? '已在聊天' : '添加到聊天'}
              </button>
              <button
                className="fx-btn fx-press"
                style={{ flex: 1, padding: '0 8px', whiteSpace: 'nowrap' }}
                onClick={proactiveAddUser}
              >
                <UserPlus size={15} />
                TA 主动加你
              </button>
            </div>
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