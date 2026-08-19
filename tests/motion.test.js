import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildScene,
  createDefinition,
  getAnimationDuration,
  listBlobShapes,
  sampleAnimation,
} from '../packages/open-mascot/src/index.js'

test('looping motion samples continuously for every blob shape', () => {
  for (const shape of listBlobShapes()) {
    const definition = createDefinition({ shape })
    const duration = getAnimationDuration(definition.animations.idle)
    const atStart = sampleAnimation(definition, 'idle', 0, { reducedMotion: true })
    const afterLoop = sampleAnimation(definition, 'idle', duration, { reducedMotion: true })
    assert.equal(atStart.done, false)
    assert.equal(afterLoop.done, false)
    assert.deepEqual(afterLoop.pose, atStart.pose)
  }
})

test('blob motion changes transforms without mutating the selected silhouette', () => {
  for (const shape of listBlobShapes()) {
    const definition = createDefinition({ shape })
    const first = buildScene(definition, sampleAnimation(definition, 'idle', 0).pose)
    const later = buildScene(definition, sampleAnimation(definition, 'idle', 1250).pose)
    assert.equal(first.blob.path, later.blob.path)
    assert.notEqual(first.transform, later.transform)
    for (const eye of later.eyes) {
      assert.equal(Number.isFinite(eye.cx), true)
      assert.equal(Number.isFinite(eye.ry), true)
      assert.ok(eye.ry > 0)
    }
  }
})

test('play-once motion settles at the final expression', () => {
  const definition = createDefinition()
  const duration = getAnimationDuration(definition.animations.hello)
  const sampled = sampleAnimation(definition, 'hello', duration + 1000, { reducedMotion: true })
  assert.equal(sampled.done, true)
  assert.deepEqual(sampled.pose, definition.expressions.neutral.pose)
})
