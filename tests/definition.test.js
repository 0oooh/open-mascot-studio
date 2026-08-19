import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefinition,
  getBlobPreset,
  listBlobShapes,
  validateDefinition,
} from '../packages/open-mascot/src/index.js'

test('the default mascot keeps the original projected body proportions', () => {
  const definition = createDefinition()
  assert.equal(definition.schemaVersion, 2)
  assert.equal(definition.blob.shape, 'soft')
  assert.equal(definition.blob.renderMode, 'projected-3d')
  assert.deepEqual([definition.blob.width, definition.blob.height], [220, 270])
  assert.equal(definition.face.eyeShape, 'capsule')
  assert.equal(Object.keys(definition.expressions).length, 15)
  assert.equal(Object.keys(definition.animations).length, 11)
  assert.deepEqual(validateDefinition(definition), { ok: true, errors: [] })
})

test('every expression retains the complete spatial body pose', () => {
  const definition = createDefinition()
  for (const expression of Object.values(definition.expressions)) {
    assert.ok(['pitch', 'yaw', 'roll', 'squash', 'lift'].every(field =>
      Number.isFinite(expression.pose.blob[field]),
    ))
    assert.ok(['none', 'slow-drift', 'tremble', 'boing'].includes(expression.motion.body))
    assert.ok(['none', 'micro-saccades', 'tremble'].includes(expression.motion.eyes))
  }
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
    'neutral', 'focused', 'curious', 'skyward', 'soft-gaze', 'side-eye',
    'beaming', 'cheeky', 'surprised', 'shy', 'sad', 'sleepy', 'confident',
    'angry', 'uneasy',
  ])
  assert.deepEqual(Object.keys(definition.animations), [
    'idle', 'listening', 'thinking', 'happy', 'curious', 'surprised',
    'shy', 'sad', 'stand-tall', 'victory-bounce', 'sleeping',
  ])
})

test('distinctive starter names use the Open Mascot vocabulary', () => {
  const definition = createDefinition()
  for (const previousKey of [
    'attentive', 'glance-up', 'gentle', 'skeptical', 'joyful', 'playful', 'proud',
  ]) {
    assert.equal(definition.expressions[previousKey], undefined)
  }
  assert.equal(definition.animations.proud, undefined)
  assert.equal(definition.animations.celebrate, undefined)
})

test('blob presets only change width and height', () => {
  assert.deepEqual(listBlobShapes(), [
    'round',
    'soft',
    'tall',
    'wide',
    'compact',
    'large',
    'drop',
  ])
  for (const shape of listBlobShapes()) {
    const definition = createDefinition({ shape })
    const preset = getBlobPreset(shape)
    assert.deepEqual([definition.blob.width, definition.blob.height], [preset.width, preset.height])
    assert.equal(validateDefinition(definition).ok, true)
  }
})

test('projected 3D and rigged 2D are both valid renderer choices', () => {
  for (const renderMode of ['projected-3d', 'rigged-2d']) {
    const definition = createDefinition({ renderMode })
    assert.equal(definition.blob.renderMode, renderMode)
    assert.equal(validateDefinition(definition).ok, true)
  }
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

test('validation rejects unknown continuous expression motion modes', () => {
  const definition = createDefinition()
  definition.expressions.angry.motion.body = 'wobble'
  definition.expressions.uneasy.motion.eyes = 'dart'
  const result = validateDefinition(definition)
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /motion\.body has an unknown mode/)
  assert.match(result.errors.join(' '), /motion\.eyes has an unknown mode/)
})
