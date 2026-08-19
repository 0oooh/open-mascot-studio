import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildScene,
  createDefinition,
  getAnimationDuration,
  listBlobShapes,
  sampleAnimation,
  sampleExpression,
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

test('the spatial motion deforms every proportion preset', () => {
  for (const shape of listBlobShapes()) {
    const definition = createDefinition({ shape })
    const first = buildScene(definition, sampleAnimation(definition, 'idle', 0).pose)
    const later = buildScene(definition, sampleAnimation(definition, 'idle', 1250).pose)
    assert.notEqual(first.blob.path, later.blob.path)
    assert.doesNotMatch(later.blob.path, /NaN|Infinity/)
    for (const eye of later.eyes) {
      assert.equal(Number.isFinite(eye.cx), true)
      assert.equal(Number.isFinite(eye.ry), true)
      assert.ok(eye.ry > 0)
    }
  }
})

test('projected 3D and rigged 2D use distinct versions of the same pose', () => {
  const projected = createDefinition({ renderMode: 'projected-3d' })
  const rigged = createDefinition({ renderMode: 'rigged-2d' })
  const pose = projected.expressions.confident.pose
  const projectedScene = buildScene(projected, pose)
  const riggedScene = buildScene(rigged, pose)
  assert.notEqual(projectedScene.blob.path, riggedScene.blob.path)
  assert.notEqual(projectedScene.eyes[0].path, riggedScene.eyes[0].path)
  assert.equal('tentacles' in projectedScene, false)
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

test('angry body tremble is continuous and never mutates its saved pose', () => {
  const definition = createDefinition()
  const saved = structuredClone(definition.expressions.angry.pose)
  const first = sampleExpression(definition, 'angry', 110)
  const next = sampleExpression(definition, 'angry', 190)

  assert.notDeepEqual(first.blob, next.blob)
  assert.deepEqual(first.gaze, saved.gaze)
  assert.deepEqual(definition.expressions.angry.pose, saved)
})

test('uneasy eye tremble layers over a slower body drift', () => {
  const definition = createDefinition()
  const saved = definition.expressions.uneasy.pose
  const sampled = sampleExpression(definition, 'uneasy', 420)

  assert.notDeepEqual(sampled.blob, saved.blob)
  assert.notDeepEqual(sampled.gaze, saved.gaze)
  assert.deepEqual(
    sampleExpression(definition, 'uneasy', 420, { reducedMotion: true }),
    saved,
  )
})

test('boing motion alternates between a compressed landing and a stretched rebound', () => {
  const definition = createDefinition()
  definition.expressions.beaming.motion.body = 'boing'
  const compressed = sampleExpression(definition, 'beaming', 200)
  const stretched = sampleExpression(definition, 'beaming', 600)

  assert.ok(compressed.blob.squash > definition.expressions.beaming.pose.blob.squash)
  assert.ok(stretched.blob.squash < definition.expressions.beaming.pose.blob.squash)
  assert.ok(compressed.blob.lift > stretched.blob.lift)
  assert.deepEqual(
    sampleExpression(definition, 'beaming', 200, { reducedMotion: true }),
    definition.expressions.beaming.pose,
  )
})
