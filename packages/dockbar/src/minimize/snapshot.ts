import { domToCanvas } from 'modern-screenshot'
import type {
  GenieRect,
  GenieSnapshot,
  GenieSnapshotCaptureOptions,
} from './types'

const SNAPSHOT_IGNORE_ATTRIBUTE = 'data-dock-snapshot-ignore'

interface InlineStyleSnapshot {
  priority: string
  value: string
}

function nextFrame(view: Window) {
  return new Promise<void>((resolve) => {
    view.requestAnimationFrame(() => resolve())
  })
}

export function rectFromDomRect(rect: Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>): GenieRect {
  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  }
}

export function isRenderableRect(rect: GenieRect) {
  return Number.isFinite(rect.left)
    && Number.isFinite(rect.top)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.width > 0
    && rect.height > 0
}

export function areGenieRectsEqual(previous: GenieRect, next: GenieRect) {
  return Math.round(previous.left) === Math.round(next.left)
    && Math.round(previous.top) === Math.round(next.top)
    && Math.round(previous.width) === Math.round(next.width)
    && Math.round(previous.height) === Math.round(next.height)
}

export function isSnapshotSizeCompatible(snapshot: GenieSnapshot, rect: GenieRect) {
  return Math.round(snapshot.contentRect.width) === Math.round(rect.width)
    && Math.round(snapshot.contentRect.height) === Math.round(rect.height)
}

function splitCssCommaList(value: string) {
  const parts: string[] = []
  let depth = 0
  let start = 0

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character === '(') {
      depth += 1
      continue
    }

    if (character === ')') {
      depth = Math.max(0, depth - 1)
      continue
    }

    if (character !== ',' || depth > 0)
      continue

    const part = value.slice(start, index).trim()
    if (part)
      parts.push(part)
    start = index + 1
  }

  const finalPart = value.slice(start).trim()
  if (finalPart)
    parts.push(finalPart)

  return parts
}

function getInsetOnlyBoxShadow(value: string) {
  if (!value || value === 'none')
    return 'none'

  const insetLayers = splitCssCommaList(value).filter(layer =>
    /(?:^|\s)inset(?:\s|$)/i.test(layer),
  )
  return insetLayers.length ? insetLayers.join(', ') : 'none'
}

function removeSnapshotRootOuterShadow(cloned: HTMLElement) {
  const boxShadow = cloned.style.getPropertyValue('box-shadow') || cloned.style.boxShadow
  cloned.style.setProperty('box-shadow', getInsetOnlyBoxShadow(boxShadow), 'important')
}

function shouldIncludeSnapshotNode(node: Node) {
  if (node.nodeType !== 1)
    return true

  return !(node as Element).hasAttribute(SNAPSHOT_IGNORE_ATTRIBUTE)
}

export function readGenieScrollStateKey(node: HTMLElement) {
  const parts: string[] = []
  const nodes = [
    node,
    ...Array.from(node.querySelectorAll<HTMLElement>('*')),
  ]

  nodes.forEach((scrollNode, index) => {
    const left = Math.round(scrollNode.scrollLeft)
    const top = Math.round(scrollNode.scrollTop)
    if (!left && !top)
      return

    parts.push(`${index}:${left}:${top}`)
  })

  return parts.join('|')
}

export async function captureGenieSnapshot(
  node: HTMLElement,
  options?: GenieSnapshotCaptureOptions,
): Promise<GenieSnapshot | null> {
  const view = node.ownerDocument.defaultView
  if (!view)
    return null

  const contentRect = rectFromDomRect(node.getBoundingClientRect())
  if (!isRenderableRect(contentRect))
    return null

  await nextFrame(view)

  const captureWidth = Math.max(1, Math.round(contentRect.width))
  const captureHeight = Math.max(1, Math.round(contentRect.height))
  const rootCloneStyle = {
    boxShadow: 'none',
    contain: 'layout style',
    height: `${captureHeight}px`,
    transform: 'none',
    width: `${captureWidth}px`,
  }

  const canvas = await domToCanvas(node, {
    backgroundColor: null,
    filter: candidate =>
      shouldIncludeSnapshotNode(candidate)
      && (options?.filter ? options.filter(candidate) : true),
    features: {
      copyScrollbar: false,
      fixSvgXmlDecode: false,
      removeAbnormalAttributes: true,
      removeControlCharacter: true,
      restoreScrollPosition: true,
    },
    font: false,
    height: captureHeight,
    onCloneNode: (cloned) => {
      if (cloned.nodeType !== 1)
        return

      const clonedElement = cloned as HTMLElement
      for (const [property, value] of Object.entries(rootCloneStyle))
        clonedElement.style.setProperty(property, value, 'important')

      removeSnapshotRootOuterShadow(clonedElement)
      options?.onCloneNode?.(clonedElement)
    },
    scale: 1,
    style: {
      left: '0px',
      top: '0px',
      transform: 'none',
    },
    timeout: 600,
    width: captureWidth,
  })

  return {
    canvas,
    contentRect,
    rect: contentRect,
  }
}

export function createFallbackGenieSnapshot(node: HTMLElement): GenieSnapshot | null {
  const rect = rectFromDomRect(node.getBoundingClientRect())
  if (!isRenderableRect(rect))
    return null

  const canvas = node.ownerDocument.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context)
    return null

  canvas.width = Math.max(1, Math.round(rect.width))
  canvas.height = Math.max(1, Math.round(rect.height))

  const view = node.ownerDocument.defaultView
  const computedBackground = view?.getComputedStyle(node).backgroundColor
  context.fillStyle = computedBackground && computedBackground !== 'rgba(0, 0, 0, 0)'
    ? computedBackground
    : 'rgba(0, 0, 0, 0.88)'
  context.fillRect(0, 0, canvas.width, canvas.height)

  return {
    canvas,
    contentRect: rect,
    rect,
  }
}

function canvasToDataUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL('image/webp', 0.82)
}

export function createGenieSnapshotUrl(canvas: HTMLCanvasElement) {
  return new Promise<string>((resolve, reject) => {
    if (!canvas.toBlob) {
      try {
        resolve(canvasToDataUrl(canvas))
      }
      catch (error) {
        reject(error)
      }
      return
    }

    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            try {
              resolve(URL.createObjectURL(blob))
            }
            catch (error) {
              reject(error)
            }
            return
          }

          try {
            resolve(canvasToDataUrl(canvas))
          }
          catch (error) {
            reject(error)
          }
        },
        'image/webp',
        0.82,
      )
    }
    catch (error) {
      reject(error)
    }
  })
}

export function revokeGenieSnapshotUrl(url: string) {
  if (url.startsWith('blob:') && typeof URL.revokeObjectURL === 'function')
    URL.revokeObjectURL(url)
}

export function readInlineStyle(
  style: CSSStyleDeclaration,
  property: string,
): InlineStyleSnapshot {
  return {
    priority: style.getPropertyPriority(property),
    value: style.getPropertyValue(property),
  }
}

export function restoreInlineStyle(
  style: CSSStyleDeclaration,
  property: string,
  snapshot: InlineStyleSnapshot,
) {
  if (snapshot.value)
    style.setProperty(property, snapshot.value, snapshot.priority)
  else
    style.removeProperty(property)
}
