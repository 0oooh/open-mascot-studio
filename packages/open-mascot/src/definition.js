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
    eyeHeight: 42,
    eyeGap: 58,
    eyeY: -8,
  },
  stage: {
    color: '#f3efe7',
  },
  expressions: {
    neutral: {
      label: 'Neutral',
      pose: createPose(),
    },
    curious: {
      label: 'Curious',
      pose: createPose({
        x: -3,
        y: -4,
        rotation: -7,
        gazeX: -4,
        gazeY: -3,
        leftEye: eyePose(0.94, 1.08, 0, 0, 8),
        rightEye: eyePose(0.88, 0.9, 0, 1, -5),
      }),
    },
    happy: {
      label: 'Happy',
      pose: createPose({
        y: -8,
        rotation: 4,
        scaleX: 1.04,
        scaleY: 0.96,
        leftEye: eyePose(1.22, 0.58, 0, -1, -6),
        rightEye: eyePose(1.22, 0.58, 0, -1, 6),
      }),
    },
    sleepy: {
      label: 'Sleepy',
      pose: createPose({
        y: 5,
        rotation: 3,
        scaleX: 1.02,
        scaleY: 0.98,
        gazeY: 4,
        leftEye: eyePose(1.15, 0.2),
        rightEye: eyePose(1.15, 0.2),
      }),
    },
  },
  animations: {
    idle: {
      label: 'Idle',
      playback: 'loop',
      ambient: 0.45,
      blink: true,
      steps: [
        { expression: 'neutral', holdMs: 3000, transitionMs: 650 },
        { expression: 'curious', holdMs: 1800, transitionMs: 720 },
        { expression: 'neutral', holdMs: 2600, transitionMs: 680 },
      ],
    },
    hello: {
      label: 'Hello',
      playback: 'once',
      ambient: 0.3,
      blink: true,
      steps: [
        { expression: 'neutral', holdMs: 300, transitionMs: 360 },
        { expression: 'happy', holdMs: 850, transitionMs: 440 },
        { expression: 'curious', holdMs: 500, transitionMs: 420 },
        { expression: 'neutral', holdMs: 500, transitionMs: 0 },
      ],
    },
    rest: {
      label: 'Rest',
      playback: 'loop',
      ambient: 0.16,
      blink: false,
      steps: [
        { expression: 'sleepy', holdMs: 3600, transitionMs: 900 },
        { expression: 'neutral', holdMs: 700, transitionMs: 860 },
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
    if (!Array.isArray(animation.steps) || !animation.steps.length) {
      errors.push(`${key} must have at least one step.`)
      continue
    }
    for (const step of animation.steps) {
      if (!definition.expressions?.[step.expression]) errors.push(`${key} references unknown expression "${step.expression}".`)
      if (!Number.isFinite(step.holdMs) || !Number.isFinite(step.transitionMs)
        || step.holdMs < 0 || step.transitionMs < 0) errors.push(`${key} step timings must be finite and non-negative.`)
    }
  }
  return { ok: errors.length === 0, errors }
}
