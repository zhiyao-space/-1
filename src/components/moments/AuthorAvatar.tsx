import Avatar from '../chat/Avatar'
import { useCharacters } from '../../store/characters'
import { useForum } from '../../store/forum'
import { useProfile, displayUserName } from '../../store/profile'
import { useSettings } from '../../store/settings'
import type { MomentAuthor } from '../../store/moments'

export default function AuthorAvatar({
  author,
  size = 40,
  shape = 'rounded',
}: {
  author: MomentAuthor
  size?: number
  shape?: 'circle' | 'rounded'
}) {
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const profile = useProfile((s) => s.profile)
  const phoneName = useSettings((s) => s.phoneName)

  let avatarId: string | null = null
  let name = author.name
  if (author.type === 'user') {
    avatarId = profile.avatarId
    name = displayUserName(phoneName) || author.name
  } else if (author.type === 'character') {
    const c = characters.find((x) => x.id === author.id)
    avatarId = c?.avatarId ?? null
    name = c?.name ?? author.name
  } else {
    const n = npcs.find((x) => x.id === author.id)
    avatarId = n?.avatarId ?? null
    name = n?.name ?? author.name
  }

  return <Avatar imageId={avatarId} name={name} size={size} shape={shape} />
}