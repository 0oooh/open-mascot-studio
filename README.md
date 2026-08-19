# Open Mascot

Open Mascot is a dependency-free 2D vector mascot engine with matching browser and React Native renderers. A mascot is described once as JSON, then rendered and animated on either platform.

The default body primitive is called a **blob**. Built-in blob shapes are `circle`, `oval`, `capsule`, `bean`, `drop`, and `rounded-square`. Every shape uses the same pose space, so changing the silhouette does not require rewriting expressions or animations.

Eyes can use either the original soft `capsule` style or an `oval` style. The choice is stored in the same portable definition and rendered consistently on both platforms.

The default definition includes 13 editable expressions and 11 composed motions. Motion steps retain their expression, easing curve, hold time, transition time, ambient amount, and blink profile.

## Packages

| Package | Purpose |
| --- | --- |
| `open-mascot` | Platform-neutral definitions, blob shapes, motion sampling, scene generation, and the browser SVG runtime |
| `open-mascot-react-native` | A React Native component backed by `react-native-svg` |

## Browser

```js
import { createDefinition } from 'open-mascot'
import { createMascot } from 'open-mascot/web'

const character = createDefinition({
  name: 'Mallow',
  shape: 'bean',
  color: '#8b7cf6',
})

const mascot = createMascot('#mascot', {
  definition: character,
  animation: 'idle',
})

mascot.play('hello')
mascot.setExpression('curious')
```

## React Native

```jsx
import { createDefinition } from 'open-mascot'
import { OpenMascot } from 'open-mascot-react-native'

const character = createDefinition({ shape: 'drop' })

export function Character() {
  return <OpenMascot definition={character} animation="idle" width={240} height={240} />
}
```

The React Native adapter expects `react`, `react-native`, and `react-native-svg` from the host app.

## Local verification

```bash
npm test
npm run check
```

## Project boundary

This personal MIT project contains only generic primitives, original example definitions, and its own implementation. It ships no company-specific characters, assets, palettes, links, or product copy.

## License

MIT
