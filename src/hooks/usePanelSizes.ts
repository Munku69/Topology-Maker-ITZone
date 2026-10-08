import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'network-topology-panel-sizes'
const LEFT_LIMITS = { min: 190, max: 420 }
const RIGHT_LIMITS = { min: 260, max: 520 }

interface PanelSizes {
  left: number
  right: number
}

const defaults: PanelSizes = { left: 246, right: 318 }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function loadPanelSizes(): PanelSizes {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<PanelSizes>
    return {
      left: typeof saved.left === 'number' ? clamp(saved.left, LEFT_LIMITS.min, LEFT_LIMITS.max) : defaults.left,
      right: typeof saved.right === 'number' ? clamp(saved.right, RIGHT_LIMITS.min, RIGHT_LIMITS.max) : defaults.right,
    }
  } catch {
    return defaults
  }
}

export function usePanelSizes() {
  const [sizes, setSizes] = useState<PanelSizes>(loadPanelSizes)
  const stopActiveResize = useRef<(() => void) | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes))
    } catch {
      // Resizing still works if browser storage is unavailable.
    }
  }, [sizes])

  useEffect(() => () => stopActiveResize.current?.(), [])

  const startResize = useCallback((side: keyof PanelSizes, event: React.PointerEvent) => {
    event.preventDefault()
    stopActiveResize.current?.()
    document.body.classList.add('is-resizing-panel')
    const cursorWidth = side === 'left' ? event.clientX : window.innerWidth - event.clientX
    const pointerOffset = sizes[side] - cursorWidth

    const onMove = (moveEvent: PointerEvent) => {
      const canvasMinimum = 360
      if (side === 'left') {
        const maximum = Math.min(LEFT_LIMITS.max, Math.max(LEFT_LIMITS.min, window.innerWidth - canvasMinimum))
        setSizes((current) => ({ ...current, left: clamp(moveEvent.clientX + pointerOffset, LEFT_LIMITS.min, maximum) }))
      } else {
        const maximum = Math.min(RIGHT_LIMITS.max, Math.max(RIGHT_LIMITS.min, window.innerWidth - canvasMinimum))
        setSizes((current) => ({ ...current, right: clamp(window.innerWidth - moveEvent.clientX + pointerOffset, RIGHT_LIMITS.min, maximum) }))
      }
    }

    const stop = () => {
      document.body.classList.remove('is-resizing-panel')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      stopActiveResize.current = null
    }

    stopActiveResize.current = stop
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }, [sizes])

  return {
    sizes,
    startLeftResize: (event: React.PointerEvent) => startResize('left', event),
    startRightResize: (event: React.PointerEvent) => startResize('right', event),
  }
}
