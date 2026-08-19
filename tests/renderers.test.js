import assert from 'node:assert/strict'
import test from 'node:test'
import { buildScene, createDefinition, sampleAnimation } from '../packages/open-mascot/src/index.js'
import { createMascot, renderSceneToSvgString } from '../packages/open-mascot/src/web.js'
import { renderNativeScene } from '../packages/open-mascot-react-native/src/native-elements.js'

const sceneFor = shape => {
  const definition = createDefinition({ shape })
  return buildScene(definition, sampleAnimation(definition, 'idle', 900).pose)
}

test('the browser renderer produces a complete standalone SVG', () => {
  const svg = renderSceneToSvgString(sceneFor('soft'), { label: 'Soft & friend' })
  assert.match(svg, /^<svg xmlns=/)
  assert.match(svg, /aria-label="Soft &amp; friend"/)
  assert.match(svg, /<path d="M /)
  assert.equal((svg.match(/<ellipse/g) ?? []).length, 1)
  assert.equal((svg.match(/<path/g) ?? []).length, 3)
  assert.match(svg, /<\/svg>$/)
})

test('cursor following leads with the eyes and settles back without editing the pose', () => {
  const callbacks = new Map()
  let nextFrame = 0
  const previousRequest = globalThis.requestAnimationFrame
  const previousCancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = callback => {
    const id = ++nextFrame
    callbacks.set(id, callback)
    return id
  }
  globalThis.cancelAnimationFrame = id => callbacks.delete(id)

  class SvgNode {
    constructor() { this.attributes = {}; this.children = [] }
    setAttribute(name, value) { this.attributes[name] = String(value) }
    append(...children) { this.children.push(...children) }
    prepend(...children) { this.children.unshift(...children) }
    remove() {}
  }

  const document = { createElementNS: () => new SvgNode() }
  const host = { ownerDocument: document, replaceChildren(...children) { this.children = children } }
  const runFrame = timestamp => {
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach(callback => callback(timestamp))
  }

  try {
    const definition = createDefinition()
    const mascot = createMascot(host, { definition, animation: 'idle', autoplay: false })
    mascot.setExpression('neutral', 0)
    runFrame(500)
    const baseline = mascot.getScene().eyes[0].cx
    mascot.setLookTarget({ x: 1, y: -0.6 }, 500)
    runFrame(580)
    runFrame(760)
    const followed = mascot.getScene().eyes[0].cx
    assert.ok(followed > baseline + 8)
    mascot.clearLookTarget(760)
    for (const timestamp of [920, 1180, 1520, 1980]) runFrame(timestamp)
    const returned = mascot.getScene().eyes[0].cx
    assert.ok(Math.abs(returned - baseline) < Math.abs(followed - baseline))
    mascot.destroy()
  } finally {
    globalThis.requestAnimationFrame = previousRequest
    globalThis.cancelAnimationFrame = previousCancel
  }
})

test('the React Native adapter renders the same scene through injected primitives', () => {
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props ?? {}, children }
    },
  }
  const primitives = {
    Svg: 'Svg',
    G: 'G',
    Path: 'Path',
    Ellipse: 'Ellipse',
    Rect: 'Rect',
  }
  const scene = sceneFor('drop')
  const tree = renderNativeScene(React, primitives, scene, {
    width: 320,
    height: 240,
    accessibilityLabel: 'Drop mascot',
  })
  assert.equal(tree.type, 'Svg')
  assert.equal(tree.props.width, 320)
  assert.equal(tree.props.accessibilityLabel, 'Drop mascot')
  assert.equal(tree.children[0].type, 'Rect')
  assert.equal(tree.children[2].type, 'G')
  assert.equal(tree.children[2].children[0].type, 'Path')
  assert.equal(tree.children[2].children[0].props.d, scene.blob.path)
})

test('the browser controller bridges smoothly when selecting an expression', () => {
  const callbacks = new Map()
  let nextFrame = 0
  const previousRequest = globalThis.requestAnimationFrame
  const previousCancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = callback => {
    const id = ++nextFrame
    callbacks.set(id, callback)
    return id
  }
  globalThis.cancelAnimationFrame = id => callbacks.delete(id)

  class SvgNode {
    constructor() {
      this.attributes = {}
      this.children = []
    }
    setAttribute(name, value) { this.attributes[name] = String(value) }
    append(...children) { this.children.push(...children) }
    prepend(...children) { this.children.unshift(...children) }
    remove() {}
  }

  const document = { createElementNS: () => new SvgNode() }
  const host = {
    ownerDocument: document,
    replaceChildren(...children) { this.children = children },
  }
  const runFrame = timestamp => {
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach(callback => callback(timestamp))
  }

  try {
    const definition = createDefinition()
    const mascot = createMascot(host, { definition, animation: 'idle' })
    runFrame(0)
    const before = mascot.getScene().eyes[0].path
    mascot.setExpression('side-eye', 0)
    runFrame(230)
    const during = mascot.getScene().eyes[0].path
    runFrame(461)
    const after = mascot.getScene().eyes[0].path
    assert.notEqual(during, before)
    assert.notEqual(during, after)
    assert.equal(mascot.getState().staticExpression, 'side-eye')
    mascot.destroy()
  } finally {
    globalThis.requestAnimationFrame = previousRequest
    globalThis.cancelAnimationFrame = previousCancel
  }
})

test('a static trembling expression keeps rendering after its entrance bridge', () => {
  const callbacks = new Map()
  let nextFrame = 0
  const previousRequest = globalThis.requestAnimationFrame
  const previousCancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = callback => {
    const id = ++nextFrame
    callbacks.set(id, callback)
    return id
  }
  globalThis.cancelAnimationFrame = id => callbacks.delete(id)

  class SvgNode {
    constructor() { this.attributes = {}; this.children = [] }
    setAttribute(name, value) { this.attributes[name] = String(value) }
    append(...children) { this.children.push(...children) }
    prepend(...children) { this.children.unshift(...children) }
    remove() {}
  }

  const document = { createElementNS: () => new SvgNode() }
  const host = { ownerDocument: document, replaceChildren(...children) { this.children = children } }
  const runFrame = timestamp => {
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach(callback => callback(timestamp))
  }

  try {
    const mascot = createMascot(host, { definition: createDefinition(), autoplay: false })
    mascot.setExpression('angry', 0)
    runFrame(500)
    const first = mascot.getScene().blob.path
    runFrame(620)
    const next = mascot.getScene().blob.path
    assert.notEqual(first, next)
    assert.ok(callbacks.size > 0)
    mascot.destroy()
  } finally {
    globalThis.requestAnimationFrame = previousRequest
    globalThis.cancelAnimationFrame = previousCancel
  }
})
