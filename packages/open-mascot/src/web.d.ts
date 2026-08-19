import type { MascotDefinition, MascotScene } from './index.js'

export interface MascotController {
  element: SVGSVGElement
  play(animation: string, timestamp?: number): this
  setExpression(expression: string, timestamp?: number): this
  pause(timestamp?: number): this
  resume(timestamp?: number): this
  setDefinition(definition: MascotDefinition, timestamp?: number): this
  setLookTarget(target: { x: number; y: number }, timestamp?: number): this
  clearLookTarget(timestamp?: number): this
  getScene(): MascotScene
  getState(): MascotControllerState
  subscribe(listener: (state: MascotControllerState) => void): () => void
  exportSvg(): string
  destroy(): void
}

export interface MascotControllerState {
  animationKey: string
  playing: boolean
  elapsedMs: number
  stepIndex: number
  phase: 'hold' | 'transition'
  done: boolean
  staticExpression: string | null
}

export function renderSceneToSvgString(scene: MascotScene, options?: { label?: string }): string
export function createMascot(target: string | Element, options?: {
  definition?: MascotDefinition
  animation?: string
  autoplay?: boolean
  reducedMotion?: boolean
  onComplete?: (animation: string) => void
}): MascotController
