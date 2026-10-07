import { useCharacters } from '../store/characters'
import { useWorld, USER_ID, relationId, defaultEmotion } from '../store/world'
import { todayEvent, displayNameOf } from './worldLife'
import { ATTITUDE_LABEL, EMOTION_STYLES } from './worldStyle'

export { ATTITUDE_LABEL, EMOTION_STYLES, displayNameOf }

export function buildWorldContext(characterId: string): string {
  const world = useWorld.getState()
  const emo = world.emotions[characterId] ?? defaultEmotion()
  const style = EMOTION_STYLES[emo.surface] ?? '语气自然'
  const lines: string[] = ['【角色世界 · 当前状态】']
  lines.push(`当前情绪：${emo.surface}（强度 ${emo.intensity}/100）`)
  if (emo.deep.length > 0) {
    lines.push(`深层情绪：${emo.deep.map((d) => `${d.type}（积压 ${d.intensity}）`).join('、')}——这会影响你说话的方式，但通常不会直接说出口`)
  }
  lines.push(`情绪带来的表达方式：${style}`)
  const toUser = world.relations.find((r) => r.id === relationId(characterId, USER_ID))
  if (toUser) {
    lines.push(`你对用户的态度：${ATTITUDE_LABEL[toUser.attitude]}（强度 ${toUser.intensity}/100）${toUser.isSecret ? '（藏着没说）' : ''}`)
  }
  const others = world.relations.filter((r) => r.fromId === characterId && r.toId !== USER_ID)
  if (others.length > 0) {
    lines.push(
      `你和其他角色的关系：${others
        .map((r) => `${displayNameOf(r.toId)}（${ATTITUDE_LABEL[r.attitude]}${r.intensity}${r.isSecret ? '，藏着的' : ''}）`)
        .join('、')}`
    )
    lines.push('聊到这些人时，语气要符合上述态度。')
  }
  const ev = todayEvent()
  if (ev && ev.participants.includes(characterId)) {
    lines.push(`今天发生的事：${ev.description}`)
  }
  return lines.join('\n')
}
