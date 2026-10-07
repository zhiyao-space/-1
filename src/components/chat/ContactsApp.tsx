import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Users, ChevronRight, Pencil, Trash2, MessageCircle, X, Sparkles, Wand2 } from 'lucide-react'
import { useCharacters, removeCharacterEverywhere, type Character } from '../../store/characters'
import { useSnoop } from '../../store/snoop'
import { useGroups } from '../../store/groups'
import { useToast, useUI } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import CharacterEditor from './CharacterEditor'
import GroupCreatorModal from './GroupCreatorModal'
import NpcGeneratorModal from './NpcGeneratorModal'
import Avatar from './Avatar'
import ChatScreen from './ChatScreen'
import GroupChatScreen from './GroupChatScreen'
import { Modal, SectionCard } from '../common'

export default function ContactsApp() {
  const characters = useCharacters((s) => s.characters)
  const groups = useGroups((s) => s.groups)
  const [tab, setTab] = useState<'friends' | 'groups'>('friends')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Character | null>(null)
  const [detail, setDetail] = useState<Character | null>(null)
  const [groupCreatorOpen, setGroupCreatorOpen] = useState(false)
  const [openChat, setOpenChat] = useState<{ kind: 'single'; characterId: string } | { kind: 'group'; groupId: string } | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [npcOpen, setNpcOpen] = useState(false)
  const [npcMainId, setNpcMainId] = useState<string | null>(null)
  const [npcPrompt, setNpcPrompt] = useState<{ id: string; name: string } | null>(null)
  const pendingChat = useUI((s) => s.pendingChat)
  const setPendingChat = useUI((s) => s.setPendingChat)

  const allTags = useMemo(() => {
    const count = new Map<string, number>()
    for (const c of characters) for (const t of c.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1)
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 16)
  }, [characters])

  const visibleCharacters = useMemo(
    () => (selectedTag ? characters.filter((c) => (c.tags ?? []).includes(selectedTag)) : characters),
    [characters, selectedTag]
  )

  useEffect(() => {
    if (selectedTag && !allTags.includes(selectedTag)) setSelectedTag(null)
  }, [allTags, selectedTag])

  useEffect(() => {
    if (pendingChat) {
      setOpenChat(pendingChat)
      setPendingChat(null)
    }
  }, [pendingChat, setPendingChat])

  if (openChat?.kind === 'single') {
    return <ChatScreen characterId={openChat.characterId} onExit={() => setOpenChat(null)} />
  }
  if (openChat?.kind === 'group') {
    return <GroupChatScreen groupId={openChat.groupId} onExit={() => setOpenChat(null)} />
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', flexShrink: 0 }}>
        <TabBtn active={tab === 'friends'} onClick={() => setTab('friends')} label={`好友 ${characters.length}`} />
        <TabBtn active={tab === 'groups'} onClick={() => setTab('groups')} label={`群聊 ${groups.length}`} />
      </div>

      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        {tab === 'friends' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                className="btn btn-accent"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => {
                  setEditing(null)
                  setEditorOpen(true)
                }}
              >
                <UserPlus size={16} /> 创建角色
              </button>
              <button
                className="btn pressable"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                disabled={characters.length === 0}
                onClick={() => {
                  setNpcMainId(null)
                  setNpcOpen(true)
                }}
              >
                <Sparkles size={15} /> 生成NPC
              </button>
            </div>

            {allTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                <button
                  className="pressable fs-micro"
                  onClick={() => setSelectedTag(null)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: selectedTag === null ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: selectedTag === null ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  全部
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    className="pressable fs-micro"
                    onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: selectedTag === t ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: selectedTag === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {characters.length === 0 ? (
              <EmptyHint text="还没有角色。描述你想要的人设让 AI 生成，或从文件导入，一切由你决定。" />
            ) : visibleCharacters.length === 0 ? (
              <EmptyHint text="该标签下暂无角色。" />
            ) : (
              <SectionCard>
                {visibleCharacters.map((c) => (
                  <CharacterRow key={c.id} c={c} onOpenDetail={() => setDetail(c)} onOpenChat={() => setOpenChat({ kind: 'single', characterId: c.id })} />
                ))}
              </SectionCard>
            )}
          </>
        )}

        {tab === 'groups' && (
          <>
            <button
              className="btn btn-accent"
              style={{ width: '100%', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => setGroupCreatorOpen(true)}
            >
              <Users size={16} /> 创建群聊
            </button>

            {groups.length === 0 ? (
              <EmptyHint text="还没有群聊。拉上你创建的角色，建一个群。" />
            ) : (
              <SectionCard>
                {groups.map((g) => (
                  <GroupRow key={g.id} groupId={g.id} onOpen={() => setOpenChat({ kind: 'group', groupId: g.id })} />
                ))}
              </SectionCard>
            )}
          </>
        )}
      </div>

      <CharacterEditor
        open={editorOpen}
        character={editing}
        onClose={() => setEditorOpen(false)}
        onCreated={(id, suggestNpc) => {
          const created = useCharacters.getState().characters.find((c) => c.id === id)
          if (suggestNpc && created) setNpcPrompt({ id, name: created.name })
        }}
      />
      <GroupCreatorModal open={groupCreatorOpen} onClose={() => setGroupCreatorOpen(false)} onCreated={(gid) => {
        setGroupCreatorOpen(false)
        setOpenChat({ kind: 'group', groupId: gid })
      }} />

      <NpcGeneratorModal open={npcOpen} mainCharacterId={npcMainId} onClose={() => setNpcOpen(false)} />

      <Modal open={!!npcPrompt} onClose={() => setNpcPrompt(null)} title="生成关联 NPC" width={320}>
        <div className="fs-body" style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          是否为「{npcPrompt?.name}」自动生成 3-5 个关联 NPC（朋友 / 家人 / 对手等）？它们会加入通讯录，可与主角互动。
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setNpcPrompt(null)}>
            暂不
          </button>
          <button
            className="btn btn-accent"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => {
              if (npcPrompt) {
                setNpcMainId(npcPrompt.id)
                setNpcOpen(true)
              }
              setNpcPrompt(null)
            }}
          >
            <Wand2 size={15} /> 生成
          </button>
        </div>
      </Modal>

      {detail && (
        <CharacterDetailSheet
          character={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detail)
            setDetail(null)
            setEditorOpen(true)
          }}
          onChat={() => {
            setOpenChat({ kind: 'single', characterId: detail.id })
            setDetail(null)
          }}
          onGenerateNpc={() => {
            setNpcMainId(detail.id)
            setNpcOpen(true)
            setDetail(null)
          }}
          onDelete={() => {
            removeCharacterEverywhere(detail.id)
            useToast.getState().push('角色已删除')
            setDetail(null)
          }}
        />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className="btn pressable"
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        borderColor: active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {label}
    </button>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="page-enter" style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, margin: '0 auto 16px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Users size={28} color="var(--text-disabled)" />
      </div>
      <div className="fs-body" style={{ color: 'var(--text-tertiary)', lineHeight: 1.8 }}>{text}</div>
    </div>
  )
}

