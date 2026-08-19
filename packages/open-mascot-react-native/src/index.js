import * as React from 'react'
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg'
import {
  buildScene,
  createDefinition,
  getAnimationDuration,
  sampleAnimation,
} from 'open-mascot'
import { renderNativeScene } from './native-elements.js'

const fallbackDefinition = createDefinition()
const primitives = { Svg, G, Path, Ellipse, Rect }

export const OpenMascot = ({
  definition = fallbackDefinition,
  animation = 'idle',
  playing = true,
  reducedMotion = false,
  width = 240,
  height = 240,
  style,
  accessibilityLabel,
  onComplete,
}) => {
  const [elapsedMs, setElapsedMs] = React.useState(0)
  const elapsedRef = React.useRef(0)
  const completedRef = React.useRef(false)

  React.useEffect(() => {
    elapsedRef.current = 0
    completedRef.current = false
    setElapsedMs(0)
  }, [animation, definition, reducedMotion])

  React.useEffect(() => {
    if (!playing || reducedMotion) return undefined
    const animationDefinition = definition.animations[animation]
    if (!animationDefinition) return undefined
    const duration = getAnimationDuration(animationDefinition)
    const elapsedAtStart = elapsedRef.current
    let startedAt = null
    let frameId = 0

    const tick = timestamp => {
      if (startedAt === null) startedAt = timestamp
      const elapsed = elapsedAtStart + timestamp - startedAt
      if (animationDefinition.playback === 'once' && elapsed >= duration) {
        elapsedRef.current = duration
        setElapsedMs(duration)
        if (!completedRef.current) {
          completedRef.current = true
          onComplete?.(animation)
        }
        return
      }
      elapsedRef.current = elapsed
      setElapsedMs(elapsed)
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [animation, definition, onComplete, playing, reducedMotion])

  const sampled = sampleAnimation(definition, animation, elapsedMs, { reducedMotion })
  const scene = buildScene(definition, sampled.pose)
  return renderNativeScene(React, primitives, scene, {
    width,
    height,
    style,
    accessibilityLabel: accessibilityLabel ?? definition.name,
  })
}

export default OpenMascot
export { renderNativeScene } from './native-elements.js'
