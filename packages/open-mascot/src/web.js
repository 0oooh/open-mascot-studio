import { createDefinition, validateDefinition } from './definition.js'
import { sampleAnimation, sampleExpression } from './motion.js'
import { buildScene, VIEWBOX } from './scene.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
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
  return [
    `<svg xmlns="${SVG_NS}" viewBox="${scene.viewBox}" role="img" aria-label="${label}">`,
    `<rect width="${VIEWBOX.width}" height="${VIEWBOX.height}" fill="${escapeXml(scene.background)}"/>`,
    `<ellipse cx="${scene.shadow.cx}" cy="${scene.shadow.cy}" rx="${scene.shadow.rx}" ry="${scene.shadow.ry}" fill="${scene.shadow.fill}" opacity="${scene.shadow.opacity}"/>`,
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
  const svg = document.createElementNS(SVG_NS, 'svg')
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
  setAttributes(background, { x: 0, y: 0, width: VIEWBOX.width, height: VIEWBOX.height })
  group.prepend(blob)
  svg.append(background, shadow, group)

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
  let frameId = 0
  let destroyed = false
  let latestScene
  const reducedMotion = options.reducedMotion ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const requestFrame = globalThis.requestAnimationFrame?.bind(globalThis)
  const cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis)

  const initialPose = sampleAnimation(definition, animationKey, 0, { reducedMotion }).pose
  const renderer = createSvgRenderer(host.ownerDocument, definition, initialPose)
  host.replaceChildren(renderer.svg)
  latestScene = renderer.update(definition, initialPose)

  const render = timestamp => {
    const elapsedMs = playing ? elapsedBeforeStart + timestamp - startedAt : elapsedBeforeStart
    const sampled = staticExpression
      ? { pose: sampleExpression(definition, staticExpression), done: true }
      : sampleAnimation(definition, animationKey, elapsedMs, { reducedMotion })
    latestScene = renderer.update(definition, sampled.pose)
    if (sampled.done && definition.animations[animationKey].playback === 'once') {
      playing = false
      elapsedBeforeStart = sampled.duration
      options.onComplete?.(animationKey)
    }
    return sampled
  }

  const tick = timestamp => {
    if (destroyed) return
    render(timestamp)
    if (playing && requestFrame) frameId = requestFrame(tick)
  }

  if (playing && requestFrame) frameId = requestFrame(tick)
  else render(startedAt)

  return {
    element: renderer.svg,
    play(nextAnimation, timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      if (!definition.animations[nextAnimation]) throw new Error(`Unknown animation: ${nextAnimation}`)
      if (frameId && cancelFrame) cancelFrame(frameId)
      animationKey = nextAnimation
      staticExpression = null
      elapsedBeforeStart = 0
      startedAt = timestamp
      playing = true
      if (requestFrame) frameId = requestFrame(tick)
      else render(timestamp)
      return this
    },
    setExpression(expressionKey, timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      if (!definition.expressions[expressionKey]) throw new Error(`Unknown expression: ${expressionKey}`)
      if (frameId && cancelFrame) cancelFrame(frameId)
      staticExpression = expressionKey
      playing = false
      elapsedBeforeStart = 0
      render(timestamp)
      return this
    },
    pause(timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      if (!playing) return this
      elapsedBeforeStart += timestamp - startedAt
      playing = false
      if (frameId && cancelFrame) cancelFrame(frameId)
      render(timestamp)
      return this
    },
    resume(timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      if (playing || staticExpression) return this
      startedAt = timestamp
      playing = true
      if (requestFrame) frameId = requestFrame(tick)
      else render(timestamp)
      return this
    },
    setDefinition(nextDefinition, timestamp = globalThis.performance?.now?.() ?? Date.now()) {
      const result = validateDefinition(nextDefinition)
      if (!result.ok) throw new Error(result.errors.join('\n'))
      definition = nextDefinition
      if (!definition.animations[animationKey]) animationKey = Object.keys(definition.animations)[0]
      staticExpression = null
      elapsedBeforeStart = 0
      startedAt = timestamp
      render(timestamp)
      return this
    },
    getScene() {
      return latestScene
    },
    exportSvg() {
      return renderSceneToSvgString(latestScene, { label: definition.name })
    },
    destroy() {
      destroyed = true
      if (frameId && cancelFrame) cancelFrame(frameId)
      renderer.svg.remove()
    },
  }
}