function CharacterRow({ c, onOpenDetail, onOpenChat }: { c: Character; onOpenDetail: () => void; onOpenChat: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button className="pressable" onClick={onOpenChat} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textAlign: 'left' }}>
        <Avatar imageId={c.avatarId} name={c.name} size={42} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)' }}>{c.name}</span>
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.identity || '点击查看人设'}
          </span>
          {(c.tags ?? []).length > 0 && (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {(c.tags ?? []).slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="fs-micro"
                  style={{ padding: '1px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', color: 'var(--text-tertiary)' }}
                >
                  {t}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
      <button className="pressable" onClick={onOpenChat} style={{ color: 'var(--text-secondary)', padding: 6 }} title="发消息">
        <MessageCircle size={17} />
      </button>
      <button className="pressable" onClick={onOpenDetail} style={{ color: 'var(--text-tertiary)', padding: 6 }}>
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

function GroupRow({ groupId, onOpen }: { groupId: string; onOpen: () => void }) {
  const group = useGroups((s) => s.groups.find((g) => g.id === groupId))
  const lastMsg = useMemo(() => group?.messages[group.messages.length - 1], [group])
  if (!group) return null
  return (
    <button
      className="pressable"
      onClick={onOpen}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}
    >
      <GroupAvatarStack groupId={groupId} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)' }}>{group.name}</span>
        <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lastMsg ? `${lastMsg.senderType === 'user' ? '我' : lastMsg.senderName}: ${lastMsg.content}` : `${group.members.length + (group.includeSelf ? 1 : 0)} 人`}
        </span>
      </span>
      <ChevronRight size={16} color="var(--text-disabled)" />
    </button>
  )
}

