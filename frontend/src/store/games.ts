import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GameType = 'trpg' | 'turtle'
export type GameStatus = 'playing' | 'paused' | 'ended'
export type TurtleVerdict = 'yes' | 'no' | 'irrelevant' | 'close'

export interface TrpgState {
  world: string
  role: string
  act: string
  scene: string
  hp: number
  items: string[]
  flags: Record<string, boolean>
  progress: number
}

export interface TurtleQA {
  q: string
  verdict: TurtleVerdict
  at: number
}

export interface TurtleState {
  puzzle: string
  truth: string
  difficulty: 'easy' | 'normal' | 'hard'
  qa: TurtleQA[]
  hints: number
  solved: boolean
  revealed: string
}

export interface GameLogEntry {
  at: number
  who: 'player' | 'gm'
  text: string
}

export interface GameSession {
  id: string
  type: GameType
  chatId: string
  characterId: string
  status: GameStatus
  createdAt: number
  updatedAt: number
  turn: number
  trpg?: TrpgState
  turtle?: TurtleState
  ending?: string
  cardMsgId?: string
  log: GameLogEntry[]
}

interface GamesState {
  games: GameSession[]
  createGame: (input: Omit<GameSession, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'turn' | 'log'>) => GameSession
  patchState: (id: string, patch: Partial<TrpgState> & Partial<TurtleState>) => void
  setCardMsg: (id: string, msgId: string) => void
  pushLog: (id: string, who: 'player' | 'gm', text: string) => void
  setStatus: (id: string, status: GameStatus) => void
  endGame: (id: string, ending: string) => void
  removeGame: (id: string) => void
  getActiveByChat: (chatId: string) => GameSession | undefined
}

function uid(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export const useGames = create<GamesState>()(
  persist(
    (set, get) => ({
      games: [],
      createGame: (input) => {
        const now = Date.now()
        const session: GameSession = {
          ...input,
          id: uid(),
          status: 'playing',
          createdAt: now,
          updatedAt: now,
          turn: 0,
          log: [],
        }
        set((s) => ({
          games: [
            ...s.games.map((g) =>
              g.chatId === input.chatId && g.status !== 'ended'
                ? { ...g, status: 'ended' as const, ending: g.ending ?? '（新开局，旧局自动归档）' }
                : g
            ),
            session,
          ],
        }))
        return session
      },
      patchState: (id, patch) =>
        set((s) => ({
          games: s.games.map((g) => {
            if (g.id !== id) return g
            if (g.type === 'trpg' && g.trpg) {
              return { ...g, trpg: { ...g.trpg, ...patch }, updatedAt: Date.now() }
            }
            if (g.type === 'turtle' && g.turtle) {
              return { ...g, turtle: { ...g.turtle, ...patch }, updatedAt: Date.now() }
            }
            return g
          }),
        })),
      setCardMsg: (id, msgId) =>
        set((s) => ({
          games: s.games.map((g) => (g.id === id ? { ...g, cardMsgId: msgId } : g)),
        })),
      pushLog: (id, who, text) =>
        set((s) => ({
          games: s.games.map((g) =>
            g.id === id
              ? { ...g, turn: g.turn + (who === 'player' ? 1 : 0), log: [...g.log, { at: Date.now(), who, text }].slice(-40), updatedAt: Date.now() }
              : g
          ),
        })),
      setStatus: (id, status) =>
        set((s) => ({
          games: s.games.map((g) => (g.id === id ? { ...g, status, updatedAt: Date.now() } : g)),
        })),
      endGame: (id, ending) =>
        set((s) => ({
          games: s.games.map((g) => (g.id === id ? { ...g, status: 'ended' as const, ending, updatedAt: Date.now() } : g)),
        })),
      removeGame: (id) => set((s) => ({ games: s.games.filter((g) => g.id !== id) })),
      getActiveByChat: (chatId) =>
        get().games.find((g) => g.chatId === chatId && (g.status === 'playing' || g.status === 'paused')),
    }),
    { name: 'ksc:games' }
  )
)
