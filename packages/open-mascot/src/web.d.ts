import type { MascotDefinition, MascotScene } from './index.js'

export interface MascotController {
  element: SVGSVGElement
  play(animation: string): this
  setExpression(expression: string): this
  pause(): this
  resume(): this
  setDefinition(definition: MascotDefinition): this
  getScene(): MascotScene
  exportSvg(): string
  destroy(): void
}

export function renderSceneToSvgString(scene: MascotScene, options?: { label?: string }): string
export function createMascot(target: string | Element, options?: {
  definition?: MascotDefinition
  animation?: string
  autoplay?: boolean
  reducedMotion?: boolean
  onComplete?: (animation: string) => void
}): MascotController
