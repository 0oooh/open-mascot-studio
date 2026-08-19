const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value))

const smooth = value => {
  const t = clamp(value)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

const interpolateValue = (from, to, amount) => {
  if (typeof from === 'number' && typeof to === 'number') return from + (to - from) * amount
  if (from && to && typeof from === 'object' && typeof to === 'object') {
    return Object.fromEntries(
      Object.keys(from).map(key => [key, interpolateValue(from[key], to[key], amount)]),
    )
  }
  return amount < 1 ? from : to
}

export const interpolatePose = (from, to, amount) =>
  interpolateValue(from, to, smooth(amount))

export const getAnimationDuration = animation =>
  animation.steps.reduce((total, step, index) => {
    const hasTransition = animation.playback === 'loop' || index < animation.steps.length - 1
    return total + step.holdMs + (hasTransition ? step.transitionMs : 0)
  }, 0)

const locateStep = (animation, elapsedMs) => {
  const duration = getAnimationDuration(animation)
  const done = animation.playback === 'once' && elapsedMs >= duration
  const local = animation.playback === 'loop' && duration > 0
    ? ((elapsedMs % duration) + duration) % duration
    : clamp(elapsedMs, 0, duration)
  let cursor = 0

  for (let index = 0; index < animation.steps.length; index += 1) {
    const step = animation.steps[index]
    const hasTransition = animation.playback === 'loop' || index < animation.steps.length - 1
    const holdEnd = cursor + step.holdMs
    const transitionEnd = holdEnd + (hasTransition ? step.transitionMs : 0)
    if (local <= holdEnd || !hasTransition) return { index, phase: 'hold', progress: 0, done, duration }
    if (local <= transitionEnd) {
      return {
        index,
        phase: 'transition',
        progress: step.transitionMs ? (local - holdEnd) / step.transitionMs : 1,
        done,
        duration,
      }
    }
    cursor = transitionEnd
  }
  return { index: animation.steps.length - 1, phase: 'hold', progress: 0, done, duration }
}

const blinkAmountAt = elapsedMs => {
  const cycle = ((elapsedMs + 900) % 4800 + 4800) % 4800
  if (cycle < 4450) return 0
  const progress = (cycle - 4450) / 350
  if (progress < 0.42) return smooth(progress / 0.42)
  return 1 - smooth((progress - 0.42) / 0.58)
}

const addAmbientMotion = (pose, elapsedMs, amount, blink) => {
  const next = JSON.parse(JSON.stringify(pose))
  const seconds = elapsedMs / 1000
  const strength = clamp(amount ?? 0)
  const breathing = Math.sin(seconds * 1.18)
  next.blob.y += Math.sin(seconds * 0.82 + 0.4) * 3.2 * strength
  next.blob.rotation += Math.sin(seconds * 0.47 + 1.2) * 1.3 * strength
  next.blob.scaleX *= 1 - breathing * 0.012 * strength
  next.blob.scaleY *= 1 + breathing * 0.016 * strength
  next.gaze.x += Math.sin(seconds * 0.31) * 0.45 * strength
  next.gaze.y += Math.sin(seconds * 0.27 + 1.8) * 0.3 * strength

  const blinkAmount = blink ? blinkAmountAt(elapsedMs) : 0
  next.eyes.left.scaleY *= Math.max(0.06, 1 - blinkAmount * 0.95)
  next.eyes.right.scaleY *= Math.max(0.06, 1 - blinkAmount * 0.95)
  return { pose: next, blink: blinkAmount }
}

export const sampleAnimation = (definition, animationKey, elapsedMs, options = {}) => {
  const animation = definition.animations[animationKey]
  if (!animation) throw new Error(`Unknown animation: ${animationKey}`)
  const location = locateStep(animation, Math.max(0, elapsedMs))
  const currentStep = animation.steps[location.index]
  const current = definition.expressions[currentStep.expression].pose
  let pose = current

  if (location.phase === 'transition') {
    const nextIndex = (location.index + 1) % animation.steps.length
    const nextStep = animation.steps[nextIndex]
    pose = interpolatePose(current, definition.expressions[nextStep.expression].pose, location.progress)
  }

  const layered = options.reducedMotion
    ? { pose: JSON.parse(JSON.stringify(pose)), blink: 0 }
    : addAmbientMotion(pose, elapsedMs, animation.ambient, animation.blink)
  return { ...location, ...layered, animationKey }
}

export const sampleExpression = (definition, expressionKey) => {
  const expression = definition.expressions[expressionKey]
  if (!expression) throw new Error(`Unknown expression: ${expressionKey}`)
  return JSON.parse(JSON.stringify(expression.pose))
}
