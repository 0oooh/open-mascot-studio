export type BuiltInBlobShape = 'circle' | 'oval' | 'capsule' | 'bean' | 'drop' | 'rounded-square'
export type BlobShape = BuiltInBlobShape | (string & {})

export interface EyePose {
  scaleX: number
  scaleY: number
  x: number
  y: number
  rotation: number
}

export interface MascotPose {
  blob: { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
  gaze: { x: number; y: number }
  eyes: { left: EyePose; right: EyePose }
}

export interface MascotDefinition {
  schema: 'open-mascot/definition'
  schemaVersion: 1
  name: string
  blob: { shape: BlobShape; width: number; height: number; color: string }
  face: { eyeColor: string; eyeWidth: number; eyeHeight: number; eyeGap: number; eyeY: number }
  stage: { color: string }
  expressions: Record<string, { label: string; pose: MascotPose }>
  animations: Record<string, {
    label: string
    playback: 'loop' | 'once'
    ambient: number
    blink: boolean
    steps: Array<{ expression: string; holdMs: number; transitionMs: number }>
  }>
}

export interface MascotScene {
  viewBox: string
  background: string
  transform: string
  shadow: { cx: number; cy: number; rx: number; ry: number; fill: string; opacity: number }
  blob: { path: string; fill: string }
  eyes: Array<{ cx: number; cy: number; rx: number; ry: number; rotation: number; fill: string }>
}

export const MASCOT_SCHEMA: 'open-mascot/definition'
export const MASCOT_SCHEMA_VERSION: 1
export const VIEWBOX: { width: 400; height: 400 }
export function createDefinition(options?: Partial<{ name: string; shape: BlobShape; width: number; height: number; color: string; eyeColor: string; stageColor: string }>): MascotDefinition
export function cloneDefinition(definition: MascotDefinition): MascotDefinition
export function createPose(options?: Record<string, unknown>): MascotPose
export function validateDefinition(definition: unknown): { ok: boolean; errors: string[] }
export function listBlobShapes(): string[]
export function hasBlobShape(name: string): boolean
export function registerBlobShape(name: string, builder: (blob: MascotDefinition['blob']) => string): () => boolean
export function createBlobPath(blob: MascotDefinition['blob']): string
export function interpolatePose(from: MascotPose, to: MascotPose, amount: number): MascotPose
export function getAnimationDuration(animation: MascotDefinition['animations'][string]): number
export function sampleAnimation(definition: MascotDefinition, animationKey: string, elapsedMs: number, options?: { reducedMotion?: boolean }): { pose: MascotPose; blink: number; done: boolean; duration: number; index: number; phase: string; animationKey: string }
export function sampleExpression(definition: MascotDefinition, expressionKey: string): MascotPose
export function buildScene(definition: MascotDefinition, pose: MascotPose): MascotScene
