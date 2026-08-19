import { createDefinition, validateDefinition } from './definition.js'
import { hasExpressionMotion, interpolatePose, sampleAnimation, sampleExpression } from './motion.js'
import { buildScene, VIEWBOX } from './scene.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
let rendererCount = 0
const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const eyeMarkup = eye =>
  `<g transform="rotate(${eye.rotation} ${eye.cx} ${eye.cy})"><path d="${escapeXml(eye.path)}" fill="${escapeXml(eye.fill)}"/></g>`

export const renderSceneToSvgString = (scene, options = {}) => {
  const label = escapeXml(options.label ?? 'Animated mascot')
  const shadowId = 'open-mascot-shadow-blur'
  return [
    `<svg xmlns="${SVG_NS}" viewBox="${scene.viewBox}" role="img" aria-label="${label}">`,
    `<defs><filter id="${shadowId}" x="-30%" y="-180%" width="160%" height="460%"><feGaussianBlur stdDeviation="13"/></filter></defs>`,
    `<rect width="${VIEWBOX.width}" height="${VIEWBOX.height}" fill="${escapeXml(scene.background)}"/>`,
    `<ellipse cx="${scene.shadow.cx}" cy="${scene.shadow.cy}" rx="${scene.shadow.rx}" ry="${scene.shadow.ry}" fill="${scene.shadow.fill}" opacity="${scene.shadow.opacity}" filter="url(#${shadowId})"/>`,
    `<g transform="${scene.transform}">`,
    `<path d="${escapeXml(scene.blob.path)}" fill="${escapeXml(scene.blob.fill)}"/>`,
    ...scene.eyes.map(eyeMarkup),
    '</g>',
    '</svg>',
  ].join('')
}

const setAttributes = (element, attributes) => {
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value))
}

