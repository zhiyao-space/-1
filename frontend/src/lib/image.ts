export interface CropState {
  aspect: number | null
  scale: number
  offsetX: number
  offsetY: number
}

function loadImage(src: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(src)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

export async function compressImage(file: Blob, maxDim = 1920): Promise<Blob> {
  const img = await loadImage(file)
  const { width, height } = img
  const ratio = Math.min(1, maxDim / Math.max(width, height))
  if (ratio >= 1 && file.size < 3_000_000) return file
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.9)
  )
}

export async function cropImage(src: Blob, crop: CropState, maxDim = 1920): Promise<Blob> {
  const img = await loadImage(src)
  let sx = 0
  let sy = 0
  let sw = img.width
  let sh = img.height
  if (crop.aspect) {
    const imgAspect = img.width / img.height
    if (imgAspect > crop.aspect) {
      sw = img.height * crop.aspect
      sx = (img.width - sw) / 2
    } else {
      sh = img.width / crop.aspect
      sy = (img.height - sh) / 2
    }
  }
  const outW = Math.min(maxDim, Math.round(sw * crop.scale))
  const outH = Math.round(outW * (sh / sw))
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return src
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, outW, outH)
  ctx.drawImage(img, sx, sy, sw, sh, crop.offsetX * outW, crop.offsetY * outH, outW, outH)
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? src), 'image/jpeg', 0.9)
  )
}
