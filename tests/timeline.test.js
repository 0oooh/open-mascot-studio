import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefinition } from '../packages/open-mascot/src/index.js'
import { compileDraftTimeline } from '../examples/web/timeline.js'

test('draft timeline keeps expressions as beats and expands grouped motions', () => {
  const definition = createDefinition()
  const items = [
    { id: 'expression-item', type: 'expression', key: 'angry' },
    { id: 'motion-item', type: 'motion', key: 'happy' },
  ]
  const compiled = compileDraftTimeline(definition, items)

  assert.equal(compiled.animation.playback, 'loop')
  assert.equal(compiled.animation.steps.length, 1 + definition.animations.happy.steps.length)
  assert.equal(compiled.animation.steps[0].expression, 'angry')
  assert.deepEqual(compiled.stepOwners, [
    'expression-item',
    ...definition.animations.happy.steps.map(() => 'motion-item'),
  ])
})

test('saved draft data is detached from source motions and ignores missing items', () => {
  const definition = createDefinition()
  const compiled = compileDraftTimeline(definition, [
    { id: 'missing', type: 'motion', key: 'missing' },
    { id: 'motion-item', type: 'motion', key: 'idle' },
  ], { loop: false, label: 'My motion' })

  compiled.animation.steps[0].holdMs = 1
  assert.notEqual(definition.animations.idle.steps[0].holdMs, 1)
  assert.equal(compiled.animation.playback, 'once')
  assert.equal(compiled.animation.label, 'My motion')
})
