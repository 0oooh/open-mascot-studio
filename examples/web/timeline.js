const clone = value => JSON.parse(JSON.stringify(value))

export const compileDraftTimeline = (definition, items, options = {}) => {
  const steps = []
  const stepOwners = []

  for (const item of items) {
    if (item.type === 'expression' && definition.expressions[item.key]) {
      steps.push({
        expression: item.key,
        holdMs: item.holdMs ?? 1800,
        transitionMs: item.transitionMs ?? 620,
        easing: item.easing ?? 'gentle',
      })
      stepOwners.push(item.id)
    }

    if (item.type === 'motion' && definition.animations[item.key]) {
      for (const step of definition.animations[item.key].steps) {
        steps.push(clone(step))
        stepOwners.push(item.id)
      }
    }
  }

  return {
    animation: {
      label: options.label ?? 'Draft motion',
      playback: options.loop === false ? 'once' : 'loop',
      ambient: options.ambient ?? 0.3,
      blink: options.blink ?? 'normal',
      steps,
    },
    stepOwners,
  }
}
