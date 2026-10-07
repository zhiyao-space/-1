import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { useChats } from '../../store/chats'
import { useCharacters } from '../../store/characters'
import { useGroups } from '../../store/groups'
import { useApiPresets } from '../../store/apiPresets'
import { useUI } from '../../store/ui'
import CharacterEditor from './CharacterEditor'
import GroupCreatorModal from './GroupCreatorModal'
import Avatar from './Avatar'
import ChatScreen from './ChatScreen'
import GroupChatScreen from './GroupChatScreen'
import { SectionCard } from '../common'

interface Row {
  key: string
  kind: 'single' | 'group'
  id: string
  name: string
  avatarId: string | null
  shape: 'circle' | 'rounded'
  preview: string
  lastActive: number
}

export default function MessagesApp() {
  const chats = useChats((s) => s.sessions)
  const characters = useCharacters((s) => s.characters)
  const groups = useGroups((s) => s.groups)
  const hasChatPreset = useApiPresets((s) => s.presets.some((p) => p.category === 'chat'))
  const [editorOpen, setEditorOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [open, setOpen] = useState<{ kind: 'single'; characterId: string } | { kind: 'group'; groupId: string } | null>(null)
  const pendingChat = useUI((s) => s.pendingChat)
  const setPendingChat = useUI((s) => s.setPendingChat)

  useEffect(() => {
    if (pendingChat) {
      setOpen(pendingChat)
      setPendingChat(null)
    }
  }, [pendingChat, setPendingChat])

  const rows = useMemo<Row[]>(() => {
    const singles = (chats
      .map((s): Row | null => {
        const c = characters.find((x) => x.id === s.characterId)
        if (!c) return null
        const last = s.messages[s.messages.length - 1]
        return {
          key: `s-${s.id}`,
          kind: 'single' as const,
          id: c.id,
          name: c.name,
          avatarId: c.avatarId,
          shape: 'circle' as const,
          preview: last ? `${last.role === 'user' ? '我' : c.name}：${last.content}` : '新的对话',
          lastActive: last?.timestamp ?? s.lastActive,
        }
      })
      ).filter((x): x is Row => !!x)
    const groupRows: Row[] = groups
      .map((g) => {
        const last = g.messages[g.messages.length - 1]
        return {
          key: `g-${g.id}`,
          kind: 'group' as const,
          id: g.id,
          name: g.name,
          avatarId: g.avatarId,
          shape: 'rounded' as const,
          preview: last ? `${last.senderType === 'user' ? '我' : last.senderName}：${last.content}` : '新的群聊',
          lastActive: last?.timestamp ?? g.lastActive,
        }
      })
    return [...singles, ...groupRows].sort((a, b) => b.lastActive - a.lastActive)
  }, [chats, characters, groups])

  if (open?.kind === 'single') return <ChatScreen characterId={open.characterId} onExit={() => setOpen(null)} />
  if (open?.kind === 'group') return <GroupChatScreen groupId={open.groupId} onExit={() => setOpen(null)} />

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
        {rows.length === 0 ? (
          <div className="page-enter" style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, margin: '0 auto 16px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={28} color="var(--text-disabled)" />
            </div>
            <div className="fs-body" style={{ color: 'var(--text-tertiary)', lineHeight: 1.9 }}>
              还没有对话。
              <br />
              创建角色或群聊，从这里开始你的故事。
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-accent" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setEditorOpen(true)}>
                <UserPlus size={15} /> 创建角色
              </button>
              <button className="btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setGroupOpen(true)}>
                <Users size={15} /> 创建群聊
              </button>
            </div>
          </div>
        ) : (
          <SectionCard>
            {rows.map((r) => (
              <button
                key={r.key}
                className="pressable"
                onClick={() => setOpen(r.kind === 'single' ? { kind: 'single', characterId: r.id } : { kind: 'group', groupId: r.id })}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 2px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'left',
                }}
              >
                <Avatar imageId={r.avatarId} name={r.name} size={44} shape={r.shape} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)' }}>{r.name}</span>
                  <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.preview}
                  </span>
                </span>
              </button>
            ))}
          </SectionCard>
        )}

        {rows.length > 0 && !hasChatPreset && (
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
            提示：尚未配置聊天 API，前往 设置 → API 配置 添加后角色才能回复
          </div>
        )}
      </div>

      <CharacterEditor open={editorOpen} character={null} onClose={() => setEditorOpen(false)} />
      <GroupCreatorModal open={groupOpen} onClose={() => setGroupOpen(false)} onCreated={(gid) => {
        setGroupOpen(false)
        setOpen({ kind: 'group', groupId: gid })
      }} />
    </div>
  )
}
