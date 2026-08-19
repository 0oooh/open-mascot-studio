# open-mascot

Platform-neutral projected-3D and rigged-2D blob rendering, expressions, motion sampling, scene generation, and a browser SVG runtime.

```bash
npm install open-mascot
```

```js
import { createDefinition } from 'open-mascot'
import { createMascot } from 'open-mascot/web'

const definition = createDefinition({ shape: 'drop', renderMode: 'projected-3d' })
const mascot = createMascot('#mascot', { definition, animation: 'idle' })
mascot.setLookTarget({ x: 0.7, y: -0.2 })
```

Built-in presets: `soft`, `round`, `tall`, `wide`, `compact`, `large`, and `drop`.

Built-in eye styles: `capsule` and `oval`.

The starter definition includes 15 expression poses and 11 motion sequences with editable timing, easing, ambient motion, and blink profiles. Each expression can also use `slow-drift`, `tremble`, or squash-and-stretch `boing` body motion and `micro-saccades` or `tremble` eye motion as a continuous, non-destructive layer.

Licensed under MIT.
