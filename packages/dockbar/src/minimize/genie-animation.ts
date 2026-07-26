import type { DockPosition, GenieRect } from './types'
import { isRenderableRect } from './snapshot'

export interface GenieFinishTools {
  drawFinalFrame: (rect: GenieRect) => void
}

export interface GeniePlayOptions {
  beforeFinish?: (tools: GenieFinishTools) => Promise<void> | void
}

export interface GenieAnimationController {
  cancel: () => void
  play: (options?: GeniePlayOptions) => Promise<void>
}

const GENIE_ANIMATION_DURATION_MS = 450
const GENIE_SLIDE_END_FRACTION = 0.58
const GENIE_TRANSLATE_START_FRACTION = 0.42
const GENIE_STRIP_COUNT = 200
const GENIE_MAX_DEVICE_PIXEL_RATIO = 2

interface OverlayCanvas {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  height: number
  view: Window
  width: number
}

interface OrientedBoundary {
  left: number
  right: number
  y: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function quadraticEaseInOut(value: number) {
  if (value < 0.5)
    return 2 * value * value

  return -1 + (4 - 2 * value) * value
}

function setupOverlayCanvas(ownerDocument: Document): OverlayCanvas | null {
  const view = ownerDocument.defaultView
  const parent = ownerDocument.body ?? ownerDocument.documentElement
  if (!view || !parent)
    return null

  const canvas = ownerDocument.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context)
    return null

  const pixelRatio = Math.min(
    view.devicePixelRatio || 1,
    GENIE_MAX_DEVICE_PIXEL_RATIO,
  )
  const width = view.innerWidth
  const height = view.innerHeight

  canvas.width = Math.max(1, Math.ceil(width * pixelRatio))
  canvas.height = Math.max(1, Math.ceil(height * pixelRatio))
  canvas.style.cssText = [
    'position: fixed',
    'inset: 0',
    'width: 100vw',
    'height: 100vh',
    'pointer-events: none',
    'z-index: 2147483000',
  ].join(';')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.setAttribute('data-dock-genie-overlay', '')
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  parent.appendChild(canvas)

  return {
    canvas,
    context,
    height,
    view,
    width,
  }
}

function orientRect(rect: GenieRect, position: DockPosition): GenieRect {
  switch (position) {
    case 'top':
      return {
        height: rect.height,
        left: rect.left,
        top: -(rect.top + rect.height),
        width: rect.width,
      }
    case 'right':
      return {
        height: rect.width,
        left: rect.top,
        top: rect.left,
        width: rect.height,
      }
    case 'left':
      return {
        height: rect.width,
        left: rect.top,
        top: -(rect.left + rect.width),
        width: rect.height,
      }
    case 'bottom':
    default:
      return rect
  }
}

function getBoundaryAtProgress(
  originalRect: GenieRect,
  targetRect: GenieRect,
  verticalProgress: number,
  animationProgress: number,
): OrientedBoundary {
  const slideProgress = clamp(
    animationProgress / GENIE_SLIDE_END_FRACTION,
    0,
    1,
  )
  const translateProgress = clamp(
    (animationProgress - GENIE_TRANSLATE_START_FRACTION)
    / (1 - GENIE_TRANSLATE_START_FRACTION),
    0,
    1,
  )

  const originalBottom = originalRect.top + originalRect.height
  const targetBottom = targetRect.top + targetRect.height
  const translation = translateProgress * (targetRect.top - originalRect.top)
  const topEdgeY = originalRect.top + translation
  const bottomEdgeY = Math.min(originalBottom + translation, targetBottom)
  const leftBezierTopX = originalRect.left
  const rightBezierTopX = originalRect.left + originalRect.width
  const leftBezierBottomX = lerp(
    originalRect.left,
    targetRect.left,
    slideProgress,
  )
  const rightBezierBottomX = lerp(
    originalRect.left + originalRect.width,
    targetRect.left + targetRect.width,
    slideProgress,
  )
  const bezierTopY = originalRect.top
  const bezierBottomY = targetRect.top
  const bezierHeight = Math.max(1, bezierBottomY - bezierTopY)
  const y = lerp(topEdgeY, bottomEdgeY, verticalProgress)

  const bezierPosition = (yPosition: number, topX: number, bottomX: number) => {
    if (yPosition < bezierTopY)
      return topX

    if (yPosition > bezierBottomY)
      return bottomX

    const progress = quadraticEaseInOut(
      (bezierBottomY - yPosition) / bezierHeight,
    )
    return progress * (topX - bottomX) + bottomX
  }

  return {
    left: bezierPosition(y, leftBezierTopX, leftBezierBottomX),
    right: bezierPosition(y, rightBezierTopX, rightBezierBottomX),
    y,
  }
}

