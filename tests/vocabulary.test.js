import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefinition, validateDefinition } from '../packages/open-mascot/src/index.js'
import { migrateStarterVocabulary } from '../examples/web/vocabulary.js'

const reverseRename = (record, migrations) => Object.fromEntries(
  Object.entries(record).map(([key, value]) => {
    const previous = Object.entries(migrations).find(([, next]) => next === key)?.[0]
    return [previous ?? key, value]
  }),
)

test('vocabulary migration preserves poses, animation links, and custom labels', () => {
  const current = createDefinition()
  const expressionRenames = {
    attentive: 'focused',
    'glance-up': 'skyward',
    gentle: 'soft-gaze',
    skeptical: 'side-eye',
    joyful: 'beaming',
    playful: 'cheeky',
    proud: 'confident',
  }
  const animationRenames = { proud: 'stand-tall', celebrate: 'victory-bounce' }
  const previous = structuredClone(current)
  previous.expressions = reverseRename(previous.expressions, expressionRenames)
  previous.animations = reverseRename(previous.animations, animationRenames)
  for (const animation of Object.values(previous.animations)) {
    for (const step of animation.steps) {
      const oldKey = Object.entries(expressionRenames).find(([, next]) => next === step.expression)?.[0]
      if (oldKey) step.expression = oldKey
    }
  }
  previous.expressions.attentive.label = 'My custom focus'
  previous.expressions.joyful.label = 'Joyful'
  previous.animations.celebrate.label = 'Celebrate'

  const migrated = migrateStarterVocabulary(previous)
  assert.equal(migrated.expressions.focused.label, 'My custom focus')
  assert.equal(migrated.expressions.beaming.label, 'Beaming')
  assert.equal(migrated.animations['victory-bounce'].label, 'Victory bounce')
  assert.deepEqual(migrated.expressions.focused.pose, current.expressions.focused.pose)
  assert.equal(migrated.animations['stand-tall'].steps[1].expression, 'confident')
  assert.equal(migrated.animations['victory-bounce'].steps[1].expression, 'beaming')
  assert.deepEqual(validateDefinition(migrated), { ok: true, errors: [] })
})