function GroupAvatarStack({ groupId }: { groupId: string }) {
  const group = useGroups((s) => s.groups.find((g) => g.id === groupId))
  const characters = useCharacters((s) => s.characters)
  const customUrl = useBlobURL(group?.avatarId)
  if (!group) return null
  if (customUrl) {
    return (
      <div style={{ width: 42, height: 42, borderRadius: '28%', overflow: 'hidden', flexShrink: 0 }}>
        <img src={customUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  const first = group.members.slice(0, 4).map((m) => characters.find((c) => c.id === m.characterId))
  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: '28%',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 1,
      }}
    >
      {first.map((c, i) => (
        <StackCell key={i} imageId={c?.avatarId} name={c?.name ?? '?'} />
      ))}
    </div>
  )
}

function StackCell({ imageId, name }: { imageId: string | null | undefined; name: string }) {
  const url = useBlobURL(imageId)
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{name.slice(0, 1)}</span>
      )}
    </div>
  )
}

/** 角色档案里展示的「查手机」锁屏密码（由角色 id 稳定派生） */
function useSnoopPassword(charId: string): string {
  const [pw, setPw] = useState('')
  useEffect(() => {
    setPw(useSnoop.getState().passwordOf(charId))
  }, [charId])
  return pw
}

function CharacterDetailSheet({
  character,
  onClose,
  onEdit,
  onChat,
  onGenerateNpc,
  onDelete,
}: {
  character: Character
  onClose: () => void
  onEdit: () => void
  onChat: () => void
  onGenerateNpc: () => void
  onDelete: () => void
}) {
  const phonePassword = useSnoopPassword(character.id)
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="page-enter"
        style={{ width: '100%', maxHeight: '78%', overflowY: 'auto', padding: '16px 16px 24px' }}
      >
        {character.bannerId ? <CharacterBanner bannerId={character.bannerId} /> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, marginTop: character.bannerId ? 12 : 0 }}>
          <BigAvatar imageId={character.avatarId} name={character.name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fs-h2" style={{ color: 'var(--text-primary)' }}>{character.name}</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{character.identity || '未填写身份'}</div>
          </div>
          <button className="pressable" onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <SectionCard>
          {(character.tags ?? []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {(character.tags ?? []).map((t) => (
                <span
                  key={t}
                  className="fs-micro"
                  style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <FieldRow label="外观" value={character.appearance} />
          <FieldRow label="性格核心" value={character.personality} />
          <FieldRow label="沟通风格" value={character.commStyle} />
          <FieldRow label="禁止事项" value={character.forbidden} />
          {character.extraFields.map((f) => (
            <FieldRow key={f.id} label={f.label} value={f.value} />
          ))}
          <FieldRow label="手机锁屏密码（悄悄记下的）" value={phonePassword || '——'} />
        </SectionCard>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-accent" style={{ flex: 1 }} onClick={onChat}>发消息</button>
          <button className="btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={onEdit}>
            <Pencil size={14} /> 编辑
          </button>
          <button
            className="btn"
            style={{ color: '#ff6b6b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </button>
        </div>
        <button
          className="btn"
          style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onClick={onGenerateNpc}
        >
          <Sparkles size={15} /> 生成关联 NPC
        </button>
      </div>
    </div>
  )
}

function CharacterBanner({ bannerId }: { bannerId: string }) {
  const url = useBlobURL(bannerId)
  if (!url) return null
  return (
    <div style={{ height: 96, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
}

function BigAvatar({ imageId, name }: { imageId: string | null; name: string }) {
  const url = useBlobURL(imageId)
  return (
    <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span className="fs-h2" style={{ color: 'var(--text-tertiary)' }}>{name.slice(0, 1)}</span>
      )}
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '9px 2px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 3 }}>{label}</div>
      <div className="fs-body" style={{ color: value ? 'var(--text-primary)' : 'var(--text-disabled)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {value || '未填写'}
      </div>
    </div>
  )
}
