# open-mascot

Platform-neutral 2D blob shapes, expressions, motion sampling, scene generation, and a browser SVG runtime.

```bash
npm install open-mascot
```

```js
import { createDefinition } from 'open-mascot'
import { createMascot } from 'open-mascot/web'

const definition = createDefinition({ shape: 'bean' })
const mascot = createMascot('#mascot', { definition, animation: 'idle' })
```

Built-in shapes: `circle`, `oval`, `capsule`, `bean`, `drop`, and `rounded-square`.

Built-in eye styles: `capsule` and `oval`.

Licensed under MIT.
