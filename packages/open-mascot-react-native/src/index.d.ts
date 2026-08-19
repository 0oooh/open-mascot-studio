import type * as React from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { MascotDefinition, MascotScene } from 'open-mascot'

export interface OpenMascotProps {
  definition?: MascotDefinition
  animation?: string
  playing?: boolean
  reducedMotion?: boolean
  width?: number | string
  height?: number | string
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  onComplete?: (animation: string) => void
}

export interface NativeScenePrimitives {
  Svg: React.ElementType
  G: React.ElementType
  Path: React.ElementType
  Ellipse: React.ElementType
  Rect: React.ElementType
}

export interface NativeSceneProps {
  width?: number | string
  height?: number | string
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

export function renderNativeScene(
  react: typeof React,
  primitives: NativeScenePrimitives,
  scene: MascotScene,
  props?: NativeSceneProps,
): React.ReactElement

export const OpenMascot: React.ComponentType<OpenMascotProps>
export default OpenMascot
