import type { Character } from '../store/characters'
import type { ApiPreset } from '../store/apiPresets'
import { useCharacters } from '../store/characters'
import { useSettings } from '../store/settings'
import { useWorld, USER_ID, relationId, privateKey, defaultEmotion, type PrivateMsg } from '../store/world'
import type { ChatApiMessage } from './api'
import { buildCharacterPrompt, buildScheduleContext } from './chatEngine'
import { emotionOf, displayNameOf, todayEvent } from './worldLife'
import { ATTITUDE_LABEL } from './worldStyle'
import { streamChat } from './api'
import { displayUserName } from '../store/profile'

async function callJson<T>(preset: ApiPreset, sys: string, userMsg: string): Promise<T | null> {
  const apiMessages: ChatApiMessage[] =
    preset.injectMode === 'merge-user'
      ? [{ role: 'user', content: `[系统设定]\n${sys}` }, { role: 'user', content: userMsg }]
      : [{ role: 'system', content: sys }, { role: 'user', content: userMsg }]
  try {
    const raw = await streamChat(preset, apiMessages, { onDelta: () => {} })
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

export async function generateDiary(
  character: Character,
  preset: ApiPreset
): Promise<{ content: string; mood: string; mentions: string[] } | null> {
  const world = useWorld.getState()
  const emo = emotionOf(character.id)
  const rels = world.relations.filter((r) => r.fromId === character.id)
  const schedule = buildScheduleContext(character.id)
  const sys = `${buildCharacterPrompt(character)}
【日记任务】以第一人称写一篇今天的日记。要求：
- 基于你当前的情绪状态自然流淌，情绪低就写得丧一点、纠结一点，情绪好就写得鲜活一点
- 可以提到今天行程里的片段和其他角色的相处，体现真实关系态度
- 有活人感：细节、犹豫、口是心非都可以，禁止口号式抒情
- 严格输出 JSON（不要 markdown 代码块）：{"content":"日记正文，150-300字","mood":"心情关键词，2-4字","mentions":["提到的人名"]}`
  const userMsg = `${schedule}
当前情绪：${emo.surface}（强度 ${emo.intensity}/100）
关系：${rels.map((r) => `${displayNameOf(r.toId)}（${ATTITUDE_LABEL[r.attitude]}${r.intensity}）`).join('、') || '暂无'}
写今天的日记。`
  const j = await callJson<{ content: string; mood: string; mentions: string[] }>(preset, sys, userMsg)
  if (!j || !j.content) return null
  return {
    content: String(j.content),
    mood: String(j.mood ?? emo.surface).slice(0, 6),
    mentions: Array.isArray(j.mentions) ? j.mentions.map(String).slice(0, 5) : [],
  }
}

export async function generateInnerVoice(character: Character, preset: ApiPreset): Promise<string | null> {
  const world = useWorld.getState()
  const emo = emotionOf(character.id)
  const toUser = world.relations.find((r) => r.id === relationId(character.id, USER_ID))
  const sys = `${buildCharacterPrompt(character)}
【心里话任务】输出你此刻对用户没说出口的一句真实想法。要求：碎片化、私密、符合当前情绪和对用户的态度；只有一句，40字以内。严格输出 JSON：{"text":"那句话"}`
  const userMsg = `当前情绪：${emo.surface}（强度 ${emo.intensity}/100）${toUser ? `，对用户：${ATTITUDE_LABEL[toUser.attitude]}（${toUser.intensity}/100）` : ''}
现在心里想的是什么？${todayEvent() && todayEvent()!.participants.includes(character.id) ? `\n今天发生的事：${todayEvent()!.description}` : ''}`
  const j = await callJson<{ text: string }>(preset, sys, userMsg)
  return j?.text ? String(j.text).slice(0, 60) : null
}

export async function generatePrivateThread(
  a: Character,
  b: Character,
  preset: ApiPreset
): Promise<PrivateMsg[] | null> {
  const world = useWorld.getState()
  const relAB = world.relations.find((r) => r.id === relationId(a.id, b.id))
  const relBA = world.relations.find((r) => r.id === relationId(b.id, a.id))
  const sys = `你负责写一段两个角色之间的私下聊天记录。这不是和用户的对话，是他们的私聊。
角色A：${a.name}（${a.personality || '性格未详'}）
角色B：${b.name}（${b.personality || '性格未详'}）
A对B的态度：${relAB ? `${ATTITUDE_LABEL[relAB.attitude]}（强度${relAB.intensity}）${relAB.isSecret ? '，藏着没表露' : ''}` : '无感'}
B对A的态度：${relBA ? `${ATTITUDE_LABEL[relBA.attitude]}（强度${relBA.intensity}）${relBA.isSecret ? '，藏着没表露' : ''}` : '无感'}
【要求】对话要反映真实关系（喜欢就暧昧试探，讨厌就阴阳怪气，无感就客气疏离），内容像真人微信聊天，可以聊到用户${displayUserName(useSettings.getState().phoneName || '我')}。4-8条消息。严格输出 JSON：{"messages":[{"sender":"角色名","content":"消息内容"}]}`
  const j = await callJson<{ messages: { sender: string; content: string }[] }>(preset, sys, '生成这段私聊。')
  if (!j?.messages || !Array.isArray(j.messages)) return null
  return j.messages.slice(0, 8).map((m) => ({
    id: `pm${Math.random().toString(36).slice(2, 9)}`,
    senderId: m.sender === b.name ? b.id : a.id,
    content: String(m.content).slice(0, 200),
    time: Date.now(),
  }))
}

export function privateKeyFor(aId: string, bId: string): string {
  return privateKey(aId, bId)
}

export { defaultEmotion }
