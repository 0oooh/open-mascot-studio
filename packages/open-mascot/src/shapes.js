const number = value => Number(Number(value).toFixed(3))
const point = (x, y) => `${number(x)} ${number(y)}`
const KAPPA = 0.5522847498

const ellipsePath = (width, height, heightScale = 1) => {
  const rx = width / 2
  const ry = (height / 2) * heightScale
  const cx = rx * KAPPA
  const cy = ry * KAPPA
  return [
    `M ${point(0, -ry)}`,
    `C ${point(cx, -ry)} ${point(rx, -cy)} ${point(rx, 0)}`,
    `C ${point(rx, cy)} ${point(cx, ry)} ${point(0, ry)}`,
    `C ${point(-cx, ry)} ${point(-rx, cy)} ${point(-rx, 0)}`,
    `C ${point(-rx, -cy)} ${point(-cx, -ry)} ${point(0, -ry)}`,
    'Z',
  ].join(' ')
}

const roundedRectPath = (width, height, radius) => {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const r = Math.max(0, Math.min(radius, halfWidth, halfHeight))
  return [
    `M ${point(-halfWidth + r, -halfHeight)}`,
    `H ${number(halfWidth - r)}`,
    `Q ${point(halfWidth, -halfHeight)} ${point(halfWidth, -halfHeight + r)}`,
    `V ${number(halfHeight - r)}`,
    `Q ${point(halfWidth, halfHeight)} ${point(halfWidth - r, halfHeight)}`,
    `H ${number(-halfWidth + r)}`,
    `Q ${point(-halfWidth, halfHeight)} ${point(-halfWidth, halfHeight - r)}`,
    `V ${number(-halfHeight + r)}`,
    `Q ${point(-halfWidth, -halfHeight)} ${point(-halfWidth + r, -halfHeight)}`,
    'Z',
  ].join(' ')
}

const builtInShapes = {
  circle: ({ width, height }) => ellipsePath(width, height),
  oval: ({ width, height }) => ellipsePath(width, height, 0.94),
  capsule: ({ width, height }) => roundedRectPath(width, height, Math.min(width, height) / 2),
  bean: ({ width, height }) => {
    const x = width / 2
    const y = height / 2
    return [
      `M ${point(-x * 0.08, -y)}`,
      `C ${point(x * 0.62, -y * 1.02)} ${point(x * 1.02, -y * 0.55)} ${point(x * 0.82, -y * 0.05)}`,
      `C ${point(x * 0.64, y * 0.38)} ${point(x * 0.94, y * 0.76)} ${point(x * 0.22, y)}`,
      `C ${point(-x * 0.5, y * 1.04)} ${point(-x, y * 0.55)} ${point(-x * 0.88, -y * 0.05)}`,
      `C ${point(-x * 0.78, -y * 0.54)} ${point(-x * 0.54, -y * 0.9)} ${point(-x * 0.08, -y)}`,
      'Z',
    ].join(' ')
  },
  drop: ({ width, height }) => {
    const x = width / 2
    const y = height / 2
    return [
      `M ${point(0, -y)}`,
      `C ${point(x * 0.16, -y * 0.68)} ${point(x, -y * 0.23)} ${point(x, y * 0.26)}`,
      `C ${point(x, y * 0.78)} ${point(x * 0.55, y)} ${point(0, y)}`,
      `C ${point(-x * 0.55, y)} ${point(-x, y * 0.78)} ${point(-x, y * 0.26)}`,
      `C ${point(-x, -y * 0.23)} ${point(-x * 0.16, -y * 0.68)} ${point(0, -y)}`,
      'Z',
    ].join(' ')
  },
  'rounded-square': ({ width, height }) =>
    roundedRectPath(width, height, Math.min(width, height) * 0.28),
}

const registry = new Map(Object.entries(builtInShapes))

export const listBlobShapes = () => [...registry.keys()]

export const hasBlobShape = name => registry.has(name)

export const registerBlobShape = (name, builder) => {
  if (!/^[a-z][a-z0-9-]{0,47}$/.test(name)) {
    throw new TypeError('Blob shape names must be lowercase kebab-case.')
  }
  if (typeof builder !== 'function') throw new TypeError('A blob shape builder must be a function.')
  if (registry.has(name)) throw new Error(`Blob shape already exists: ${name}`)
  registry.set(name, builder)
  return () => registry.delete(name)
}

export const createBlobPath = blob => {
  const builder = registry.get(blob.shape)
  if (!builder) throw new Error(`Unknown blob shape: ${blob.shape}`)
  const path = builder({ ...blob })
  if (typeof path !== 'string' || !path.trim()) {
    throw new TypeError(`Blob shape "${blob.shape}" did not return an SVG path.`)
  }
  return path
}
