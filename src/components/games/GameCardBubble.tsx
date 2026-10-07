import { useGames, type GameSession } from '../../store/games'
import { useChats } from '../../store/chats'
import { useCharacters } from '../../store/characters'
import { handleGameHint } from '../../lib/gameEngine'

const VERDICT_LABEL: Record<string, string> = {
  yes: '是',
  no: '否',
  irrelevant: '无关',
  close: '接近了',
}

export function GameCardBubble({ gameId }: { gameId: string }) {
  const session = useGames((s) => s.games.find((g) => g.id === gameId))
  if (!session) {
    return (
      <div
        className="fs-micro"
        style={{ padding: '10px 14px', borderRadius: 14, background: 'var(--bg-secondary, rgba(128,128,128,.12))', maxWidth: 240 }}
      >
        游戏已删除
      </div>
    )
  }
  return <GameCardBody session={session} />
}

function GameCardBody({ session }: { session: GameSession }) {
  const character = useCharacters((s) => s.characters.find((c) => c.id === session.characterId))
  const typeLabel = session.type === 'trpg' ? '文字跑团' : '海龟汤'
  const statusLabel = session.status === 'playing' ? '进行中' : session.status === 'paused' ? '已暂停' : '已结束'
  const statusColor =
    session.status === 'playing' ? 'var(--accent-color)' : session.status === 'paused' ? 'var(--text-tertiary)' : 'var(--text-disabled)'

  const endGame = () => {
    useGames.getState().endGame(session.id, '玩家主动结束了游戏。')
    useChats.getState().addMessage(session.chatId, {
      role: 'system',
      type: 'system',
      content: '游戏已结束并归档',
    })
  }

  const resume = () => {
    useGames.getState().setStatus(session.id, 'playing')
    useChats.getState().addMessage(session.chatId, {
      role: 'system',
      type: 'system',
      content: '游戏继续，请角色接着场景往下演',
    })
  }

  const remove = () => {
    useGames.getState().removeGame(session.id)
    if (session.cardMsgId) useChats.getState().removeMessage(session.chatId, session.cardMsgId)
  }

  const askHint = async () => {
    if (!character) return
    try {
      const text = await handleGameHint(session, character)
      useChats.getState().addMessage(session.chatId, { role: 'assistant', type: 'text', content: text })
    } catch (e) {
      useChats.getState().addMessage(session.chatId, {
        role: 'system',
        type: 'system',
        content: `提示生成失败：${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }

  return (
    <div
      className="no-select"
      style={{
        width: 248,
        padding: '12px 14px',
        borderRadius: 16,
        background: 'var(--bg-secondary, rgba(128,128,128,.12))',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>{session.type === 'trpg' ? '文字跑团' : '海龟汤'}</span>
        <span className="fs-micro" style={{ color: statusColor }}>
          {statusLabel} · {session.turn} 回合
        </span>
      </div>

      {session.type === 'trpg' && session.trpg && (
        <TrpgPanel session={session} />
      )}
      {session.type === 'turtle' && session.turtle && <TurtlePanel session={session} />}

      {session.status === 'ended' && (
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
          {session.ending ?? '游戏结束'}
        </div>
      )}

      {session.type === 'turtle' && session.status === 'playing' && session.turtle && !session.turtle.solved && (
        <button className="btn" style={{ padding: '6px 10px' }} onClick={askHint}>
          要提示（剩 {3 - session.turtle.hints} 次）
        </button>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        {session.status === 'playing' && (
          <>
            <button
              className="btn"
              style={{ flex: 1, padding: '6px 0', fontSize: 12 }}
              onClick={() => useGames.getState().setStatus(session.id, 'paused')}
            >
              暂停
            </button>
            <button className="btn" style={{ flex: 1, padding: '6px 0', fontSize: 12 }} onClick={endGame}>
              结束归档
            </button>
          </>
        )}
        {session.status === 'paused' && (
          <>
            <button className="btn btn-accent" style={{ flex: 1, padding: '6px 0', fontSize: 12 }} onClick={resume}>
              继续
            </button>
            <button className="btn" style={{ flex: 1, padding: '6px 0', fontSize: 12 }} onClick={endGame}>
              结束归档
            </button>
          </>
        )}
        {session.status === 'ended' && (
          <button className="btn" style={{ flex: 1, padding: '6px 0', fontSize: 12 }} onClick={remove}>
            删除记录
          </button>
        )}
      </div>

      {character && session.status !== 'ended' && (
        <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
          {typeLabel} · 主持人：{character.name}
        </div>
      )}
    </div>
  )
}

function TrpgPanel({ session }: { session: GameSession }) {
  const st = session.trpg!
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
        {st.act} · {st.scene}
      </div>
      <div>
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(128,128,128,.25)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${st.progress}%`,
              height: '100%',
              borderRadius: 3,
              background: 'var(--accent-color)',
              transition: 'width .4s',
            }}
          />
        </div>
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 3 }}>
          冒险进度 {st.progress}%
        </div>
      </div>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
        生命 {'♥'.repeat(st.hp)}
        {'♡'.repeat(Math.max(0, 10 - st.hp))}
      </div>
      {st.items.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {st.items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              className="fs-micro"
              style={{
                padding: '2px 8px',
                borderRadius: 8,
                background: 'rgba(128,128,128,.15)',
                color: 'var(--text-secondary)',
              }}
            >
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function TurtlePanel({ session }: { session: GameSession }) {
  const st = session.turtle!
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        【汤面】{st.puzzle || '（出题中…）'}
      </div>
      {session.status === 'ended' && st.revealed && (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>【汤底】{st.revealed}</div>
      )}
      {st.qa.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 96, overflowY: 'auto' }}>
          {st.qa.map((x, i) => (
            <div key={i} className="fs-micro" style={{ display: 'flex', gap: 6, color: 'var(--text-tertiary)' }}>
              <span
                style={{
                  flexShrink: 0,
                  color: x.verdict === 'yes' ? 'var(--accent-color)' : x.verdict === 'close' ? 'var(--text-secondary)' : 'var(--text-disabled)',
                  fontWeight: 600,
                }}
              >
                {VERDICT_LABEL[x.verdict] ?? '无关'}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.q}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
