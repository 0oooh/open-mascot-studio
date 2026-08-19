import { hasBlobShape } from './shapes.js'

export const MASCOT_SCHEMA = 'open-mascot/definition'
export const MASCOT_SCHEMA_VERSION = 1

const clone = value => JSON.parse(JSON.stringify(value))
const eyePose = (scaleX = 1, scaleY = 1, x = 0, y = 0, rotation = 0) => ({
  scaleX,
  scaleY,
  x,
  y,
  rotation,
})

export const createPose = ({
  x = 0,
  y = 0,
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
  gazeX = 0,
  gazeY = 0,
  leftEye = eyePose(),
  rightEye = eyePose(),
} = {}) => ({
  blob: { x, y, rotation, scaleX, scaleY },
  gaze: { x: gazeX, y: gazeY },
  eyes: { left: leftEye, right: rightEye },
})

const shapeDimensions = {
  circle: [210, 210],
  oval: [238, 184],
  capsule: [176, 236],
  bean: [224, 204],
  drop: [202, 236],
  'rounded-square': [206, 206],
}

const baseDefinition = {
  schema: MASCOT_SCHEMA,
  schemaVersion: MASCOT_SCHEMA_VERSION,
  name: 'New mascot',
  blob: {
    shape: 'circle',
    width: 210,
    height: 210,
    color: '#6fcf97',
  },
  face: {
    eyeShape: 'capsule',
    eyeColor: '#18332a',
    eyeWidth: 20,
    eyeHeight: 50,
    eyeGap: 35,
    eyeY: -7,
  },
  stage: {
    color: '#f3efe7',
  },
  expressions: {
    neutral: {
      label: 'Neutral',
      pose: createPose(),
    },
    attentive: {
      label: 'Attentive',
      pose: createPose({
        x: 2,
        rotation: 4,
        gazeX: 3,
        leftEye: eyePose(0.95, 1.13),
        rightEye: eyePose(0.95, 1.13),
      }),
    },
    curious: {
      label: 'Curious',
      pose: createPose({
        x: -2,
        rotation: -7,
        gazeX: -4,
        gazeY: -2,
        leftEye: eyePose(0.92, 1.06, 0, 0, 17),
        rightEye: eyePose(0.82, 0.88, 0, 1, -13),
      }),
    },
    'glance-up': {
      label: 'Glance up',
      pose: createPose({
        x: 3,
        rotation: -10,
        gazeX: 5,
        gazeY: -10,
        leftEye: eyePose(1.02, 0.88),
        rightEye: eyePose(1.02, 0.88),
      }),
    },
    gentle: {
      label: 'Gentle',
      pose: createPose({
        x: -1,
        rotation: -5,
        gazeY: 5,
        leftEye: eyePose(1.08, 0.82),
        rightEye: eyePose(1.08, 0.82),
      }),
    },
    skeptical: {
      label: 'Skeptical',
      pose: createPose({
        x: 2,
        rotation: -6,
        gazeX: 4,
        leftEye: eyePose(1.1, 0.34, 0, -1, -4),
        rightEye: eyePose(0.9, 1.08, 0, 1, 3),
      }),
    },
    joyful: {
      label: 'Joyful',
      pose: createPose({
        x: -2,
        y: -5,
        rotation: 8,
        scaleX: 1.02,
        scaleY: 0.95,
        leftEye: eyePose(1.32, 1.4, 0, -2, -5),
        rightEye: eyePose(1.32, 1.4, 0, -2, 5),
      }),
    },
    playful: {
      label: 'Playful',
      pose: createPose({
        x: 2,
        y: -3,
        rotation: -12,
        gazeX: 3,
        leftEye: eyePose(0.85, 0.86, 0, 0, 22),
        rightEye: eyePose(0.85, 0.86, 0, 0, -18),
      }),
    },
    surprised: {
      label: 'Surprised',
      pose: createPose({
        x: -1,
        y: -4,
        rotation: -5,
        scaleX: 0.99,
        scaleY: 1.03,
        leftEye: eyePose(1.55, 0.72),
        rightEye: eyePose(1.55, 0.72),
      }),
    },
    shy: {
      label: 'Shy',
      pose: createPose({
        x: 1,
        rotation: 5,
        gazeX: -2,
        gazeY: 10,
        leftEye: eyePose(0.92, 0.66),
        rightEye: eyePose(0.92, 0.66),
      }),
    },
    sad: {
      label: 'Sad',
      pose: createPose({
        x: -1,
        rotation: -4,
        scaleX: 1.01,
        scaleY: 0.98,
        gazeY: 8,
        leftEye: eyePose(1.12, 0.48, 0, 2, -8),
        rightEye: eyePose(1.12, 0.48, 0, 2, 8),
      }),
    },
    sleepy: {
      label: 'Sleepy',
      pose: createPose({
        rotation: 5,
        scaleX: 1.01,
        scaleY: 0.97,
        gazeY: 4,
        leftEye: eyePose(1.25, 0.18),
        rightEye: eyePose(1.25, 0.18),
      }),
    },
    proud: {
      label: 'Proud',
      pose: createPose({
        x: 3,
        y: -2,
        rotation: -6,
        gazeX: 5,
        gazeY: -5,
        leftEye: eyePose(0.94, 0.82),
        rightEye: eyePose(0.94, 0.82),
      }),
    },
  },
  animations: {
    idle: {
      label: 'Idle',
      playback: 'loop',
      ambient: 0.42,
      blink: 'normal',
      steps: [
        { expression: 'neutral', holdMs: 4400, transitionMs: 640, easing: 'gentle' },
        { expression: 'curious', holdMs: 3200, transitionMs: 760, easing: 'gentle' },
        { expression: 'neutral', holdMs: 5100, transitionMs: 720, easing: 'gentle' },
      ],
    },
    listening: {
      label: 'Listening',
      playback: 'loop',
      ambient: 0.28,
      blink: 'calm',
      steps: [
        { expression: 'attentive', holdMs: 2600, transitionMs: 560, easing: 'gentle' },
        { expression: 'gentle', holdMs: 2200, transitionMs: 680, easing: 'gentle' },
        { expression: 'attentive', holdMs: 3100, transitionMs: 610, easing: 'gentle' },
      ],
    },
    thinking: {
      label: 'Thinking',
      playback: 'loop',
      ambient: 0.34,
      blink: 'normal',
      steps: [
        { expression: 'curious', holdMs: 1750, transitionMs: 690, easing: 'gentle' },
        { expression: 'skeptical', holdMs: 2100, transitionMs: 610, easing: 'gentle' },
        { expression: 'glance-up', holdMs: 2500, transitionMs: 780, easing: 'gentle' },
        { expression: 'curious', holdMs: 1850, transitionMs: 640, easing: 'gentle' },
      ],
    },
    happy: {
      label: 'Happy',
      playback: 'loop',
      ambient: 0.48,
      blink: 'bright',
      steps: [
        { expression: 'gentle', holdMs: 1300, transitionMs: 520, easing: 'spring' },
        { expression: 'joyful', holdMs: 2100, transitionMs: 620, easing: 'spring' },
        { expression: 'playful', holdMs: 1700, transitionMs: 570, easing: 'gentle' },
      ],
    },
    curious: {
      label: 'Curious',
      playback: 'loop',
      ambient: 0.38,
      blink: 'normal',
      steps: [
        { expression: 'curious', holdMs: 2300, transitionMs: 650, easing: 'gentle' },
        { expression: 'glance-up', holdMs: 2700, transitionMs: 710, easing: 'gentle' },
        { expression: 'attentive', holdMs: 1900, transitionMs: 580, easing: 'gentle' },
      ],
    },
    surprised: {
      label: 'Surprised',
      playback: 'once',
      ambient: 0.22,
      blink: 'bright',
      steps: [
        { expression: 'neutral', holdMs: 180, transitionMs: 120, easing: 'quick' },
        { expression: 'surprised', holdMs: 1450, transitionMs: 360, easing: 'spring' },
        { expression: 'curious', holdMs: 900, transitionMs: 820, easing: 'gentle' },
      ],
    },
    shy: {
      label: 'Shy',
      playback: 'loop',
      ambient: 0.2,
      blink: 'calm',
      steps: [
        { expression: 'gentle', holdMs: 2400, transitionMs: 720, easing: 'gentle' },
        { expression: 'shy', holdMs: 3300, transitionMs: 810, easing: 'gentle' },
      ],
    },
    sad: {
      label: 'Sad',
      playback: 'loop',
      ambient: 0.16,
      blink: 'sleepy',
      steps: [
        { expression: 'sad', holdMs: 3900, transitionMs: 920, easing: 'gentle' },
        { expression: 'sleepy', holdMs: 2800, transitionMs: 980, easing: 'gentle' },
        { expression: 'gentle', holdMs: 3500, transitionMs: 880, easing: 'gentle' },
      ],
    },
    proud: {
      label: 'Proud',
      playback: 'loop',
      ambient: 0.32,
      blink: 'normal',
      steps: [
        { expression: 'attentive', holdMs: 1600, transitionMs: 560, easing: 'gentle' },
        { expression: 'proud', holdMs: 2900, transitionMs: 680, easing: 'spring' },
        { expression: 'gentle', holdMs: 1800, transitionMs: 760, easing: 'gentle' },
      ],
    },
    celebrate: {
      label: 'Celebrate',
      playback: 'once',
      ambient: 0.54,
      blink: 'bright',
      steps: [
        { expression: 'shy', holdMs: 240, transitionMs: 180, easing: 'quick' },
        { expression: 'joyful', holdMs: 1050, transitionMs: 390, easing: 'spring' },
        { expression: 'playful', holdMs: 950, transitionMs: 430, easing: 'spring' },
        { expression: 'proud', holdMs: 1500, transitionMs: 760, easing: 'gentle' },
      ],
    },
    sleeping: {
      label: 'Sleeping',
      playback: 'loop',
      ambient: 0.1,
      blink: 'sleepy',
      steps: [
        { expression: 'sleepy', holdMs: 4700, transitionMs: 1100, easing: 'gentle' },
        { expression: 'sad', holdMs: 2100, transitionMs: 1250, easing: 'gentle' },
      ],
    },
  },
}

