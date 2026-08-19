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
  const duration = getAnimationDuration(definition.animations.surprised)
  const sampled = sampleAnimation(definition, 'surprised', duration + 1000, { reducedMotion: true })
  assert.equal(sampled.done, true)
  assert.deepEqual(sampled.pose, definition.expressions.curious.pose)
})

test('eye style changes geometry without changing the shared pose', () => {
  const capsule = createDefinition({ eyeShape: 'capsule' })
  const oval = createDefinition({ eyeShape: 'oval' })
  const pose = sampleAnimation(capsule, 'idle', 0, { reducedMotion: true }).pose
  const capsuleScene = buildScene(capsule, pose)
  const ovalScene = buildScene(oval, pose)
  assert.equal(capsuleScene.eyes[0].shape, 'capsule')
  assert.equal(ovalScene.eyes[0].shape, 'oval')
  assert.notEqual(capsuleScene.eyes[0].path, ovalScene.eyes[0].path)
})
