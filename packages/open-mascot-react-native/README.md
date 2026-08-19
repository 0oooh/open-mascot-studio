# open-mascot-react-native

React Native renderer for `open-mascot`, powered by `react-native-svg`.

```bash
npm install open-mascot open-mascot-react-native react-native-svg
```

```jsx
import { createDefinition } from 'open-mascot'
import { OpenMascot } from 'open-mascot-react-native'

const character = createDefinition({ shape: 'capsule' })

export function Character() {
  return <OpenMascot definition={character} animation="hello" width={240} height={240} />
}
```

The exact same definition and motion sampler are used by the browser renderer.

Licensed under MIT.
