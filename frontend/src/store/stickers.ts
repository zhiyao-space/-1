import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Sticker {
  id: string
  imageId: string
  label: string
}

interface StickerState {
  stickers: Sticker[]
  addSticker: (imageId: string, label: string) => void
  removeSticker: (id: string) => void
}

export const useStickers = create<StickerState>()(
  persist(
    (set) => ({
      stickers: [],
      addSticker: (imageId, label) =>
        set((s) => ({
          stickers: [
            ...s.stickers,
            { id: `st${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, imageId, label },
          ],
        })),
      removeSticker: (id) =>
        set((s) => ({ stickers: s.stickers.filter((x) => x.id !== id) })),
    }),
    { name: 'ksc:stickers' }
  )
)
