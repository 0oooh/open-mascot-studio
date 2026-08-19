import type { ComponentType } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { MascotDefinition } from 'open-mascot'

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

export const OpenMascot: ComponentType<OpenMascotProps>
export default OpenMascot
