import { useRef, useCallback } from 'react'
import { cn } from '../../lib/utils'

interface ResizeHandleProps {
  onResize: (delta: number) => void
  className?: string
}

export function ResizeHandle({ onResize, className }: ResizeHandleProps) {
  const isDragging = useRef(false)
  const lastX = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      lastX.current = e.clientX

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return
        const delta = e.clientX - lastX.current
        lastX.current = e.clientX
        onResize(delta)
      }

      const onMouseUp = () => {
        isDragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [onResize],
  )

  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        'w-1 flex-shrink-0 bg-bg-border hover:bg-accent-primary/40 cursor-col-resize transition-colors relative group',
        className,
      )}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-0.5 h-3 bg-accent-primary/60 rounded-full" />
        ))}
      </div>
    </div>
  )
}
