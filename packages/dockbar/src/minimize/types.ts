import type { DockMinimizeArea } from './dock-minimize-area'

export type DockPosition = 'top' | 'right' | 'bottom' | 'left'

export type DockWindowState
  = | 'idle'
    | 'minimizing'
    | 'minimized'
    | 'restoring'
    | 'disposed'

export type DockWindowOperation
  = | 'prepare'
    | 'minimize'
    | 'restore'
    | 'dispose'

export interface GenieRect {
  height: number
  left: number
  top: number
  width: number
}

export interface GenieSnapshot {
  canvas: HTMLCanvasElement
  contentRect: GenieRect
  rect: GenieRect
}

export interface GenieSnapshotCaptureOptions {
  filter?: (node: Node) => boolean
  onCloneNode?: (cloned: HTMLElement) => void
}

export type DockWindowSource = HTMLElement | (() => HTMLElement | null)

export interface DockWindowVisibilityContext {
  area: DockMinimizeArea
  handle: DockWindowHandle
  operation: DockWindowOperation
  source: HTMLElement
  state: DockWindowState
}

export interface DockWindowVisibilityAdapter {
  setHidden: (
    hidden: boolean,
    context: DockWindowVisibilityContext,
  ) => Promise<void> | void
}

export interface DockWindowOptions {
  capture?: GenieSnapshotCaptureOptions
  id: string
  label?: string
  source: DockWindowSource
  visibility?: DockWindowVisibilityAdapter
}

export interface DockWindowHandle {
  readonly id: string
  readonly label: string
  readonly state: DockWindowState

  cancelPrepare: () => void
  dispose: () => Promise<void>
  invalidatePreparedSnapshot: () => void
  minimize: () => Promise<void>
  prepare: () => Promise<void>
  restore: () => Promise<void>
}

export interface DockWindowStateChangeDetail {
  area: DockMinimizeArea
  handle: DockWindowHandle
  id: string
  previousState: DockWindowState
  state: DockWindowState
}

export interface DockWindowErrorDetail {
  area: DockMinimizeArea
  error: unknown
  handle: DockWindowHandle
  id: string
  operation: DockWindowOperation
}
