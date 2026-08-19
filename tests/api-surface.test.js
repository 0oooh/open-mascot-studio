import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('documentation only references built-in starter motions', async () => {
  const [rootReadme, nativeReadme] = await Promise.all([
    readFile('README.md', 'utf8'),
    readFile('packages/open-mascot-react-native/README.md', 'utf8'),
  ])
  assert.doesNotMatch(`${rootReadme}\n${nativeReadme}`, /animation=["']hello|play\(["']hello/)
  assert.match(rootReadme, /mascot\.play\('happy'\)/)
  assert.match(nativeReadme, /animation="happy"/)
})

test('public declarations match the browser and native runtime controls', async () => {
  const [webTypes, nativeTypes, nativeRuntime] = await Promise.all([
    readFile('packages/open-mascot/src/web.d.ts', 'utf8'),
    readFile('packages/open-mascot-react-native/src/index.d.ts', 'utf8'),
    readFile('packages/open-mascot-react-native/src/index.js', 'utf8'),
  ])
  for (const control of ['play', 'setExpression', 'pause', 'resume', 'setDefinition', 'setLookTarget', 'clearLookTarget']) {
    assert.match(webTypes, new RegExp(`${control}\\(`))
  }
  assert.match(nativeRuntime, /export \{ renderNativeScene \}/)
  assert.match(nativeTypes, /export function renderNativeScene\(/)
  assert.match(nativeRuntime, /const elapsedAtStart = elapsedRef\.current/)
  assert.doesNotMatch(nativeRuntime, /React\.useEffect\(\(\) => \{\s*setElapsedMs\(0\)\s*if \(!playing/)
})
