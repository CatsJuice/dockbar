import { constants as fsConstants } from 'node:fs'
import { access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { chromium } from '@playwright/test'

const require = createRequire(import.meta.url)
const { version: playwrightVersion } = require('@playwright/test/package.json')

const CPU_THROTTLE = 4
const TIMING_RUNS = 5
const VIEWPORT = {
  height: 720,
  width: 1280,
}

const COUNT_KEYS = [
  'rectCalls',
  'scaleAttributeWrites',
  'scaleUpdateRequests',
  'itemUpdateCycles',
  'scaleAnimationBatches',
  'styleMutations',
]

const CDP_METRICS = {
  LayoutCount: 'layoutCount',
  LayoutDuration: 'layoutDurationMs',
  RecalcStyleCount: 'recalcStyleCount',
  RecalcStyleDuration: 'recalcStyleDurationMs',
  ScriptDuration: 'scriptDurationMs',
  TaskDuration: 'taskDurationMs',
}

const TIMING_COMPARISON_KEYS = [
  'inputDurationMs',
  'layoutCount',
  'layoutDurationMs',
  'recalcStyleCount',
  'recalcStyleDurationMs',
  'scriptDurationMs',
  'taskDurationMs',
  'frameP95Ms',
  'frameMaxMs',
  'slowFrameCount',
  'estimatedDroppedFrames',
  'longTaskCount',
  'longTaskDurationMs',
  'longAnimationFrameCount',
  'longAnimationFrameDurationMs',
  'longAnimationFrameBlockingDurationMs',
]

const SCENARIOS = [
  {
    direction: 'horizontal',
    events: 480,
    gap: 5,
    id: 'hover-20x-480@4ms',
    intervalMs: 4,
    items: 20,
    kind: 'hover',
    maxRange: 220,
    maxScale: 1.8,
    padding: 8,
    settleMs: 150,
    size: 36,
  },
  {
    direction: 'horizontal',
    events: 180,
    gap: 5,
    id: 'drag-12x-180@8ms',
    intervalMs: 8,
    items: 12,
    kind: 'drag',
    maxRange: 180,
    maxScale: 1.6,
    padding: 8,
    settleMs: 350,
    size: 42,
  },
]

function round(value, digits = 3) {
  if (!Number.isFinite(value))
    return null

  const factor = 10 ** digits
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}

function normalizeRecord(record) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      typeof value === 'number' ? round(value) : value,
    ]),
  )
}

function median(values) {
  if (!values.length)
    return null

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2)
    return sorted[middle]

  return (sorted[middle - 1] + sorted[middle]) / 2
}

function summarizeRuns(runs) {
  if (!runs.length)
    return {}

  const numericKeys = Object.keys(runs[0]).filter((key) => {
    return key !== 'iteration' && typeof runs[0][key] === 'number'
  })

  return normalizeRecord(Object.fromEntries(
    numericKeys.map(key => [
      key,
      median(runs.map(run => run[key])),
    ]),
  ))
}

function compareValue(baseline, candidate) {
  const improvementPct = baseline === 0
    ? candidate === 0 ? 0 : null
    : (1 - candidate / baseline) * 100

  return {
    baseline: round(baseline),
    candidate: round(candidate),
    delta: round(candidate - baseline),
    improvementPct: improvementPct == null ? null : round(improvementPct),
  }
}

function compareRecords(baseline, candidate, keys) {
  return Object.fromEntries(keys.map((key) => {
    return [key, compareValue(baseline[key] ?? 0, candidate[key] ?? 0)]
  }))
}

