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
    'set-render-mode',
    'toggle-follow',
    'add-to-draft',
    'remove-draft-item',
    'toggle-draft-loop',
    'clear-draft',
    'play-draft',
    'save-draft',
  ]) {
    assert.match(`${html}\n${app}`, new RegExp(`data-action="${action}"`))
  }
  assert.match(app, /Continuous expression motion/)
  assert.match(app, /Slow drift/)
  assert.match(app, /Micro-saccades/)
  assert.match(app, /Tremble/)
  assert.match(app, /Boing · squash \+ stretch/)
  assert.match(app, /open-mascot-studio-v6/)
  assert.match(app, /color: '#e98263'/)
  assert.match(app, /eyeColor: '#3a1e17'/)
  assert.match(app, /stageColor: '#111820'/)
  assert.match(app, /migratePreviousDefinition/)
  assert.match(app, /migrateStarterVocabulary/)
  assert.match(app, /\['angry', 'uneasy'\]/)
  assert.match(html, /id="draft-timeline"/)
  assert.match(app, /renderSceneToSvgString/)
  assert.match(app, /data-library-type=/)
  assert.match(app, /compileDraftTimeline/)
  assert.match(app, /DRAG_DATA_TYPE/)
})