function drawOrientedStrip({
  bottom,
  context,
  index,
  position,
  sourceCanvas,
  stripCount,
  top,
}: {
  bottom: OrientedBoundary
  context: CanvasRenderingContext2D
  index: number
  position: DockPosition
  sourceCanvas: HTMLCanvasElement
  stripCount: number
  top: OrientedBoundary
}) {
  const progressStart = index / stripCount
  const progressEnd = (index + 1) / stripCount
  const transverseStart = (top.left + bottom.left) / 2
  const transverseSize = Math.max(
    1,
    (top.right - top.left + bottom.right - bottom.left) / 2,
  )
  const longitudinalSize = Math.max(1, bottom.y - top.y)
  const sourceWidth = sourceCanvas.width
  const sourceHeight = sourceCanvas.height

  switch (position) {
    case 'top': {
      const sy = sourceHeight * (1 - progressEnd)
      const sh = Math.max(1, sourceHeight * (progressEnd - progressStart))
      context.drawImage(
        sourceCanvas,
        0,
        sy,
        sourceWidth,
        sh,
        transverseStart,
        -bottom.y,
        transverseSize,
        longitudinalSize,
      )
      break
    }
    case 'right': {
      const sx = sourceWidth * progressStart
      const sw = Math.max(1, sourceWidth * (progressEnd - progressStart))
      context.drawImage(
        sourceCanvas,
        sx,
        0,
        sw,
        sourceHeight,
        top.y,
        transverseStart,
        longitudinalSize,
        transverseSize,
      )
      break
    }
    case 'left': {
      const sx = sourceWidth * (1 - progressEnd)
      const sw = Math.max(1, sourceWidth * (progressEnd - progressStart))
      context.drawImage(
        sourceCanvas,
        sx,
        0,
        sw,
        sourceHeight,
        -bottom.y,
        transverseStart,
        longitudinalSize,
        transverseSize,
      )
      break
    }
    case 'bottom':
    default: {
      const sy = sourceHeight * progressStart
      const sh = Math.max(1, sourceHeight * (progressEnd - progressStart))
      context.drawImage(
        sourceCanvas,
        0,
        sy,
        sourceWidth,
        sh,
        transverseStart,
        top.y,
        transverseSize,
        longitudinalSize,
      )
    }
  }
}

function drawGenieFrame({
  animationProgress,
  context,
  originalRect,
  position,
  sourceCanvas,
  targetRect,
  viewportHeight,
  viewportWidth,
}: {
  animationProgress: number
  context: CanvasRenderingContext2D
  originalRect: GenieRect
  position: DockPosition
  sourceCanvas: HTMLCanvasElement
  targetRect: GenieRect
  viewportHeight: number
  viewportWidth: number
}) {
  context.clearRect(0, 0, viewportWidth, viewportHeight)

  const orientedOriginalRect = orientRect(originalRect, position)
  const orientedTargetRect = orientRect(targetRect, position)
  const stripCount = Math.max(
    16,
    Math.min(
      GENIE_STRIP_COUNT,
      Math.ceil(
        Math.max(orientedOriginalRect.height, orientedTargetRect.height) / 4,
      ),
    ),
  )

  for (let index = 0; index < stripCount; index += 1) {
    const top = getBoundaryAtProgress(
      orientedOriginalRect,
      orientedTargetRect,
      index / stripCount,
      animationProgress,
    )
    const bottom = getBoundaryAtProgress(
      orientedOriginalRect,
      orientedTargetRect,
      (index + 1) / stripCount,
      animationProgress,
    )
    drawOrientedStrip({
      bottom,
      context,
      index,
      position,
      sourceCanvas,
      stripCount,
      top,
    })
  }
}

