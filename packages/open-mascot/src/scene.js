import { createBlobPath } from './shapes.js'

export const VIEWBOX = { width: 400, height: 400 }

const fixed = value => Number(Number(value).toFixed(3))

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
    return {
      cx: fixed(direction * face.eyeGap / 2 + pose.gaze.x + eyePose.x),
      cy: fixed(face.eyeY + pose.gaze.y + eyePose.y),
      rx: fixed(Math.max(1, (face.eyeWidth * eyePose.scaleX) / 2)),
      ry: fixed(Math.max(1, (face.eyeHeight * eyePose.scaleY) / 2)),
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