export const createDefinition = (options = {}) => {
  const definition = clone(baseDefinition)
  const shape = options.shape ?? definition.blob.shape
  const dimensions = shapeDimensions[shape] ?? [definition.blob.width, definition.blob.height]
  definition.name = options.name ?? definition.name
  definition.blob.shape = shape
  definition.blob.width = options.width ?? dimensions[0]
  definition.blob.height = options.height ?? dimensions[1]
  definition.blob.color = options.color ?? definition.blob.color
  definition.face.eyeShape = options.eyeShape ?? definition.face.eyeShape
  definition.face.eyeColor = options.eyeColor ?? definition.face.eyeColor
  definition.stage.color = options.stageColor ?? definition.stage.color
  return definition
}

export const cloneDefinition = definition => clone(definition)

const hasFiniteFields = (target, fields) =>
  target && fields.every(field => Number.isFinite(target[field]))

export const validateDefinition = definition => {
  const errors = []
  if (!definition || typeof definition !== 'object') return { ok: false, errors: ['Definition must be an object.'] }
  if (definition.schema !== MASCOT_SCHEMA) errors.push(`schema must be "${MASCOT_SCHEMA}".`)
  if (definition.schemaVersion !== MASCOT_SCHEMA_VERSION) errors.push(`schemaVersion must be ${MASCOT_SCHEMA_VERSION}.`)
  if (!definition.blob || !hasBlobShape(definition.blob.shape)) errors.push('blob.shape is not registered.')
  if (!(definition.blob?.width > 0) || !(definition.blob?.height > 0)) errors.push('blob dimensions must be positive.')
  if (!/^#[0-9a-f]{6}$/i.test(definition.blob?.color ?? '')) errors.push('blob.color must be a six-digit hex color.')
  if (!/^#[0-9a-f]{6}$/i.test(definition.face?.eyeColor ?? '')) errors.push('face.eyeColor must be a six-digit hex color.')
  if (definition.face?.eyeShape != null && !['capsule', 'oval'].includes(definition.face.eyeShape)) {
    errors.push('face.eyeShape must be capsule or oval.')
  }
  if (!hasFiniteFields(definition.face, ['eyeWidth', 'eyeHeight', 'eyeGap', 'eyeY'])) errors.push('face dimensions must be finite numbers.')
  if (!/^#[0-9a-f]{6}$/i.test(definition.stage?.color ?? '')) errors.push('stage.color must be a six-digit hex color.')
  if (!definition.expressions || !Object.keys(definition.expressions).length) errors.push('At least one expression is required.')
  if (!definition.animations || !Object.keys(definition.animations).length) errors.push('At least one animation is required.')

  for (const [key, expression] of Object.entries(definition.expressions ?? {})) {
    const pose = expression?.pose
    if (!hasFiniteFields(pose?.blob, ['x', 'y', 'rotation', 'scaleX', 'scaleY'])
      || !hasFiniteFields(pose?.gaze, ['x', 'y'])
      || !hasFiniteFields(pose?.eyes?.left, ['scaleX', 'scaleY', 'x', 'y', 'rotation'])
      || !hasFiniteFields(pose?.eyes?.right, ['scaleX', 'scaleY', 'x', 'y', 'rotation'])) {
      errors.push(`${key} has an invalid pose.`)
    }
  }

  for (const [key, animation] of Object.entries(definition.animations ?? {})) {
    if (!['loop', 'once'].includes(animation.playback)) errors.push(`${key}.playback must be loop or once.`)
    if (![true, false, 'none', 'calm', 'normal', 'bright', 'sleepy'].includes(animation.blink)) {
      errors.push(`${key}.blink has an unknown profile.`)
    }
    if (!Array.isArray(animation.steps) || !animation.steps.length) {
      errors.push(`${key} must have at least one step.`)
      continue
    }
    for (const step of animation.steps) {
      if (!definition.expressions?.[step.expression]) errors.push(`${key} references unknown expression "${step.expression}".`)
      if (step.easing != null && !['gentle', 'quick', 'spring'].includes(step.easing)) {
        errors.push(`${key} step has an unknown easing curve.`)
      }
      if (!Number.isFinite(step.holdMs) || !Number.isFinite(step.transitionMs)
        || step.holdMs < 0 || step.transitionMs < 0) errors.push(`${key} step timings must be finite and non-negative.`)
    }
  }
  return { ok: errors.length === 0, errors }
}
