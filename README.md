# Open Mascot

Open Mascot is a dependency-free vector mascot engine with matching browser and React Native renderers. A mascot is described once as JSON, then rendered and animated on either platform.

The default body primitive is called a **blob**. The `soft` preset keeps the base rounded-body proportions; `round`, `tall`, `wide`, `compact`, and `large` vary its width and height. `drop` adds a teardrop profile. Every preset uses the same pose space, so changing the silhouette does not require rewriting expressions or animations.

Choose `projected-3d` for spatial pitch/yaw/roll and perspective-projected eyes, or `rigged-2d` for the lighter flat rig. Both produce ordinary SVG paths. The browser controller can also follow a normalized pointer target with `setLookTarget({ x, y })`; eyes lead and the body follows with a softer delay.

Eyes can use either the default soft `capsule` style or an `oval` style. The choice is stored in the same portable definition and rendered consistently on both platforms.

The default definition includes 15 editable expressions and 11 composed motions. Expressions can independently add body drift, body tremble, a squash-and-stretch boing, eye micro-saccades, or eye tremble without changing their saved pose. Motion steps retain their expression, easing curve, hold time, transition time, ambient amount, and blink profile.

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
  shape: 'drop',
  color: '#e98263',
  renderMode: 'projected-3d',
})

const mascot = createMascot('#mascot', {
  definition: character,
  animation: 'idle',
})

mascot.play('happy')
mascot.setExpression('curious')
mascot.setLookTarget({ x: 0.8, y: -0.3 })
mascot.clearLookTarget()
```

Continuous behavior belongs to the expression, so it works in a static preview and inside any motion sequence:

```js
character.expressions.angry.motion = { body: 'tremble', eyes: 'none' }
character.expressions.uneasy.motion = { body: 'slow-drift', eyes: 'tremble' }
character.expressions.beaming.motion = { body: 'boing', eyes: 'none' }
```

## React Native

```jsx
import { createDefinition } from 'open-mascot'
import { OpenMascot } from 'open-mascot-react-native'

const character = createDefinition({ shape: 'soft' })

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

This personal MIT project contains only generic primitives, project-specific example definitions, and its own implementation. It ships no company-specific characters, assets, palettes, links, or product copy.

## License

MIT
