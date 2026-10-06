import { useState } from 'react'
import { Modal } from '../common'
import { useChats } from '../../store/chats'
import { useGames, type GameType } from '../../store/games'
import type { Character } from '../../store/characters'
import { startGame, trpgPresets, type StartGameConfig } from '../../lib/gameEngine'

export function GameSetupModal({
  open,
  onClose,
  chatId,
  character,
}: {
  open: boolean
  onClose: () => void
  chatId: string
  character: Character
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [gameType, setGameType] = useState<GameType>('trpg')
  const [presetIdx, setPresetIdx] = useState(0)
  const [worldText, setWorldText] = useState('')
  const [roleText, setRoleText] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')
  const [theme, setTheme] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setStep(1)
    setGameType('trpg')
    setPresetIdx(0)
    setWorldText('')
    setRoleText('')
    setDifficulty('normal')
    setTheme('')
    setBusy(false)
  }

  const close = () => {
    onClose()
    setTimeout(reset, 200)
  }

  const launch = async () => {
    const config: StartGameConfig =
      gameType === 'trpg'
        ? { world: worldText.trim() || trpgPresets[presetIdx].name, role: roleText.trim() }
        : { difficulty, theme: theme.trim() }
    const session = useGames.getState().createGame({
      type: gameType,
      chatId,
      characterId: character.id,
      ...(gameType === 'trpg'
        ? {
            trpg: {
              world: worldText.trim() || trpgPresets[presetIdx].name,
              role: roleText.trim() || trpgPresets[presetIdx].role,
              act: '第一章',
              scene: '起点',
              hp: 10,
              items: [],
              flags: {},
              progress: 0,
            },
          }
        : {
            turtle: { puzzle: '', truth: '', difficulty, qa: [], hints: 0, solved: false, revealed: '' },
          }),
    })
    useChats.getState().addMessage(chatId, {
      role: 'system',
      type: 'system',
      content: gameType === 'trpg' ? '一场「文字跑团」游戏开始了' : '一场「海龟汤」游戏开始了',
    })
    const card = useChats.getState().addMessage(chatId, {
      role: 'assistant',
      type: 'game-card',
      content: '',
      data: { gameId: session.id },
    })
    useGames.getState().setCardMsg(session.id, card.id)
    setBusy(true)
    try {
      const { narrative } = await startGame(session, character, config)
      useChats.getState().addMessage(chatId, { role: 'assistant', type: 'text', content: narrative })
    } catch (e) {
      useChats.getState().addMessage(chatId, {
        role: 'system',
        type: 'system',
        content: `游戏开场失败：${e instanceof Error ? e.message : String(e)}`,
      })
      useGames.getState().endGame(session.id, '开场失败')
    } finally {
      setBusy(false)
      close()
    }
  }

  return (
    <Modal open={open} onClose={close} title={step === 1 ? '一起玩' : gameType === 'trpg' ? '文字跑团' : '海龟汤'}>
      {step === 1 && (
        <div style={{ display: 'flex', gap: 10, paddingBottom: 6 }}>
          <button
            className="btn"
            style={{ flex: 1, flexDirection: 'column', height: 88, gap: 4 }}
            onClick={() => {
              setGameType('trpg')
              setStep(2)
            }}
          >
            <span style={{ fontSize: 22 }}>🎲</span>
            <span>文字跑团</span>
            <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>自由冒险 · 骰子判定</span>
          </button>
          <button
            className="btn"
            style={{ flex: 1, flexDirection: 'column', height: 88, gap: 4 }}
            onClick={() => {
              setGameType('turtle')
              setStep(2)
            }}
          >
            <span style={{ fontSize: 22 }}>🍲</span>
            <span>海龟汤</span>
            <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>情境推理 · 自由提问</span>
          </button>
        </div>
      )}
      {step === 2 && gameType === 'trpg' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 6 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {trpgPresets.map((p, i) => (
              <button
                key={p.id}
                className="btn"
                style={
                  i === presetIdx && !worldText.trim()
                    ? { padding: '6px 12px', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }
                    : { padding: '6px 12px' }
                }
                onClick={() => setPresetIdx(i)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <textarea
            value={worldText}
            onChange={(e) => setWorldText(e.target.value)}
            placeholder={`世界观（留空使用「${trpgPresets[presetIdx].name}」预设）`}
            rows={3}
            style={{ resize: 'none', fontSize: 13 }}
          />
          <input
            value={roleText}
            onChange={(e) => setRoleText(e.target.value)}
            placeholder={`你的身份（留空默认：${trpgPresets[presetIdx].role}）`}
            maxLength={30}
          />
          <button className="btn btn-accent" onClick={launch} disabled={busy}>
            {busy ? '开场中…' : '开始冒险'}
          </button>
        </div>
      )}
      {step === 2 && gameType === 'turtle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(
              [
                ['easy', '简单'],
                ['normal', '普通'],
                ['hard', '烧脑'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                className="btn"
                style={
                  difficulty === v
                    ? { flex: 1, borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }
                    : { flex: 1 }
                }
                onClick={() => setDifficulty(v)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="主题偏好（可选，如：日常反转 / 犯罪）"
            maxLength={20}
          />
          <button className="btn btn-accent" onClick={launch} disabled={busy}>
            {busy ? '出题中…' : '开始猜汤'}
          </button>
        </div>
      )}
    </Modal>
  )
}
