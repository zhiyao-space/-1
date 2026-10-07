import { useEffect, useRef, useState } from 'react'
import { useCallback } from 'react'

export function useLongPress(onLongPress: () => void, ms = 550) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)

  const start = useCallback(() => {
    fired.current = false
    timer.current = setTimeout(() => {
      fired.current = true
      onLongPress()
    }, ms)
  }, [onLongPress, ms])

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (fired.current) {
      e.preventDefault()
      e.stopPropagation()
      fired.current = false
    }
  }, [])

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onClickCapture,
  }
}

export function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
