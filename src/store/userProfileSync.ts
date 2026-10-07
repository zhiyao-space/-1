import { useProfile, type UserProfile } from './profile'
import { useSettings } from './settings'

type ProfileFieldPatch = Partial<Pick<UserProfile, 'nickname' | 'avatarId' | 'bio'>>
type SettingsFieldPatch = { phoneName?: string; avatarId?: string | null; signature?: string }

let lock = false

function pushProfileToSettings(p: ProfileFieldPatch) {
  if (lock) return
  lock = true
  try {
    const sPatch: SettingsFieldPatch = {}
    if (p.nickname !== undefined && p.nickname.trim()) sPatch.phoneName = p.nickname.trim()
    if (p.avatarId !== undefined) sPatch.avatarId = p.avatarId
    if (p.bio !== undefined && p.bio.trim()) sPatch.signature = p.bio.trim()
    if (Object.keys(sPatch).length > 0) useSettings.setState(sPatch)
  } finally {
    lock = false
  }
}

function pushSettingsToProfile(s: SettingsFieldPatch) {
  if (lock) return
  lock = true
  try {
    const profile = useProfile.getState().profile
    const pPatch: ProfileFieldPatch = {}
    if (s.phoneName !== undefined && s.phoneName.trim()) pPatch.nickname = s.phoneName.trim()
    if (s.avatarId !== undefined) pPatch.avatarId = s.avatarId
    if (s.signature !== undefined && s.signature.trim()) pPatch.bio = s.signature.trim()
    if (Object.keys(pPatch).length > 0) useProfile.setState({ profile: { ...profile, ...pPatch } })
  } finally {
    lock = false
  }
}

useProfile.subscribe((state, prev) => {
  const p = state.profile
  const pp = prev.profile
  if (p.nickname !== pp.nickname || p.avatarId !== pp.avatarId || p.bio !== pp.bio) {
    pushProfileToSettings({ nickname: p.nickname, avatarId: p.avatarId, bio: p.bio })
  }
})

useSettings.subscribe((state, prev) => {
  if (state.phoneName !== prev.phoneName || state.avatarId !== prev.avatarId || state.signature !== prev.signature) {
    pushSettingsToProfile({
      phoneName: state.phoneName,
      avatarId: state.avatarId,
      signature: state.signature,
    })
  }
})

;(() => {
  lock = true
  try {
    const p = useProfile.getState().profile
    const s = useSettings.getState()
    const sPatch: SettingsFieldPatch = {}
    const pPatch: ProfileFieldPatch = {}
    if (p.avatarId !== s.avatarId) {
      if (p.avatarId) sPatch.avatarId = p.avatarId
      else pPatch.avatarId = s.avatarId
    }
    if (p.nickname.trim() && p.nickname.trim() !== s.phoneName) sPatch.phoneName = p.nickname.trim()
    else if (!p.nickname.trim() && s.phoneName.trim() && s.phoneName !== p.nickname) pPatch.nickname = s.phoneName.trim()
    if (p.bio.trim() && p.bio.trim() !== s.signature) sPatch.signature = p.bio.trim()
    else if (!p.bio.trim() && s.signature.trim() && s.signature !== p.bio) pPatch.bio = s.signature.trim()
    if (Object.keys(sPatch).length > 0) useSettings.setState(sPatch)
    if (Object.keys(pPatch).length > 0) useProfile.setState({ profile: { ...p, ...pPatch } })
  } finally {
    lock = false
  }
})()