function createFixture(scenario) {
  const sortable = scenario.kind === 'drag' ? ' sortable' : ''
  const items = Array.from({ length: scenario.items }, (_, index) => {
    return `<dock-item data-benchmark-index="${index}"><div class="benchmark-item">${index + 1}</div></dock-item>`
  }).join('')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html,
      body {
        height: 100%;
        margin: 0;
        width: 100%;
      }
      body {
        align-items: center;
        display: flex;
        justify-content: center;
      }
      .benchmark-item {
        align-items: center;
        background: #ddd;
        display: flex;
        height: 100%;
        justify-content: center;
        width: 100%;
      }
    </style>
  </head>
  <body>
    <dock-wrapper
      id="dock"
      direction="${scenario.direction}"
      gap="${scenario.gap}"
      max-range="${scenario.maxRange}"
      max-scale="${scenario.maxScale}"
      padding="${scenario.padding}"
      size="${scenario.size}"${sortable}
    >
      ${items}
    </dock-wrapper>
  </body>
</html>`
}

async function installEarlyInstrumentation(page) {
  await page.evaluate(() => {
    const metrics = window.__dockPointerBenchmark = {
      itemUpdateCycles: 0,
      rectCalls: 0,
      scaleAnimationBatches: 0,
      scaleAttributeWrites: 0,
      scaleUpdateRequests: 0,
      styleMutations: 0,
    }

    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function (...args) {
      const tracked = this instanceof HTMLElement
        && (
          this.localName === 'dock-item'
          || this.localName === 'dock-separator'
          || this.localName === 'dock-wrapper'
          || this.hasAttribute('data-dock-placeholder')
        )

      if (tracked)
        metrics.rectCalls += 1

      return Reflect.apply(originalGetBoundingClientRect, this, args)
    }

    const originalSetAttribute = Element.prototype.setAttribute
    Element.prototype.setAttribute = function (name, value) {
      if (
        this instanceof HTMLElement
        && this.localName === 'dock-item'
        && name === 'scale'
      )
        metrics.scaleAttributeWrites += 1

      return Reflect.apply(originalSetAttribute, this, [name, value])
    }
  })
}

async function installPostUpgradeInstrumentation(page) {
  await page.evaluate(() => {
    const metrics = window.__dockPointerBenchmark
    const observers = []
    const observedShadowRoots = new WeakSet()
    const itemPrototype = customElements.get('dock-item')?.prototype

    if (!metrics || !itemPrototype)
      throw new Error('Dock item instrumentation could not be installed')

    const originalRequestUpdate = itemPrototype.requestUpdate
    if (typeof originalRequestUpdate === 'function') {
      itemPrototype.requestUpdate = function (name, ...args) {
        if (name === 'scale')
          metrics.scaleUpdateRequests += 1

        return Reflect.apply(originalRequestUpdate, this, [name, ...args])
      }
    }

    const originalPerformUpdate = itemPrototype.performUpdate
    if (typeof originalPerformUpdate === 'function') {
      itemPrototype.performUpdate = function (...args) {
        metrics.itemUpdateCycles += 1
        return Reflect.apply(originalPerformUpdate, this, args)
      }
    }

    const originalOnScaleChanged = itemPrototype.onScaleChanged
    if (typeof originalOnScaleChanged === 'function') {
      itemPrototype.onScaleChanged = function (...args) {
        metrics.scaleAnimationBatches += 1
        return Reflect.apply(originalOnScaleChanged, this, args)
      }
    }

    const observeShadowRoot = (item) => {
      const root = item.shadowRoot
      if (!root || observedShadowRoots.has(root))
        return

      observedShadowRoots.add(root)
      const observer = new MutationObserver((records) => {
        metrics.styleMutations += records.filter(record => record.type === 'attributes').length
      })
      observer.observe(root, {
        attributeFilter: ['style'],
        attributes: true,
        subtree: true,
      })
      observers.push(observer)
    }

    document.querySelectorAll('dock-item').forEach(observeShadowRoot)

    const lightDomObserver = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          metrics.styleMutations += 1
          continue
        }

        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element))
            return

          const items = node.localName === 'dock-item'
            ? [node]
            : [...node.querySelectorAll('dock-item')]
          queueMicrotask(() => items.forEach(observeShadowRoot))
        })
      }
    })
    lightDomObserver.observe(document.documentElement, {
      attributeFilter: ['style'],
      attributes: true,
      childList: true,
      subtree: true,
    })
    observers.push(lightDomObserver)
    window.__dockPointerBenchmarkObservers = observers
  })
}

async function resetInstrumentation(page) {
  await page.evaluate(() => {
    const metrics = window.__dockPointerBenchmark
    if (!metrics)
      throw new Error('Dock pointer benchmark counters are unavailable')

    Object.keys(metrics).forEach((key) => {
      metrics[key] = 0
    })
  })
}

async function setupPage(browser, bundlePath, scenario, instrument) {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: VIEWPORT,
  })

  try {
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Performance.enable')
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: CPU_THROTTLE,
    })

    await page.setContent(createFixture(scenario))
    if (instrument)
      await installEarlyInstrumentation(page)

    await page.addScriptTag({
      path: bundlePath,
      type: 'module',
    })
    await page.waitForFunction(() => {
      const dock = document.querySelector('#dock')
      const items = [...document.querySelectorAll('dock-item')]
      return Boolean(
        customElements.get('dock-item')
        && customElements.get('dock-wrapper')
        && dock?.shadowRoot
        && items.length
        && items.every(item => item.shadowRoot),
      )
    })

    await page.evaluate(async () => {
      await Promise.all(
        [...document.querySelectorAll('dock-item')].map(item => item.updateComplete),
      )
    })

    if (instrument)
      await installPostUpgradeInstrumentation(page)

    await page.waitForTimeout(200)
    if (instrument)
      await resetInstrumentation(page)

    return {
      cdp,
      context,
      page,
    }
  }
  catch (error) {
    await context.close()
    throw error
  }
}

async function calibrateRefreshRate(page) {
  const deltas = await page.evaluate(async () => {
    const samples = []
    let previous
    for (let index = 0; index < 61; index += 1) {
      const now = await new Promise(resolve => requestAnimationFrame(resolve))
      if (previous !== undefined)
        samples.push(now - previous)
      previous = now
    }
    return samples
  })

  return median(deltas)
}

async function getWorkloadBoxes(page, scenario) {
  const dockBox = await page.locator('#dock').boundingBox()
  if (!dockBox)
    throw new Error(`Missing dock bounds for ${scenario.id}`)

  if (scenario.kind === 'hover') {
    return {
      dockBox,
      firstItemBox: null,
    }
  }

  const firstItemBox = await page.locator('#dock dock-item').first().boundingBox()
  if (!firstItemBox)
    throw new Error(`Missing first dock item bounds for ${scenario.id}`)

  return {
    dockBox,
    firstItemBox,
  }
}

async function runWorkload(page, scenario, collectFrameTelemetry, refreshIntervalMs) {
  const boxes = await getWorkloadBoxes(page, scenario)

  return page.evaluate(async ({
    collectFrameTelemetry,
    dockBox,
    firstItemBox,
    refreshIntervalMs,
    scenario,
  }) => {
    const dock = document.querySelector('#dock')
    if (!dock)
      throw new Error('Missing benchmark dock')

    const frameDeltas = []
    const longAnimationFrames = []
    const longTasks = []
    const observers = []
    let frameSamplerRunning = collectFrameTelemetry
    let previousFrameTime
    let resolveFrameSamplerStopped
    const frameSamplerStopped = new Promise((resolve) => {
      resolveFrameSamplerStopped = resolve
    })

    const sampleFrame = (now) => {
      if (previousFrameTime !== undefined)
        frameDeltas.push(now - previousFrameTime)
      previousFrameTime = now

      if (frameSamplerRunning)
        requestAnimationFrame(sampleFrame)
      else
        resolveFrameSamplerStopped()
    }

    if (collectFrameTelemetry) {
      requestAnimationFrame(sampleFrame)

      if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        const observer = new PerformanceObserver((list) => {
          longTasks.push(...list.getEntries().map(entry => entry.duration))
        })
        observer.observe({ type: 'longtask' })
        observers.push(observer)
      }

      if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
        const observer = new PerformanceObserver((list) => {
          longAnimationFrames.push(...list.getEntries().map(entry => ({
            blockingDuration: entry.blockingDuration ?? 0,
            duration: entry.duration,
          })))
        })
        observer.observe({ type: 'long-animation-frame' })
        observers.push(observer)
      }
    }

    let inputDurationMs
    if (scenario.kind === 'hover') {
      const left = dockBox.x + 1
      const right = dockBox.x + dockBox.width - 1
      const clientY = dockBox.y + dockBox.height / 2
      const inputStart = performance.now()

      for (let index = 0; index < scenario.events; index += 1) {
        const progress = index / (scenario.events - 1)
        const triangle = progress <= 0.5
          ? progress * 2
          : (1 - progress) * 2
        const clientX = left + (right - left) * triangle

        dock.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true,
          clientX,
          clientY,
          composed: true,
        }))

        // Keep every move in its own task so Lit gets a microtask checkpoint
        // between input events, like a real high-frequency pointer stream.
        await new Promise(resolve => setTimeout(resolve, scenario.intervalMs))
      }

      inputDurationMs = performance.now() - inputStart
    }
    else {
      const firstItem = document.querySelector('#dock dock-item')
      if (!firstItem || !firstItemBox)
        throw new Error('Missing sortable benchmark item')

      const pointerId = 7
      const startX = firstItemBox.x + firstItemBox.width / 2
      const clientY = firstItemBox.y + firstItemBox.height / 2
      firstItem.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: startX,
        clientY,
        composed: true,
        pointerId,
      }))
      window.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        buttons: 1,
        clientX: startX + 8,
        clientY,
        composed: true,
        pointerId,
      }))

      const inputStart = performance.now()
      for (let index = 0; index < scenario.events; index += 1) {
        const progress = index / (scenario.events - 1)
        const triangle = progress <= 0.5
          ? progress * 2
          : (1 - progress) * 2
        const clientX = dockBox.x + 10 + (dockBox.width - 20) * triangle

        window.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          buttons: 1,
          clientX,
          clientY,
          composed: true,
          pointerId,
        }))
        await new Promise(resolve => setTimeout(resolve, scenario.intervalMs))
      }

      inputDurationMs = performance.now() - inputStart
      window.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        button: 0,
        clientX: startX,
        clientY,
        composed: true,
        pointerId,
      }))
    }

    await new Promise(resolve => setTimeout(resolve, scenario.settleMs))

    if (!collectFrameTelemetry) {
      return {
        inputDurationMs,
      }
    }

    frameSamplerRunning = false
    await frameSamplerStopped
    observers.forEach(observer => observer.disconnect())

    const sortedFrames = [...frameDeltas].sort((a, b) => a - b)
    const quantile = (ratio) => {
      if (!sortedFrames.length)
        return 0
      const index = Math.min(
        sortedFrames.length - 1,
        Math.floor(sortedFrames.length * ratio),
      )
      return sortedFrames[index]
    }
    const sum = values => values.reduce((total, value) => total + value, 0)
    const droppedFrames = frameDeltas.reduce((total, duration) => {
      return total + Math.max(0, Math.round(duration / refreshIntervalMs) - 1)
    }, 0)

    return {
      estimatedDroppedFrames: droppedFrames,
      frameCount: frameDeltas.length,
      frameMaxMs: sortedFrames.at(-1) ?? 0,
      frameMedianMs: quantile(0.5),
      frameP95Ms: quantile(0.95),
      inputDurationMs,
      longAnimationFrameBlockingDurationMs: sum(
        longAnimationFrames.map(frame => frame.blockingDuration),
      ),
      longAnimationFrameCount: longAnimationFrames.length,
      longAnimationFrameDurationMs: sum(
        longAnimationFrames.map(frame => frame.duration),
      ),
      longTaskCount: longTasks.length,
      longTaskDurationMs: sum(longTasks),
      refreshIntervalMs,
      slowFrameCount: frameDeltas.filter((duration) => {
        return duration > refreshIntervalMs * 1.5
      }).length,
    }
  }, {
    collectFrameTelemetry,
    dockBox: boxes.dockBox,
    firstItemBox: boxes.firstItemBox,
    refreshIntervalMs,
    scenario,
  })
}

function mapCdpMetrics(payload) {
  return new Map(payload.metrics.map(metric => [metric.name, metric.value]))
}

function diffCdpMetrics(beforePayload, afterPayload) {
  const before = mapCdpMetrics(beforePayload)
  const after = mapCdpMetrics(afterPayload)

  return Object.fromEntries(Object.entries(CDP_METRICS).map(([cdpName, outputName]) => {
    const delta = (after.get(cdpName) ?? 0) - (before.get(cdpName) ?? 0)
    const value = cdpName.endsWith('Duration') ? delta * 1000 : delta
    return [outputName, value]
  }))
}

async function runCountPass(browser, bundlePath, scenario) {
  const { context, page } = await setupPage(browser, bundlePath, scenario, true)
  try {
    await runWorkload(page, scenario, false, 0)
    const counts = await page.evaluate(() => ({
      ...window.__dockPointerBenchmark,
    }))
    return normalizeRecord(Object.fromEntries(
      COUNT_KEYS.map(key => [key, counts[key] ?? 0]),
    ))
  }
  finally {
    await context.close()
  }
}

async function runTimingPass(browser, bundlePath, scenario) {
  const { cdp, context, page } = await setupPage(
    browser,
    bundlePath,
    scenario,
    false,
  )

  try {
    const refreshIntervalMs = await calibrateRefreshRate(page)
    const before = await cdp.send('Performance.getMetrics')
    const workload = await runWorkload(
      page,
      scenario,
      true,
      refreshIntervalMs,
    )
    const after = await cdp.send('Performance.getMetrics')

    return normalizeRecord({
      ...workload,
      ...diffCdpMetrics(before, after),
    })
  }
  finally {
    await context.close()
  }
}

async function runCorrectnessChecks(browser, bundlePath) {
  const scenario = SCENARIOS.find(({ kind }) => kind === 'hover')
  const { context, page } = await setupPage(
    browser,
    bundlePath,
    scenario,
    false,
  )

  try {
    const { dockBox } = await getWorkloadBoxes(page, scenario)
    return await page.evaluate(async ({ dockBox }) => {
      const dock = document.querySelector('#dock')
      const items = [...document.querySelectorAll('dock-item')]
      if (!dock || !items.length)
        throw new Error('Missing correctness fixture')

      const clientY = dockBox.y + dockBox.height / 2
      const left = dockBox.x + 1
      const finalX = dockBox.x + dockBox.width * 0.76
      const readScales = () => items.map((item) => {
        return Number(item.scale ?? item.getAttribute('scale') ?? 1)
      })
      const move = (clientX) => {
        dock.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true,
          clientX,
          clientY,
          composed: true,
        }))
      }
      const leave = () => {
        dock.dispatchEvent(new MouseEvent('mouseleave', {
          composed: true,
        }))
      }
      const waitFrames = async (count) => {
        for (let index = 0; index < count; index += 1)
          await new Promise(resolve => requestAnimationFrame(resolve))
      }
      const waitForItemUpdates = async () => {
        await Promise.all(items.map(item => item.updateComplete))
      }
      const reset = async () => {
        leave()
        await waitFrames(2)
        await waitForItemUpdates()
        await new Promise(resolve => setTimeout(resolve, 160))
      }
      const maxDifference = (leftValues, rightValues) => {
        return Math.max(...leftValues.map((value, index) => {
          return Math.abs(value - rightValues[index])
        }))
      }

      await reset()
      move(left)
      move(finalX)
      await waitFrames(2)
      await waitForItemUpdates()
      const referenceScaleProfile = readScales()

      await reset()
      for (let index = 0; index < 50; index += 1) {
        const progress = index / 49
        move(left + (finalX - left) * progress)
      }
      await waitFrames(2)
      await waitForItemUpdates()
      const burstScaleProfile = readScales()
      const latestPointerMaxAbsDelta = maxDifference(
        referenceScaleProfile,
        burstScaleProfile,
      )

      await reset()
      for (let index = 0; index < 50; index += 1) {
        const progress = index / 49
        move(left + (finalX - left) * progress)
      }
      leave()
      await waitFrames(3)
      await waitForItemUpdates()
      const resetScales = readScales()
      const mouseleaveMaxScaleError = Math.max(
        ...resetScales.map(scale => Math.abs(scale - 1)),
      )

      return {
        burstScaleProfile,
        latestPointerMaxAbsDelta,
        latestPointerWins: latestPointerMaxAbsDelta <= 0.01,
        mouseleaveMaxScaleError,
        mouseleaveReset: mouseleaveMaxScaleError <= 0.000001,
        referenceScaleProfile,
      }
    }, {
      dockBox,
    })
  }
  finally {
    await context.close()
  }
}

async function validateBundlePath(environmentName) {
  const bundlePath = process.env[environmentName]
  if (!bundlePath)
    throw new Error(`${environmentName} must be set to an absolute ESM bundle path`)
  if (!path.isAbsolute(bundlePath))
    throw new Error(`${environmentName} must be absolute: ${bundlePath}`)

  await access(bundlePath, fsConstants.R_OK)
  return path.normalize(bundlePath)
}

async function main() {
  const bundles = {
    baseline: await validateBundlePath('DOCKBAR_BASELINE_BUNDLE'),
    candidate: await validateBundlePath('DOCKBAR_CANDIDATE_BUNDLE'),
  }
  const bundleMetadata = {
    baseline: {
      path: bundles.baseline,
      sha: process.env.DOCKBAR_BASELINE_SHA ?? null,
    },
    candidate: {
      path: bundles.candidate,
      sha: process.env.DOCKBAR_CANDIDATE_SHA ?? null,
    },
  }

  const browser = await chromium.launch({
    headless: true,
  })

  try {
    const scenarioReports = {}
    for (const [scenarioIndex, scenario] of SCENARIOS.entries()) {
      const counts = {}
      const countOrder = scenarioIndex % 2
        ? ['candidate', 'baseline']
        : ['baseline', 'candidate']
      for (const label of countOrder)
        counts[label] = await runCountPass(browser, bundles[label], scenario)

      const timingRuns = {
        baseline: [],
        candidate: [],
      }
      for (let iteration = 0; iteration < TIMING_RUNS; iteration += 1) {
        const order = iteration % 2
          ? ['candidate', 'baseline']
          : ['baseline', 'candidate']
        for (const label of order) {
          const run = await runTimingPass(browser, bundles[label], scenario)
          timingRuns[label].push({
            iteration: iteration + 1,
            ...run,
          })
        }
      }

      const baselineMedian = summarizeRuns(timingRuns.baseline)
      const candidateMedian = summarizeRuns(timingRuns.candidate)
      scenarioReports[scenario.id] = {
        baseline: {
          counts: counts.baseline,
          timing: {
            median: baselineMedian,
            runCount: TIMING_RUNS,
            runs: timingRuns.baseline,
          },
        },
        candidate: {
          counts: counts.candidate,
          timing: {
            median: candidateMedian,
            runCount: TIMING_RUNS,
            runs: timingRuns.candidate,
          },
        },
        comparison: {
          counts: compareRecords(
            counts.baseline,
            counts.candidate,
            COUNT_KEYS,
          ),
          timing: compareRecords(
            baselineMedian,
            candidateMedian,
            TIMING_COMPARISON_KEYS,
          ),
        },
        config: {
          cpuThrottle: CPU_THROTTLE,
          events: scenario.events,
          intervalMs: scenario.intervalMs,
          items: scenario.items,
          kind: scenario.kind,
          settleMs: scenario.settleMs,
        },
      }
    }

    const correctness = {
      baseline: await runCorrectnessChecks(browser, bundles.baseline),
      candidate: await runCorrectnessChecks(browser, bundles.candidate),
    }
    const baselineProfile = correctness.baseline.referenceScaleProfile
    const candidateProfile = correctness.candidate.referenceScaleProfile
    const baselineCandidateProfileMaxAbsDelta = Math.max(
      ...baselineProfile.map((value, index) => {
        return Math.abs(value - candidateProfile[index])
      }),
    )
    correctness.comparison = {
      baselineCandidateProfileMaxAbsDelta: round(
        baselineCandidateProfileMaxAbsDelta,
        6,
      ),
      scaleProfileMatches: baselineCandidateProfileMaxAbsDelta <= 0.01,
    }

    const report = {
      bundles: bundleMetadata,
      comparisonConvention: 'Positive improvementPct means the candidate used less work or time.',
      correctness,
      environment: {
        arch: process.arch,
        browserVersion: browser.version(),
        cpuThrottle: CPU_THROTTLE,
        headless: true,
        nodeVersion: process.version,
        platform: process.platform,
        playwrightVersion,
        serviceWorkers: 'blocked',
        timingRuns: TIMING_RUNS,
        viewport: VIEWPORT,
      },
      scenarios: scenarioReports,
      schemaVersion: 1,
    }

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`)
  process.exitCode = 1
})