export function createGenieAnimation({
  direction,
  originalRect,
  ownerDocument,
  position,
  sourceCanvas,
  targetRect,
}: {
  direction: 'minimize' | 'restore'
  originalRect: GenieRect
  ownerDocument: Document
  position: DockPosition
  sourceCanvas: HTMLCanvasElement
  targetRect: GenieRect
}): GenieAnimationController | null {
  const overlay = setupOverlayCanvas(ownerDocument)
  if (!overlay)
    return null

  let animationFrameId: number | null = null
  let beforeFinish: GeniePlayOptions['beforeFinish']
  let cancelled = false
  let hasRunBeforeFinish = false
  let isDisposed = false
  let isFinishing = false
  let playPromise: Promise<void> | null = null
  let rejectPlay: ((reason?: unknown) => void) | null = null
  let resolvePlay: (() => void) | null = null

  const drawFinalFrame = (rect: GenieRect) => {
    if (!isRenderableRect(rect))
      return

    overlay.context.clearRect(0, 0, overlay.width, overlay.height)
    overlay.context.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
      rect.left,
      rect.top,
      rect.width,
      rect.height,
    )
  }

  const dispose = (error?: unknown) => {
    overlay.canvas.remove()
    isDisposed = true
    if (error !== undefined)
      rejectPlay?.(error)
    else
      resolvePlay?.()
    rejectPlay = null
    resolvePlay = null
  }

  const finish = (shouldRunBeforeFinish = true) => {
    if (isFinishing || isDisposed)
      return

    isFinishing = true
    if (animationFrameId !== null) {
      overlay.view.cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    void (async () => {
      try {
        if (shouldRunBeforeFinish && !hasRunBeforeFinish) {
          hasRunBeforeFinish = true
          await beforeFinish?.({ drawFinalFrame })
        }
        dispose()
      }
      catch (error) {
        dispose(error)
      }
    })()
  }

  const drawProgress = (progress: number) => {
    const animationProgress = direction === 'restore' ? 1 - progress : progress
    drawGenieFrame({
      animationProgress,
      context: overlay.context,
      originalRect,
      position,
      sourceCanvas,
      targetRect,
      viewportHeight: overlay.height,
      viewportWidth: overlay.width,
    })
  }

  drawProgress(0)

  return {
    cancel: () => {
      cancelled = true
      finish(false)
    },
    play: (options) => {
      if (playPromise)
        return playPromise

      if (isDisposed || isFinishing)
        return Promise.resolve()

      beforeFinish = options?.beforeFinish
      const startedAt = overlay.view.performance.now()

      playPromise = new Promise<void>((resolve, reject) => {
        resolvePlay = resolve
        rejectPlay = reject

        const tick = (now: number) => {
          animationFrameId = null
          if (cancelled) {
            finish(false)
            return
          }

          const rawProgress = clamp(
            (now - startedAt) / GENIE_ANIMATION_DURATION_MS,
            0,
            1,
          )
          drawProgress(rawProgress)

          if (rawProgress >= 1) {
            finish()
            return
          }

          animationFrameId = overlay.view.requestAnimationFrame(tick)
        }

        animationFrameId = overlay.view.requestAnimationFrame(tick)
      })

      return playPromise
    },
  }
}
