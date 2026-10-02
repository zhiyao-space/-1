import { useCharacters } from '../../store/characters'
import { useProfile } from '../../store/profile'
import { useForum } from '../../store/forum'
import { useSettings } from '../../store/settings'
import { useBlobURL } from '../WallpaperLayer'
import type { MomentAuthor } from '../../store/moments'

export function useUserDisplay(): { avatarId: string | null; name: string } {
  const profile = useProfile((s) => s.profile)
  const phoneName = useSettings((s) => s.phoneName)
  const mask = profile.masks.find((m) => m.active)
  return {
    avatarId: mask?.avatarId ?? profile.avatarId,
    name: mask?.name.trim() || profile.nickname.trim() || phoneName || '我',
  }
}

export default function AuthorAvatar({ author, size = 40 }: { author: MomentAuthor; size?: number }) {
  const user = useUserDisplay()
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const char = author.type === 'character' ? characters.find((c) => c.id === author.id) : null
  const npc = author.type === 'npc' ? npcs.find((n) => n.id === author.id) : null
  const avatarId = author.type === 'user' ? user.avatarId : char?.avatarId ?? npc?.avatarId ?? null
  const name = author.type === 'user' ? user.name : char?.name ?? npc?.name ?? author.name
  const url = useBlobURL(avatarId)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span className="fs-body" style={{ color: 'var(--text-tertiary)', fontSize: Math.max(12, size * 0.4) }}>
          {name.slice(0, 1) || '?'}
        </span>
      )}
    </div>
  )
}
