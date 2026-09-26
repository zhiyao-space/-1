import { ImagePlus, Trash2 } from 'lucide-react'
import { useChatParams } from '../../store/chatParams'
import { useStickers } from '../../store/stickers'
import { useToast } from '../../store/ui'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { useBlobURL } from '../WallpaperLayer'
import { SectionCard, Toggle, Row, SliderRow } from '../common'

export default function ChatParamsPage() {
  const params = useChatParams()
  const stickers = useStickers((s) => s.stickers)
  const push = useToast((s) => s.push)

  const addStickers = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      const files = Array.from(input.files ?? [])
      if (files.length === 0) return
      let count = 0
      for (const f of files) {
        const compressed = await compressImage(f, 512)
        const id = await putBlob(compressed)
        useStickers.getState().addSticker(id, '')
        count++
      }
      push(`已添加 ${count} 张表情包`)
    }
    input.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionCard>
        <Row label="自动响应" sub="关闭后需手动点击“生成回复”" right={<Toggle checked={params.autoReply} onChange={(v) => params.update({ autoReply: v })} />} />
        <Row label="流式输出" sub="逐字显示角色回复" right={<Toggle checked={params.streamOutput} onChange={(v) => params.update({ streamOutput: v })} />} />
        <Row label="回车发送" sub="关闭后用按钮发送" right={<Toggle checked={params.enterToSend} onChange={(v) => params.update({ enterToSend: v })} />} />
        <Row label="允许撤回" sub="长按 / 双击消息可撤回" right={<Toggle checked={params.allowRecall} onChange={(v) => params.update({ allowRecall: v })} />} />
        <Row label="允许 OOC" sub="向角色发送导演指令" right={<Toggle checked={params.allowOoc} onChange={(v) => params.update({ allowOoc: v })} />} />
      </SectionCard>

      <SectionCard>
        <SliderRow
          label="消息分割阈值"
          min={0}
          max={400}
          step={10}
          value={params.splitThreshold}
          format={(v) => (v === 0 ? '关闭' : `${v} 字`)}
          onChange={(v) => params.update({ splitThreshold: v })}
        />
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: -8 }}>回复超过该字数自动拆成多条气泡（0 为关闭）</div>
        <SliderRow
          label="打字延迟基准"
          min={0}
          max={100}
          step={5}
          value={params.typingSpeed}
          format={(v) => `${v}`}
          onChange={(v) => params.update({ typingSpeed: v })}
        />
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: -8 }}>数值越大，角色回复前等待越久</div>
      </SectionCard>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span className="fs-body" style={{ color: 'var(--text-primary)', flex: 1 }}>表情包管理</span>
          <button className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }} onClick={addStickers}>
            <ImagePlus size={14} /> 添加
          </button>
        </div>
        {stickers.length === 0 ? (
          <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
            还没有表情包，添加后可在聊天中发送
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {stickers.map((st) => (
              <div key={st.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                <StickerThumb imageId={st.imageId} />
                <button
                  className="pressable"
                  onClick={() => {
                    useStickers.getState().removeSticker(st.id)
                    push('表情已删除')
                  }}
                  style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8a8a' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StickerThumb({ imageId }: { imageId: string }) {
  const url = useBlobURL(imageId)
  if (!url) return null
  return <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
}
