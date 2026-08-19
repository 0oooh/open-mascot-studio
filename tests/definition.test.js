import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBlobPath,
  createDefinition,
  listBlobShapes,
  registerBlobShape,
  validateDefinition,
} from '../packages/open-mascot/src/index.js'

test('the default mascot is a valid circular blob', () => {
  const definition = createDefinition()
  assert.equal(definition.blob.shape, 'circle')
  assert.equal(definition.face.eyeShape, 'capsule')
  assert.equal(Object.keys(definition.expressions).length, 13)
  assert.equal(Object.keys(definition.animations).length, 11)
  assert.deepEqual(validateDefinition(definition), { ok: true, errors: [] })
})

test('capsule and oval eye styles are both valid definition choices', () => {
  for (const eyeShape of ['capsule', 'oval']) {
    const definition = createDefinition({ eyeShape })
    assert.equal(definition.face.eyeShape, eyeShape)
    assert.equal(validateDefinition(definition).ok, true)
  }
})

test('the complete expression and motion palettes are included', () => {
  const definition = createDefinition()
  assert.deepEqual(Object.keys(definition.expressions), [
    'neutral', 'attentive', 'curious', 'glance-up', 'gentle', 'skeptical',
    'joyful', 'playful', 'surprised', 'shy', 'sad', 'sleepy', 'proud',
  ])
  assert.deepEqual(Object.keys(definition.animations), [
    'idle', 'listening', 'thinking', 'happy', 'curious', 'surprised',
    'shy', 'sad', 'proud', 'celebrate', 'sleeping',
  ])
})

test('all built-in blob shapes create finite closed SVG paths', () => {
  assert.deepEqual(listBlobShapes(), [
    'circle',
    'oval',
    'capsule',
    'bean',
    'drop',
    'rounded-square',
  ])
  const paths = listBlobShapes().map(shape => {
    const definition = createDefinition({ shape })
    const path = createBlobPath(definition.blob)
    assert.match(path, /^M /)
    assert.match(path, / Z$/)
    assert.doesNotMatch(path, /NaN|Infinity/)
    return path
  })
  assert.equal(new Set(paths).size, paths.length)
})

test('custom blob shapes can be registered without changing the definition schema', () => {
  const unregister = registerBlobShape('diamond', ({ width, height }) =>
    `M 0 ${-height / 2} L ${width / 2} 0 L 0 ${height / 2} L ${-width / 2} 0 Z`,
  )
  const definition = createDefinition({ shape: 'diamond' })
  assert.equal(validateDefinition(definition).ok, true)
  assert.match(createBlobPath(definition.blob), /^M 0 -105/)
  assert.equal(unregister(), true)
  assert.equal(validateDefinition(definition).ok, false)
})

test('validation catches missing expression references', () => {
  const definition = createDefinition()
  definition.animations.idle.steps[0].expression = 'missing'
  const result = validateDefinition(definition)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /unknown expression/)
})

test('validation rejects incomplete poses before a renderer sees them', () => {
  const definition = createDefinition()
  delete definition.expressions.neutral.pose.eyes.right
  const result = validateDefinition(definition)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /invalid pose/)
})
