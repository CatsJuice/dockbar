import { isClient } from '@vueuse/shared'
import { type Ref, isRef, watch } from 'vue'

export interface SwingUpOptions {
  target: HTMLElement | Ref<HTMLElement | undefined>
  distance?: number
  speed?: number
  diffusion?: number
  xRange?: number
  yRange?: number
  once?: boolean
  startScale?: number
  middleScale?: number
  endScale?: number
  onEnd?: () => void
}

const defaultOptions: Omit<SwingUpOptions, 'target'> = {
  distance: 80,
  speed: 40,
  diffusion: 2,
  xRange: 10,
  yRange: 10,
  startScale: 0.5,
  middleScale: 1,
  endScale: 0.3,
}

export function swingUp(_options: SwingUpOptions) {
  const options = Object.assign({}, defaultOptions, _options)
  const target = _options.target

  if (!isClient || !target)
    return () => {}

  let startTime = Date.now()
  let ready = false
  let stopped = false
  let animationFrame: number | undefined
  let stopWatching: (() => void) | undefined

  function cancel() {
    if (stopped)
      return

    stopped = true
    stopWatching?.()
    stopWatching = undefined

    if (animationFrame !== undefined) {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = undefined
    }
  }

  function queueFrame() {
    if (!stopped && animationFrame === undefined)
      animationFrame = window.requestAnimationFrame(frame)
  }

  function getEl() {
    return isRef(options.target) ? options.target.value : options.target
  }
  function init(el: HTMLElement) {
    if (ready)
      return
    ready = true
    el.style.setProperty(
      'transform',
      [
        'translateX(var(--translate-x))',
        'translateY(var(--translate-y))',
        'rotate(var(--rotate))',
        'scale(var(--scale))',
      ].join(' '),
    )
  }

  function frame() {
    animationFrame = undefined

    if (stopped)
      return

    const {
      distance = defaultOptions.distance!,
      speed = defaultOptions.speed!,
      diffusion = defaultOptions.diffusion!,
      xRange = defaultOptions.xRange!,
      yRange = defaultOptions.yRange!,
      startScale = defaultOptions.startScale!,
      middleScale = defaultOptions.middleScale!,
      endScale = defaultOptions.endScale!,
      once,
    } = options
    const now = Date.now()
    const elapsed = now - startTime
    const el = getEl()
    if (!el) {
      cancel()
      return
    }

    const elapsedSeconds = elapsed / 1000
    const totalTimeSeconds = distance / speed
    init(el)

    const process = elapsedSeconds / totalTimeSeconds

    if (elapsedSeconds < totalTimeSeconds) {
      const opacity = 0.8 - Math.abs(process - 0.5) * 2
      const offsetX = Math.sin(elapsedSeconds * speed / yRange) * xRange * (diffusion * elapsedSeconds)
      const offsetY = elapsedSeconds * speed
      const scale = process < 0.5
        ? startScale + (middleScale - startScale) * process * 2
        : middleScale + (endScale - middleScale) * (process - 0.5) * 2
      el.style.setProperty('--translate-x', `${offsetX}px`)
      el.style.setProperty('--translate-y', `${-offsetY}px`)
      el.style.setProperty('--rotate', `${offsetX * 0.1}deg`)
      el.style.setProperty('--scale', `${scale}`)
      el.style.setProperty('opacity', `${opacity}`)
    }
    else {
      el.style.setProperty('--translate-x', '0')
      el.style.setProperty('--translate-y', '0')
      el.style.setProperty('--rotate', '0')
      el.style.setProperty('--scale', '0')
      el.style.setProperty('opacity', '0')
      if (once) {
        stopped = true
        options.onEnd?.()
        return
      }
      startTime = Date.now()
    }

    queueFrame()
  }

  if (isRef(options.target)) {
    let started = false
    stopWatching = watch(options.target, (el) => {
      if (!el || started || stopped)
        return

      started = true
      startTime = Date.now()
      queueFrame()
      stopWatching?.()
      stopWatching = undefined
    }, { immediate: true })

    if (started) {
      stopWatching()
      stopWatching = undefined
    }
  }
  else {
    queueFrame()
  }

  return cancel
}
