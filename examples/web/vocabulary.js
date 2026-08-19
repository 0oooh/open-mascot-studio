export const EXPRESSION_KEY_MIGRATIONS = {
  attentive: { key: 'focused', label: 'Focused', previousLabel: 'Attentive' },
  'glance-up': { key: 'skyward', label: 'Skyward', previousLabel: 'Glance up' },
  gentle: { key: 'soft-gaze', label: 'Soft gaze', previousLabel: 'Gentle' },
  skeptical: { key: 'side-eye', label: 'Side-eye', previousLabel: 'Skeptical' },
  joyful: { key: 'beaming', label: 'Beaming', previousLabel: 'Joyful' },
  playful: { key: 'cheeky', label: 'Cheeky', previousLabel: 'Playful' },
  proud: { key: 'confident', label: 'Confident', previousLabel: 'Proud' },
}

export const ANIMATION_KEY_MIGRATIONS = {
  proud: { key: 'stand-tall', label: 'Stand tall', previousLabel: 'Proud' },
  celebrate: { key: 'victory-bounce', label: 'Victory bounce', previousLabel: 'Celebrate' },
}

const migrateRecordKeys = (record, migrations) => {
  const source = record ?? {}
  return Object.fromEntries(Object.entries(source).map(([key, value]) => {
    const migration = migrations[key]
    if (!migration || source[migration.key]) return [key, value]
    if (value.label === migration.previousLabel) value.label = migration.label
    return [migration.key, value]
  }))
}

export const migrateStarterVocabulary = target => {
  target.expressions = migrateRecordKeys(target.expressions, EXPRESSION_KEY_MIGRATIONS)
  for (const animation of Object.values(target.animations ?? {})) {
    for (const step of animation.steps ?? []) {
      const migration = EXPRESSION_KEY_MIGRATIONS[step.expression]
      if (migration && !target.expressions[step.expression] && target.expressions[migration.key]) {
        step.expression = migration.key
      }
    }
  }
  target.animations = migrateRecordKeys(target.animations, ANIMATION_KEY_MIGRATIONS)
  return target
}
