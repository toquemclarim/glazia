import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const STORAGE_KEY = 'glazia-chat-fab-pos'
const FAB_SIZE = 56
const DRAG_THRESHOLD = 8
const MARGIN = 12

type FabPos = { left: number; top: number }

function clampPos(left: number, top: number): FabPos {
  const maxLeft = Math.max(MARGIN, window.innerWidth - FAB_SIZE - MARGIN)
  const maxTop = Math.max(MARGIN, window.innerHeight - FAB_SIZE - MARGIN)
  return {
    left: Math.min(Math.max(MARGIN, left), maxLeft),
    top: Math.min(Math.max(MARGIN, top), maxTop),
  }
}

function defaultPos(): FabPos {
  return clampPos(
    window.innerWidth - FAB_SIZE - MARGIN,
    window.innerHeight - FAB_SIZE - MARGIN,
  )
}

function readStored(): FabPos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FabPos
    if (
      typeof parsed.left !== 'number' ||
      typeof parsed.top !== 'number' ||
      Number.isNaN(parsed.left) ||
      Number.isNaN(parsed.top)
    ) {
      return null
    }
    return clampPos(parsed.left, parsed.top)
  } catch {
    return null
  }
}

export function useDraggableFab() {
  const [pos, setPos] = useState<FabPos | null>(null)
  const [dragging, setDragging] = useState(false)
  const posRef = useRef<FabPos | null>(null)
  const lastWasDrag = useRef(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originLeft: number
    originTop: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    const initial = readStored() ?? defaultPos()
    posRef.current = initial
    setPos(initial)

    const onResize = () => {
      setPos((prev) => {
        const next = clampPos(
          prev?.left ?? defaultPos().left,
          prev?.top ?? defaultPos().top,
        )
        posRef.current = next
        return next
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      const current = posRef.current ?? defaultPos()
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: current.left,
        originTop: current.top,
        moved: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragging(true)
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return

      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

      drag.moved = true
      const next = clampPos(drag.originLeft + dx, drag.originTop + dy)
      posRef.current = next
      setPos(next)
    },
    [],
  )

  const finish = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }

    if (drag.moved && posRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current))
      } catch {
        /* ignore */
      }
    }

    lastWasDrag.current = drag.moved
    dragRef.current = null
    setDragging(false)
  }, [])

  const shouldIgnoreClick = useCallback(() => {
    if (lastWasDrag.current) {
      lastWasDrag.current = false
      return true
    }
    return false
  }, [])

  const style: CSSProperties | undefined = pos
    ? {
        left: pos.left,
        top: pos.top,
        right: 'auto',
        bottom: 'auto',
      }
    : undefined

  return {
    style,
    dragging,
    fabProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
    shouldIgnoreClick,
  }
}
