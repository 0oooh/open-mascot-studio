import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('the studio keeps the complete editor and adds API docs', async () => {
  const [html, app] = await Promise.all([
    readFile('examples/web/index.html', 'utf8'),
    readFile('examples/web/demo.js', 'utf8'),
  ])
  for (const tab of ['design', 'expressions', 'motions', 'export', 'api']) {
    assert.match(html, new RegExp(`data-tab="${tab}"`))
  }
  for (const action of [
    'duplicate-expression',
    'delete-expression',
    'duplicate-animation',
    'delete-animation',
    'add-step',
    'delete-step',
    'export-json',
    'export-svg',
    'import-json',
    'open-api',
  ]) {
    assert.match(`${html}\n${app}`, new RegExp(`data-action="${action}"`))
  }
})
