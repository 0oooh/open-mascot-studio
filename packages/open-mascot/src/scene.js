import { createBlobPath } from './shapes.js'

export const VIEWBOX = { width: 400, height: 400 }

const fixed = value => Number(Number(value).toFixed(3))

const ovalPath = (cx, cy, rx, ry) => [
  `M ${fixed(cx - rx)} ${fixed(cy)}`,
  `A ${fixed(rx)} ${fixed(ry)} 0 1 0 ${fixed(cx + rx)} ${fixed(cy)}`,
  `A ${fixed(rx)} ${fixed(ry)} 0 1 0 ${fixed(cx - rx)} ${fixed(cy)}`,
  'Z',
].join(' ')

const capsulePath = (cx, cy, rx, ry) => {
  const x = cx - rx
  const y = cy - ry
  const width = rx * 2
  const height = ry * 2
  const radius = Math.min(rx, ry)
  return [
    `M ${fixed(x + radius)} ${fixed(y)}`,
    `H ${fixed(x + width - radius)}`,
    `A ${fixed(radius)} ${fixed(radius)} 0 0 1 ${fixed(x + width)} ${fixed(y + radius)}`,
    `V ${fixed(y + height - radius)}`,
    `A ${fixed(radius)} ${fixed(radius)} 0 0 1 ${fixed(x + width - radius)} ${fixed(y + height)}`,
    `H ${fixed(x + radius)}`,
    `A ${fixed(radius)} ${fixed(radius)} 0 0 1 ${fixed(x)} ${fixed(y + height - radius)}`,
    `V ${fixed(y + radius)}`,
    `A ${fixed(radius)} ${fixed(radius)} 0 0 1 ${fixed(x + radius)} ${fixed(y)}`,
    'Z',
  ].join(' ')
}

export const buildScene = (definition, pose) => {
  const { blob, face, stage } = definition
  const transform = [
    `translate(${fixed(VIEWBOX.width / 2 + pose.blob.x)} ${fixed(VIEWBOX.height / 2 + pose.blob.y)})`,
    `rotate(${fixed(pose.blob.rotation)})`,
    `scale(${fixed(pose.blob.scaleX)} ${fixed(pose.blob.scaleY)})`,
  ].join(' ')
  const eye = side => {
    const direction = side === 'left' ? -1 : 1
    const eyePose = pose.eyes[side]
    const cx = fixed(direction * face.eyeGap / 2 + pose.gaze.x + eyePose.x)
    const cy = fixed(face.eyeY + pose.gaze.y + eyePose.y)
    const rx = fixed(Math.max(1, (face.eyeWidth * eyePose.scaleX) / 2))
    const ry = fixed(Math.max(1, (face.eyeHeight * eyePose.scaleY) / 2))
    const shape = face.eyeShape ?? 'capsule'
    return {
      shape,
      cx,
      cy,
      rx,
      ry,
      path: shape === 'oval' ? ovalPath(cx, cy, rx, ry) : capsulePath(cx, cy, rx, ry),
      rotation: fixed(eyePose.rotation),
      fill: face.eyeColor,
    }
  }

  return {
    viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`,
    background: stage.color,
    transform,
    shadow: {
      cx: fixed(VIEWBOX.width / 2 + pose.blob.x),
      cy: fixed(VIEWBOX.height / 2 + pose.blob.y + (blob.height * pose.blob.scaleY) / 2 + 24),
      rx: fixed(blob.width * pose.blob.scaleX * 0.37),
      ry: 13,
      fill: '#1b2621',
      opacity: 0.14,
    },
    blob: {
      path: createBlobPath(blob),
      fill: blob.color,
    },
    eyes: [eye('left'), eye('right')],
  }
}