const createSvgRenderer = (document, definition, pose) => {
  rendererCount += 1
  const shadowId = `open-mascot-shadow-blur-${rendererCount}`
  const svg = document.createElementNS(SVG_NS, 'svg')
  const defs = document.createElementNS(SVG_NS, 'defs')
  const shadowFilter = document.createElementNS(SVG_NS, 'filter')
  const shadowBlur = document.createElementNS(SVG_NS, 'feGaussianBlur')
  const background = document.createElementNS(SVG_NS, 'rect')
  const shadow = document.createElementNS(SVG_NS, 'ellipse')
  const group = document.createElementNS(SVG_NS, 'g')
  const blob = document.createElementNS(SVG_NS, 'path')
  const eyeNodes = ['left', 'right'].map(() => {
    const eyeGroup = document.createElementNS(SVG_NS, 'g')
    const path = document.createElementNS(SVG_NS, 'path')
    eyeGroup.append(path)
    group.append(eyeGroup)
    return { group: eyeGroup, path }
  })

  setAttributes(svg, {
    viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`,
    role: 'img',
    'aria-label': definition.name,
    preserveAspectRatio: 'xMidYMid meet',
  })
  setAttributes(shadowFilter, {
    id: shadowId,
    x: '-30%',
    y: '-180%',
    width: '160%',
    height: '460%',
  })
  shadowBlur.setAttribute('stdDeviation', '13')
  shadowFilter.append(shadowBlur)
  defs.append(shadowFilter)
  shadow.setAttribute('filter', `url(#${shadowId})`)
  setAttributes(background, { x: 0, y: 0, width: VIEWBOX.width, height: VIEWBOX.height })
  group.prepend(blob)
  svg.append(defs, background, shadow, group)

  const update = (nextDefinition, nextPose) => {
    const scene = buildScene(nextDefinition, nextPose)
    background.setAttribute('fill', scene.background)
    setAttributes(shadow, scene.shadow)
    group.setAttribute('transform', scene.transform)
    setAttributes(blob, { d: scene.blob.path, fill: scene.blob.fill })
    scene.eyes.forEach((eye, index) => {
      eyeNodes[index].group.setAttribute('transform', `rotate(${eye.rotation} ${eye.cx} ${eye.cy})`)
      setAttributes(eyeNodes[index].path, {
        d: eye.path,
        fill: eye.fill,
      })
    })
    svg.setAttribute('aria-label', nextDefinition.name)
    return scene
  }

  update(definition, pose)
  return { svg, update }
}

const resolveHost = target => {
  if (typeof target === 'string') return globalThis.document?.querySelector(target)
  return target
}

export const createMascot = (target, options = {}) => {
  const host = resolveHost(target)
  if (!host) throw new Error('Mascot target was not found.')
  let definition = options.definition ?? createDefinition()
  const validation = validateDefinition(definition)
  if (!validation.ok) throw new Error(validation.errors.join('\n'))

  let animationKey = options.animation ?? Object.keys(definition.animations)[0]
  if (!definition.animations[animationKey]) throw new Error(`Unknown animation: ${animationKey}`)
  let staticExpression = null
  let playing = options.autoplay !== false
  let elapsedBeforeStart = 0
  let startedAt = globalThis.performance?.now?.() ?? Date.now()
  let bridge = null
  let frameId = 0
  let destroyed = false
  let latestScene
  let latestSample
  let lookTarget = { x: 0, y: 0 }
  let lookEyes = { x: 0, y: 0 }
  let lookBody = { x: 0, y: 0 }
  let lookFollowing = false
  let lookActive = false
  let lastLookFrame = startedAt
  const listeners = new Set()
  const reducedMotion = options.reducedMotion ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const requestFrame = globalThis.requestAnimationFrame?.bind(globalThis)
  const cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis)

  const initialPose = sampleAnimation(definition, animationKey, 0, { reducedMotion }).pose
  const renderer = createSvgRenderer(host.ownerDocument, definition, initialPose)
  host.replaceChildren(renderer.svg)
  latestScene = renderer.update(definition, initialPose)

  const applyLookTarget = (sourcePose, timestamp) => {
    const delta = Math.max(0, Math.min(64, timestamp - lastLookFrame))
    lastLookFrame = timestamp
    const eyeAmount = 1 - Math.exp(-delta / 72)
    const bodyAmount = 1 - Math.exp(-delta / 190)
    lookEyes.x += (lookTarget.x - lookEyes.x) * eyeAmount
    lookEyes.y += (lookTarget.y - lookEyes.y) * eyeAmount
    lookBody.x += (lookTarget.x - lookBody.x) * bodyAmount
    lookBody.y += (lookTarget.y - lookBody.y) * bodyAmount
    const remaining = Math.max(
      Math.abs(lookEyes.x - lookTarget.x),
      Math.abs(lookEyes.y - lookTarget.y),
      Math.abs(lookBody.x - lookTarget.x),
      Math.abs(lookBody.y - lookTarget.y),
    )
    lookActive = lookFollowing || remaining > 0.002
    const pose = JSON.parse(JSON.stringify(sourcePose))
    pose.gaze.x += lookEyes.x * 12
    pose.gaze.y += lookEyes.y * 9
    pose.blob.yaw += lookBody.x * 15
    pose.blob.pitch -= lookBody.y * 10
    pose.blob.roll += lookBody.x * lookBody.y * 2.2
    return pose
  }

  const render = timestamp => {
    const elapsedMs = playing ? elapsedBeforeStart + timestamp - startedAt : elapsedBeforeStart
    const expressionElapsedMs = staticExpression ? Math.max(0, timestamp - startedAt) : elapsedMs
    const sampled = staticExpression
      ? {
          pose: sampleExpression(definition, staticExpression, expressionElapsedMs, { reducedMotion }),
          done: true,
        }
      : sampleAnimation(definition, animationKey, elapsedMs, { reducedMotion })
    let pose = sampled.pose
    if (bridge) {
      const progress = bridge.durationMs ? (timestamp - bridge.startedAt) / bridge.durationMs : 1
      if (progress < 1) pose = interpolatePose(bridge.from, pose, progress, 'gentle')
      else bridge = null
    }
    pose = applyLookTarget(pose, timestamp)
    latestScene = renderer.update(definition, pose)
    if (!staticExpression && sampled.done && definition.animations[animationKey].playback === 'once') {
      playing = false
      elapsedBeforeStart = sampled.duration
      options.onComplete?.(animationKey)
    }
    latestSample = {
      ...sampled,
      pose,
      animationKey,
      elapsedMs,
      playing,
      staticExpression,
    }
    listeners.forEach(listener => listener({
      animationKey,
      playing,
      elapsedMs,
      stepIndex: sampled.index ?? 0,
      phase: sampled.phase ?? 'hold',
      done: Boolean(sampled.done),
      staticExpression,
    }))
    return latestSample
  }

  const tick = timestamp => {
    if (destroyed) return
    render(timestamp)
    const expressionMoving = !reducedMotion
      && staticExpression
      && hasExpressionMotion(definition.expressions[staticExpression])
    if ((playing || bridge || lookActive || expressionMoving) && requestFrame) frameId = requestFrame(tick)
  }

  const restartFrames = timestamp => {
    if (frameId && cancelFrame) cancelFrame(frameId)
    frameId = 0
    const expressionMoving = !reducedMotion
      && staticExpression
      && hasExpressionMotion(definition.expressions[staticExpression])
    if ((playing || bridge || lookActive || expressionMoving) && requestFrame) frameId = requestFrame(tick)
    else render(timestamp)
  }

  if (playing && requestFrame) frameId = requestFrame(tick)
  else render(startedAt)

  return {
    element: renderer.svg,
    play(nextAnimation, timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      if (!definition.animations[nextAnimation]) throw new Error(`Unknown animation: ${nextAnimation}`)
      const from = render(timestamp).pose
      animationKey = nextAnimation
      staticExpression = null
      elapsedBeforeStart = 0
      startedAt = timestamp
      playing = true
      bridge = reducedMotion ? null : { from, startedAt: timestamp, durationMs: 540 }
      restartFrames(timestamp)
      return this
    },
    setExpression(expressionKey, timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      if (!definition.expressions[expressionKey]) throw new Error(`Unknown expression: ${expressionKey}`)
      const from = render(timestamp).pose
      staticExpression = expressionKey
      playing = false
      elapsedBeforeStart = 0
      startedAt = timestamp
      bridge = reducedMotion ? null : { from, startedAt: timestamp, durationMs: 460 }
      restartFrames(timestamp)
      return this
    },
    pause(timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      if (!playing) return this
      elapsedBeforeStart += timestamp - startedAt
      playing = false
      restartFrames(timestamp)
      return this
    },
    resume(timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      if (playing || staticExpression) return this
      startedAt = timestamp
      playing = true
      restartFrames(timestamp)
      return this
    },
    setDefinition(nextDefinition, timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      const result = validateDefinition(nextDefinition)
      if (!result.ok) throw new Error(result.errors.join('\n'))
      const from = render(timestamp).pose
      definition = nextDefinition
      if (!definition.animations[animationKey]) animationKey = Object.keys(definition.animations)[0]
      staticExpression = null
      elapsedBeforeStart = 0
      startedAt = timestamp
      bridge = reducedMotion ? null : { from, startedAt: timestamp, durationMs: 420 }
      restartFrames(timestamp)
      return this
    },
    setLookTarget(target, timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      const x = Number.isFinite(target?.x) ? Math.max(-1, Math.min(1, target.x)) : 0
      const y = Number.isFinite(target?.y) ? Math.max(-1, Math.min(1, target.y)) : 0
      lookTarget = { x, y }
      lookFollowing = true
      lookActive = true
      restartFrames(timestamp)
      return this
    },
    clearLookTarget(timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      lookTarget = { x: 0, y: 0 }
      lookFollowing = false
      lookActive = true
      restartFrames(timestamp)
      return this
    },
    getScene() {
      return latestScene
    },
    getState() {
      return {
        animationKey,
        playing,
        elapsedMs: latestSample?.elapsedMs ?? 0,
        stepIndex: latestSample?.index ?? 0,
        phase: latestSample?.phase ?? 'hold',
        done: Boolean(latestSample?.done),
        staticExpression,
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    exportSvg() {
      return renderSceneToSvgString(latestScene, { label: definition.name })
    },
    destroy() {
      destroyed = true
      if (frameId && cancelFrame) cancelFrame(frameId)
      listeners.clear()
      renderer.svg.remove()
    },
  }
}
