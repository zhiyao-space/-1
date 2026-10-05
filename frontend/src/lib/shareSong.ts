import { useChats } from '../store/chats'
import { useToast } from '../store/ui'
import { useMusic, type Track } from '../store/music'
import { resolvePic } from './netease'

/**
 * 把当前歌曲作为「歌曲卡片」分享给角色。
 * 卡片会写入该角色的聊天记录（localStorage 持久化），点卡片即可播放。
 */
export async function shareSongToCharacter(characterId: string, track: Track, note?: string): Promise<void> {
  if (!track) return
  const cover = track.coverUrl ?? (track.picId ? await resolvePic(track.picId, 300) : null)
  const sessionId = useChats.getState().getOrCreateSession(characterId)
  useChats.getState().addMessage(sessionId, {
    role: 'user',
    type: 'music-card',
    content: note?.trim() || `分享给你一首歌：《${track.title}》- ${track.artist}`,
    data: {
      trackId: track.id,
      songTitle: track.title,
      songArtist: track.artist,
      songCover: cover ?? undefined,
      songNcmId: track.ncmId,
    },
  })
  useToast.getState().push('已分享给 TA')
}

/** 播放歌曲卡片（无链接时按需重新解析） */
export function playSongCard(data: { songNcmId?: string; songTitle?: string; songArtist?: string; songCover?: string }): void {
  const id = data.songNcmId
  if (!id || !data.songTitle) {
    useToast.getState().push('该卡片缺少可播放信息', 'error')
    return
  }
  useMusic.getState().playQueue(
    [
      {
        id: `ncm-${id}`,
        title: data.songTitle,
        artist: data.songArtist ?? '',
        src: '',
        coverId: null,
        coverUrl: data.songCover ?? null,
        ncmId: id,
        ncmLyricId: id,
      },
    ],
    0
  )
}