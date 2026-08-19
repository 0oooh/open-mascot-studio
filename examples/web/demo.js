import {
  buildScene,
  cloneDefinition,
  createDefinition,
  getAnimationDuration,
  listBlobShapes,
  sampleAnimation,
  sampleExpression,
  validateDefinition,
} from '/packages/open-mascot/src/index.js'
import { createMascot, renderSceneToSvgString } from '/packages/open-mascot/src/web.js'
import { compileDraftTimeline } from '/examples/web/timeline.js'
import { migrateStarterVocabulary } from '/examples/web/vocabulary.js'

const STORAGE_KEY = 'open-mascot-studio-v6'
const PREVIOUS_STORAGE_KEY = 'open-mascot-studio-v5'
const LEGACY_STORAGE_KEYS = ['open-mascot-studio-v4', 'open-mascot-studio-v3']
const panel = document.querySelector('#panel')
const stage = document.querySelector('#stage-canvas')
const saveState = document.querySelector('#save-state')
const previewTitle = document.querySelector('#preview-title')
const motionStatus = document.querySelector('#motion-status')
const playIcon = document.querySelector('#play-icon')
const toast = document.querySelector('#toast')
const importFile = document.querySelector('#import-file')
const draftTimeline = document.querySelector('#draft-timeline')

const DRAFT_ANIMATION_KEY = '__draft-timeline'
const DRAG_DATA_TYPE = 'application/x-open-mascot-item'

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const titleCase = value => value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ')
const clone = value => JSON.parse(JSON.stringify(value))
const identifierFrom = value =>
  (value.normalize('NFKD').match(/[a-z0-9]+/gi) ?? []).join('-').toLowerCase()

const createFreshDefinition = () => createDefinition({
  name: 'Mallow',
  shape: 'soft',
  color: '#e98263',
  eyeColor: '#3a1e17',
  stageColor: '#111820',
})

const ensureExpressionMotions = target => {
  for (const expression of Object.values(target?.expressions ?? {})) {
    expression.motion = {
      body: 'none',
      eyes: 'none',
      ...expression.motion,
    }
  }
  return target
}

const migratePreviousDefinition = target => {
  if (!target?.expressions) return target
  const defaults = createFreshDefinition()
  for (const key of ['angry', 'uneasy']) {
    if (!target.expressions[key]) target.expressions[key] = clone(defaults.expressions[key])
  }
  if (target.blob?.color?.toLowerCase() === '#b986cf') target.blob.color = defaults.blob.color
  if (target.face?.eyeColor?.toLowerCase() === '#2e1835') target.face.eyeColor = defaults.face.eyeColor
  if (target.stage?.color?.toLowerCase() === '#10151d') target.stage.color = defaults.stage.color
  return ensureExpressionMotions(migrateStarterVocabulary(target))
}

const loadDefinition = () => {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    const previous = localStorage.getItem(PREVIOUS_STORAGE_KEY)
      ?? LEGACY_STORAGE_KEYS.map(key => localStorage.getItem(key)).find(Boolean)
    const saved = current
      ? ensureExpressionMotions(JSON.parse(current))
      : migratePreviousDefinition(JSON.parse(previous))
    if (saved?.face && saved.face.eyeShape == null) saved.face.eyeShape = 'capsule'
    if (validateDefinition(saved).ok) {
      if (!current) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
      return saved
    }
  } catch {}
  return createFreshDefinition()
}

const query = new URLSearchParams(location.search)
let definition = loadDefinition()
if (listBlobShapes().includes(query.get('shape'))) {
  const requested = createDefinition({ shape: query.get('shape') })
  definition.blob.shape = requested.blob.shape
  definition.blob.width = requested.blob.width
  definition.blob.height = requested.blob.height
}
if (['projected-3d', 'rigged-2d'].includes(query.get('render'))) {
  definition.blob.renderMode = query.get('render')
}
let activeTab = ['design', 'expressions', 'motions', 'export', 'api'].includes(query.get('tab'))
  ? query.get('tab')
  : 'design'
let selectedExpression = definition.expressions[query.get('expression')]
  ? query.get('expression')
  : Object.keys(definition.expressions)[0]
let selectedAnimation = definition.animations[query.get('motion')]
  ? query.get('motion')
  : Object.keys(definition.animations)[0]
let isPlaying = true
let toastTimer = 0
let saveTimer = 0
let lastStatusUpdate = 0
let followCursor = false
let draftItems = []
let draftLoop = true
let draftPreview = null
let draftPreviewActive = false
let activeDraftItemId = null
let draftId = 0
let draggedDraftItemId = null

const mascot = createMascot('#mascot-host', {
  definition,
  animation: selectedAnimation,
  onComplete: () => {
    isPlaying = false
    updatePerformanceStatus()
  },
})

const setPath = (target, path, value) => {
  const parts = path.split('.')
  const final = parts.pop()
  const parent = parts.reduce((current, key) => current[key], target)
  parent[final] = value
}

const getPath = (target, path) =>
  path.split('.').reduce((current, key) => current[key], target)

const optionList = (values, selected) => values.map(({ value, label }) =>
  `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`,
).join('')

const expressionOptions = selected => optionList(
  Object.entries(definition.expressions).map(([value, item]) => ({ value, label: item.label })),
  selected,
)

const showToast = message => {
  clearTimeout(toastTimer)
  toast.textContent = message
  toast.classList.add('visible')
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400)
}

const scheduleSave = () => {
  clearTimeout(saveTimer)
  saveState.innerHTML = '<i></i> Saving…'
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(definition))
      saveState.innerHTML = '<i></i> Saved locally'
    } catch {
      saveState.innerHTML = '<i></i> Not saved'
    }
  }, 220)
}

const clearDraftPreviewState = () => {
  draftPreviewActive = false
  draftPreview = null
  activeDraftItemId = null
  draftTimeline?.querySelectorAll('.draft-block.is-playing').forEach(item => item.classList.remove('is-playing'))
}

const updatePerformanceStatus = () => {
  if (draftPreviewActive && draftPreview) {
    previewTitle.textContent = draftPreview.animation.label
    motionStatus.textContent = `${isPlaying ? 'Playing' : 'Paused'} · draft timeline`
    playIcon.textContent = isPlaying ? 'Ⅱ' : '▶'
    stage.style.setProperty('--stage', definition.stage.color)
    return
  }
  const animation = definition.animations[selectedAnimation]
  previewTitle.textContent = activeTab === 'expressions'
    ? definition.expressions[selectedExpression].label
    : animation.label
  motionStatus.textContent = `${isPlaying ? 'Playing' : 'Paused'} · ${titleCase(definition.blob.shape)} blob`
  playIcon.textContent = isPlaying ? 'Ⅱ' : '▶'
  stage.style.setProperty('--stage', definition.stage.color)
}

const previewCurrentSelection = () => {
  if (draftPreviewActive) mascot.setDefinition(definition)
  clearDraftPreviewState()
  if (activeTab === 'expressions') {
    mascot.setExpression(selectedExpression)
    isPlaying = false
  } else {
    mascot.play(selectedAnimation)
    isPlaying = true
  }
  renderDraftTimeline()
  updatePerformanceStatus()
}

const commitDefinition = ({ preview = activeTab } = {}) => {
  const result = validateDefinition(definition)
  if (!result.ok) {
    saveState.innerHTML = '<i></i> Finish this field to save'
    return false
  }
  scheduleSave()
  clearDraftPreviewState()
  mascot.setDefinition(definition)
  if (preview === 'expressions') {
    mascot.setExpression(selectedExpression)
    isPlaying = false
  }
  if (preview === 'motions') {
    mascot.play(selectedAnimation)
    isPlaying = true
  }
  renderDraftTimeline()
  updatePerformanceStatus()
  return true
}

const panelHeading = (title, description) => `
  <div class="panel-heading">
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(description)}</p>
  </div>`

const rangeField = ({ label, path, value, min, max, step = 1, scope = 'definition' }) => `
  <label class="field">
    <span class="range-label">${escapeHtml(label)}</span>
    <span class="range-control">
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-scope="${scope}" data-path="${path}" />
      <output class="value-output">${Number(value).toFixed(step < 1 ? 2 : 0)}</output>
    </span>
  </label>`

const colorField = (label, path) => {
  const value = getPath(definition, path)
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <span class="color-control">
        <input type="color" value="${value}" data-scope="definition" data-path="${path}" />
        <code>${value}</code>
      </span>
    </label>`
}

const thumbnailSvg = (type, key, label) => {
  const pose = type === 'expression'
    ? sampleExpression(definition, key, 0, { reducedMotion: true })
    : sampleAnimation(
        definition,
        key,
        Math.max(0, getAnimationDuration(definition.animations[key]) * 0.28),
        { reducedMotion: true },
      ).pose
  return renderSceneToSvgString(buildScene(definition, pose), {
    label: `${label} ${type} thumbnail`,
  })
}

const renderLibraryCard = ({ type, key, item, selected }) => {
  const selectAction = type === 'expression' ? 'select-expression' : 'select-animation'
  const detail = type === 'expression'
    ? 'Expression'
    : `${item.steps.length} ${item.steps.length === 1 ? 'beat' : 'beats'}`
  return `
    <article class="library-card${selected ? ' selected' : ''}" draggable="true" data-library-type="${type}" data-library-key="${escapeHtml(key)}">
      <button class="library-preview-button" type="button" data-action="${selectAction}" data-key="${escapeHtml(key)}" aria-pressed="${selected}">
        <span class="library-thumbnail">${thumbnailSvg(type, key, item.label)}</span>
        <span class="library-card-copy">
          <strong>${escapeHtml(item.label)}</strong>
          <small>${detail}</small>
        </span>
      </button>
      <button class="library-add-button" type="button" data-action="add-to-draft" data-type="${type}" data-key="${escapeHtml(key)}" aria-label="Add ${escapeHtml(item.label)} to draft timeline">+</button>
    </article>`
}

const renderLibrary = (type, collection, selectedKey) => `
  <div class="library-grid" aria-label="${type === 'expression' ? 'Expression' : 'Motion'} library">
    ${Object.entries(collection).map(([key, item]) => renderLibraryCard({
      type,
      key,
      item,
      selected: key === selectedKey,
    })).join('')}
  </div>`

const renderDesign = () => {
  const shapes = listBlobShapes().map(shape => `
    <button type="button" data-action="select-shape" data-key="${shape}" aria-pressed="${shape === definition.blob.shape}">
      <strong>${titleCase(shape)}</strong>
      <span>${shape === 'soft' ? 'Default proportions' : shape === 'drop' ? 'Drop profile' : 'Same body rig'}</span>
    </button>`).join('')

  return `
    ${panelHeading('Shape the character', 'Tune one stable vector mascot. Every expression and animation inherits these choices.')}
    <section class="render-mode-block">
      <div class="section-title"><h3>Renderer</h3><span>Compare live</span></div>
      <div class="mode-switch" role="group" aria-label="Mascot renderer">
        <button type="button" data-action="set-render-mode" data-mode="projected-3d" aria-pressed="${definition.blob.renderMode === 'projected-3d'}">
          <strong>Projected 3D</strong>
          <span>Full spatial turning</span>
        </button>
        <button type="button" data-action="set-render-mode" data-mode="rigged-2d" aria-pressed="${definition.blob.renderMode === 'rigged-2d'}">
          <strong>Rigged 2D</strong>
          <span>Lightweight for games</span>
        </button>
      </div>
    </section>
    <section class="render-mode-block">
      <div class="section-title"><h3>Blob proportions</h3><span>Width + height presets</span></div>
      <div class="shape-grid" role="group" aria-label="Blob shape">${shapes}</div>
    </section>
    <section class="section-block">
      <div class="section-title"><h3>Identity</h3><span>One source of truth</span></div>
      <label class="field">
        <span>Character name</span>
        <input class="text-input" value="${escapeHtml(definition.name)}" data-scope="definition" data-path="name" />
      </label>
    </section>
    <section class="section-block">
      <div class="section-title"><h3>Palette</h3><span>SVG-safe solid colours</span></div>
      <div class="control-grid">
        ${colorField('Blob', 'blob.color')}
        ${colorField('Eyes', 'face.eyeColor')}
        ${colorField('Stage', 'stage.color')}
      </div>
    </section>
    <section class="section-block">
      <div class="section-title"><h3>Face</h3><span>Eyes do the acting</span></div>
      <div class="chip-list" role="group" aria-label="Eye style">
        <button class="choice-chip" type="button" data-action="select-eye-shape" data-key="capsule" aria-pressed="${(definition.face.eyeShape ?? 'capsule') === 'capsule'}">Soft capsule</button>
        <button class="choice-chip" type="button" data-action="select-eye-shape" data-key="oval" aria-pressed="${definition.face.eyeShape === 'oval'}">Oval</button>
      </div>
      <div class="control-grid">
        ${rangeField({ label: 'Eye width', path: 'face.eyeWidth', value: definition.face.eyeWidth, min: 10, max: 34 })}
        ${rangeField({ label: 'Eye height', path: 'face.eyeHeight', value: definition.face.eyeHeight, min: 25, max: 72 })}
        ${rangeField({ label: 'Eye spacing', path: 'face.eyeGap', value: definition.face.eyeGap, min: 30, max: 94 })}
        ${rangeField({ label: 'Vertical position', path: 'face.eyeY', value: definition.face.eyeY, min: -45, max: 35 })}
      </div>
    </section>
    <section class="section-block">
      <div class="section-title"><h3>Silhouette</h3><span>Motion-safe proportions</span></div>
      <div class="control-grid">
        ${rangeField({ label: 'Blob width', path: 'blob.width', value: definition.blob.width, min: 160, max: 280 })}
        ${rangeField({ label: 'Blob height', path: 'blob.height', value: definition.blob.height, min: 160, max: 330 })}
      </div>
    </section>`
}

const poseRange = (label, path, min, max, step = 1) => rangeField({
  label,
  path,
  value: getPath(definition.expressions[selectedExpression].pose, path),
  min,
  max,
  step,
  scope: 'expression',
})

const renderExpressions = () => {
  const expression = definition.expressions[selectedExpression]

  return `
    ${panelHeading('Direct the expression', 'Pose each eye independently, then add restrained body language. Asymmetry keeps the face feeling alive.')}
    ${renderLibrary('expression', definition.expressions, selectedExpression)}
    <section class="section-block">
      <div class="section-title"><h3>Selected pose</h3><span>${escapeHtml(selectedExpression)}</span></div>
      <label class="field">
        <span>Expression name</span>
        <input class="text-input" value="${escapeHtml(expression.label)}" data-scope="expression-meta" data-path="label" />
      </label>
      <div class="action-row">
        <button class="secondary-button" type="button" data-action="duplicate-expression">Duplicate pose</button>
        <button class="danger-button" type="button" data-action="delete-expression" ${selectedExpression === 'neutral' ? 'disabled' : ''}>Delete</button>
      </div>
    </section>
    <details class="subsection" open>
      <summary>Blob direction</summary>
      <div class="subsection-content control-grid">
        ${poseRange('Look up / down', 'blob.pitch', -24, 24)}
        ${poseRange('Turn left / right', 'blob.yaw', -28, 28)}
        ${poseRange('Head tilt', 'blob.roll', -22, 22)}
        ${poseRange('Squash / stretch', 'blob.squash', -.1, .13, .01)}
        ${poseRange('Lift', 'blob.lift', -16, 18)}
      </div>
    </details>
    <details class="subsection" open>
      <summary>Gaze</summary>
      <div class="subsection-content control-grid">
        ${poseRange('Horizontal gaze', 'gaze.x', -18, 18)}
        ${poseRange('Vertical gaze', 'gaze.y', -18, 18)}
      </div>
    </details>
    <details class="subsection" open>
      <summary>Continuous expression motion</summary>
      <div class="subsection-content control-grid">
        <label class="field">
          <span>Body motion</span>
          <select class="select-input" data-scope="expression-meta" data-path="motion.body">
            ${optionList([
              { value: 'none', label: 'None' },
              { value: 'slow-drift', label: 'Slow drift' },
              { value: 'tremble', label: 'Tremble' },
              { value: 'boing', label: 'Boing · squash + stretch' },
            ], expression.motion?.body ?? 'none')}
          </select>
        </label>
        <label class="field">
          <span>Eye motion</span>
          <select class="select-input" data-scope="expression-meta" data-path="motion.eyes">
            ${optionList([
              { value: 'none', label: 'None' },
              { value: 'micro-saccades', label: 'Micro-saccades' },
              { value: 'tremble', label: 'Tremble' },
            ], expression.motion?.eyes ?? 'none')}
          </select>
        </label>
      </div>
    </details>
    ${renderEyeControls('left', 'Left eye')}
    ${renderEyeControls('right', 'Right eye')}`
}

const renderEyeControls = (side, label) => `
  <details class="subsection">
    <summary>${label}</summary>
    <div class="subsection-content control-grid">
      ${poseRange('Width scale', `eyes.${side}.scaleX`, .15, 1.8, .01)}
      ${poseRange('Height scale', `eyes.${side}.scaleY`, .06, 1.8, .01)}
      ${poseRange('Horizontal', `eyes.${side}.x`, -15, 15)}
      ${poseRange('Vertical', `eyes.${side}.y`, -15, 15)}
      ${poseRange('Rotation', `eyes.${side}.rotation`, -35, 35)}
    </div>
  </details>`

const renderStep = (step, index, stepCount) => `
  <div class="step-card">
    <div class="step-heading">
      <strong>Beat ${index + 1}</strong>
      <button class="icon-button" type="button" data-action="delete-step" data-index="${index}" aria-label="Delete beat ${index + 1}" ${stepCount === 1 ? 'disabled' : ''}>×</button>
    </div>
    <div class="control-grid">
      <label class="field">
        <span>Expression</span>
        <select class="select-input" data-scope="step" data-index="${index}" data-path="expression">${expressionOptions(step.expression)}</select>
      </label>
      <label class="field">
        <span>Easing</span>
        <select class="select-input" data-scope="step" data-index="${index}" data-path="easing">
          ${optionList([
            { value: 'gentle', label: 'Gentle settle' },
            { value: 'spring', label: 'Soft spring' },
            { value: 'quick', label: 'Quick response' },
          ], step.easing ?? 'gentle')}
        </select>
      </label>
      <label class="field">
        <span>Hold (ms)</span>
        <input class="number-input" type="number" min="0" max="12000" step="50" value="${step.holdMs}" data-scope="step" data-index="${index}" data-path="holdMs" />
      </label>
      <label class="field">
        <span>Transition (ms)</span>
        <input class="number-input" type="number" min="0" max="4000" step="10" value="${step.transitionMs}" data-scope="step" data-index="${index}" data-path="transitionMs" />
      </label>
    </div>
  </div>`

const renderMotions = () => {
  const animation = definition.animations[selectedAnimation]

  return `
    ${panelHeading('Compose the motion', 'Sequence expression beats, tune timing, and preview the same motion data used by both renderers.')}
    ${renderLibrary('motion', definition.animations, selectedAnimation)}
    <section class="section-block">
      <div class="section-title"><h3>Performance</h3><span>${animation.steps.length} beats</span></div>
      <div class="control-grid">
        <label class="field">
          <span>Motion name</span>
          <input class="text-input" value="${escapeHtml(animation.label)}" data-scope="animation" data-path="label" />
        </label>
        <label class="field">
          <span>Playback</span>
          <select class="select-input" data-scope="animation" data-path="playback">
            ${optionList([{ value: 'loop', label: 'Loop' }, { value: 'once', label: 'Play once' }], animation.playback)}
          </select>
        </label>
        <label class="field">
          <span>Blink profile</span>
          <select class="select-input" data-scope="animation" data-path="blink">
            ${optionList([
              { value: 'normal', label: 'Normal' },
              { value: 'calm', label: 'Calm' },
              { value: 'bright', label: 'Bright' },
              { value: 'sleepy', label: 'Sleepy' },
              { value: 'none', label: 'None' },
            ], typeof animation.blink === 'string' ? animation.blink : animation.blink ? 'normal' : 'none')}
          </select>
        </label>
        ${rangeField({ label: 'Ambient motion', path: 'ambient', value: animation.ambient, min: 0, max: 1, step: .01, scope: 'animation' })}
      </div>
      <div class="action-row">
        <button class="primary-button" type="button" data-action="play-selected">Play motion</button>
        <button class="secondary-button" type="button" data-action="duplicate-animation">Duplicate</button>
        <button class="danger-button" type="button" data-action="delete-animation" ${Object.keys(definition.animations).length === 1 ? 'disabled' : ''}>Delete</button>
      </div>
    </section>
    <section class="section-block">
      <div class="section-title"><h3>Timeline beats</h3><span>Hold first, then move</span></div>
      ${animation.steps.map((step, index) => renderStep(step, index, animation.steps.length)).join('')}
      <div class="action-row">
        <button class="secondary-button" type="button" data-action="add-step">+ Add beat</button>
      </div>
    </section>
    <p class="info-note accent">Naturalness comes from restraint: keep most holds between 1.5–5 seconds and transitions around 0.5–0.9 seconds.</p>`
}

const browserInstall = 'npm install open-mascot'
const browserExample = `import { createDefinition } from 'open-mascot'
import { createMascot } from 'open-mascot/web'

const definition = createDefinition({
  shape: '${definition.blob.shape}',
  color: '${definition.blob.color}',
  renderMode: '${definition.blob.renderMode}',
})

const mascot = createMascot('#mascot', {
  definition,
  animation: '${selectedAnimation}',
})

mascot.setLookTarget({ x: 0.7, y: -0.25 })
mascot.clearLookTarget()`
const nativeInstall = 'npm install open-mascot open-mascot-react-native react-native-svg'
const nativeExample = `import { createDefinition } from 'open-mascot'
import { OpenMascot } from 'open-mascot-react-native'

const definition = createDefinition({
  shape: '${definition.blob.shape}',
  renderMode: '${definition.blob.renderMode}',
})

export function Mascot() {
  return <OpenMascot
    definition={definition}
    animation="${selectedAnimation}"
    width={240}
    height={240}
  />
}`

const codeCard = ({ title, badge, description, install, example, id }) => `
  <article class="export-card">
    <span class="package-badge">${escapeHtml(badge)}</span>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(description)}</p>
    <pre class="code-sample" id="${id}-install">${escapeHtml(install)}</pre>
    <button class="secondary-button" type="button" data-action="copy-code" data-target="${id}-install">Copy install command</button>
    <pre class="code-sample" id="${id}-example">${escapeHtml(example)}</pre>
    <button class="secondary-button" type="button" data-action="copy-code" data-target="${id}-example">Copy example</button>
  </article>`

const renderExport = () => `
  ${panelHeading('Take the mascot anywhere', 'Keep the editable source, export the exact SVG pose on stage, or bring a definition back for further editing.')}
  <div class="export-card">
    <h3>Editable mascot file</h3>
    <p>Includes the blob design, eye style, all expressions, and every motion sequence.</p>
    <button class="primary-button" type="button" data-action="export-json">Download .mascot.json</button>
  </div>
  <div class="export-card">
    <h3>SVG snapshot</h3>
    <p>Exports the exact pose visible on stage as a compact, scalable vector.</p>
    <button class="secondary-button" type="button" data-action="export-svg">Download SVG</button>
  </div>
  <div class="export-card">
    <h3>Continue editing</h3>
    <p>Import a definition from this studio. Invalid or incompatible files are rejected safely.</p>
    <button class="secondary-button" type="button" data-action="import-json">Import mascot file</button>
  </div>
  <div class="export-card">
    <h3>Developer integration</h3>
    <p>Use the same definition through the browser or React Native package.</p>
    <button class="secondary-button" type="button" data-action="open-api">Open API Docs</button>
  </div>`

const renderApi = () => `
  ${panelHeading('Ship the character', 'The studio edits the same portable JSON definition consumed by the browser and React Native packages.')}
  <div class="info-note accent">Both platforms share projected 3D, rigged 2D, expressions, blink timing, continuous expression motion, and the versioned definition schema. A saved draft becomes an ordinary animation in <code>definition.animations</code>. The browser controller also exposes setLookTarget() and clearLookTarget().</div>
  <section class="section-block">
    ${codeCard({
      title: 'Browser SVG runtime',
      badge: 'open-mascot',
      description: 'Dependency-free, framework-neutral, and controlled through a small imperative API.',
      install: browserInstall,
      example: browserExample,
      id: 'browser',
    })}
    ${codeCard({
      title: 'React Native renderer',
      badge: 'open-mascot-react-native',
      description: 'Use the same definition with a react-native-svg component.',
      install: nativeInstall,
      example: nativeExample,
      id: 'native',
    })}
    <article class="export-card">
      <span class="package-badge">.mascot.json</span>
      <h3>Portable definition</h3>
      <p>Export the current character from this studio, commit it with your app, or import it again for further editing.</p>
      <div class="action-row">
        <button class="primary-button" type="button" data-action="export-json">Export JSON</button>
        <button class="secondary-button" type="button" data-action="import-json">Import JSON</button>
      </div>
    </article>
  </section>`

const renderPanel = () => {
  const renders = {
    design: renderDesign,
    expressions: renderExpressions,
    motions: renderMotions,
    export: renderExport,
    api: renderApi,
  }
  panel.innerHTML = renders[activeTab]()
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.setAttribute('aria-selected', String(button.dataset.tab === activeTab))
  })
  renderDraftTimeline()
  updatePerformanceStatus()
}

const setActiveTab = tab => {
  activeTab = tab
  const url = new URL(location.href)
  if (tab === 'design') url.searchParams.delete('tab')
  else url.searchParams.set('tab', tab)
  history.replaceState(null, '', url)
  renderPanel()
  previewCurrentSelection()
}

const createUniqueKey = (collection, label, fallback) => {
  const base = identifierFrom(label) || fallback
  let key = base
  let suffix = 2
  while (collection[key]) key = `${base}-${suffix++}`
  return key
}

const createDraftItem = (type, key) => ({
  id: `draft-${Date.now()}-${++draftId}`,
  type,
  key,
})

const draftItemDefinition = item => item.type === 'expression'
  ? definition.expressions[item.key]
  : definition.animations[item.key]

const draftItemDuration = item => item.type === 'expression'
  ? (item.holdMs ?? 1800) + (item.transitionMs ?? 620)
  : getAnimationDuration(definition.animations[item.key])

const formatDuration = milliseconds => {
  const seconds = milliseconds / 1000
  return `${seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)}s`
}

const renderDraftTimeline = () => {
  if (!draftTimeline) return
  const blocks = draftItems.map(item => {
    const source = draftItemDefinition(item)
    if (!source) return ''
    return `
      <article class="draft-block ${item.type}${item.id === activeDraftItemId ? ' is-playing' : ''}" draggable="true" data-draft-id="${escapeHtml(item.id)}">
        <span class="draft-block-kind">${item.type === 'expression' ? 'Expression' : 'Motion'}</span>
        <strong>${escapeHtml(source.label)}</strong>
        <small>${formatDuration(draftItemDuration(item))}${item.type === 'motion' ? ` · ${source.steps.length} beats` : ' · 1 beat'}</small>
        <button class="draft-remove" type="button" data-action="remove-draft-item" data-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(source.label)} from draft">×</button>
      </article>`
  }).join('')
  const state = mascot?.getState?.()
  const draftPlaying = draftPreviewActive && state?.animationKey === DRAFT_ANIMATION_KEY && state.playing

  draftTimeline.innerHTML = `
    <div class="draft-timeline-head">
      <div>
        <p class="eyebrow">Quick composer</p>
        <h2>Draft timeline</h2>
        <p>Drag a card here or use its + button. Motions stay grouped until you save.</p>
      </div>
      <div class="draft-actions">
        <button class="timeline-button" type="button" data-action="toggle-draft-loop" aria-pressed="${draftLoop}">${draftLoop ? 'Loop' : 'Once'}</button>
        <button class="timeline-button" type="button" data-action="clear-draft" ${draftItems.length ? '' : 'disabled'}>Clear</button>
        <button class="timeline-button primary" type="button" data-action="play-draft" ${draftItems.length ? '' : 'disabled'}>${draftPlaying ? 'Pause' : 'Play'}</button>
        <button class="timeline-button primary save" type="button" data-action="save-draft" ${draftItems.length ? '' : 'disabled'}>Save motion</button>
      </div>
    </div>
    <div class="draft-track${draftItems.length ? '' : ' empty'}" data-draft-track role="list" aria-label="Draft sequence">
      ${blocks || '<div class="draft-drop-hint"><strong>Build a performance</strong><span>Drop expressions and motions in this space</span></div>'}
    </div>`
}

const compileCurrentDraft = (label = 'Draft motion') => compileDraftTimeline(definition, draftItems, {
  label,
  loop: draftLoop,
})

const setActiveDraftItem = id => {
  if (activeDraftItemId === id) return
  activeDraftItemId = id
  draftTimeline?.querySelectorAll('[data-draft-id]').forEach(item => {
    item.classList.toggle('is-playing', item.dataset.draftId === id)
  })
}

const previewDraftTimeline = () => {
  const compiled = compileCurrentDraft()
  if (!compiled.animation.steps.length) {
    showToast('Add an expression or motion first')
    return
  }
  const previewDefinition = cloneDefinition(definition)
  previewDefinition.animations[DRAFT_ANIMATION_KEY] = compiled.animation
  draftPreview = compiled
  draftPreviewActive = true
  activeDraftItemId = compiled.stepOwners[0] ?? null
  mascot.setDefinition(previewDefinition)
  mascot.play(DRAFT_ANIMATION_KEY)
  isPlaying = true
  renderDraftTimeline()
  updatePerformanceStatus()
}

const updateActiveDraft = callback => {
  const wasPlaying = draftPreviewActive
  callback()
  if (wasPlaying && draftItems.length) previewDraftTimeline()
  else {
    if (wasPlaying) previewCurrentSelection()
    renderDraftTimeline()
  }
}

const addDraftItem = (type, key, index = draftItems.length) => {
  const collection = type === 'expression' ? definition.expressions : definition.animations
  if (!collection?.[key]) return
  updateActiveDraft(() => draftItems.splice(index, 0, createDraftItem(type, key)))
  showToast(`${collection[key].label} added to the draft`)
}

const saveDraftMotion = () => {
  const baseLabel = 'Draft motion'
  const key = createUniqueKey(definition.animations, baseLabel, 'draft-motion')
  const suffix = key.match(/-(\d+)$/)?.[1]
  const label = suffix ? `${baseLabel} ${suffix}` : baseLabel
  const compiled = compileCurrentDraft(label)
  if (!compiled.animation.steps.length) {
    showToast('Add an expression or motion first')
    return
  }
  definition.animations[key] = compiled.animation
  selectedAnimation = key
  commitDefinition({ preview: 'none' })
  setActiveTab('motions')
  showToast(`${label} saved to Motions`)
}

const getDraftInsertIndex = (track, clientX) => {
  const blocks = [...track.querySelectorAll('[data-draft-id]')]
  const targetIndex = blocks.findIndex(block => clientX < block.getBoundingClientRect().left + block.getBoundingClientRect().width / 2)
  return targetIndex < 0 ? blocks.length : targetIndex
}

const download = (contents, filename, type) => {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const exportDefinition = () => {
  const name = identifierFrom(definition.name) || 'mascot'
  download(`${JSON.stringify(definition, null, 2)}\n`, `${name}.mascot.json`, 'application/json')
  showToast('Definition exported')
}

const exportSvg = () => {
  const name = identifierFrom(definition.name) || 'mascot'
  download(mascot.exportSvg(), `${name}-pose.svg`, 'image/svg+xml')
  showToast('SVG pose exported')
}

const copyCode = async target => {
  const source = document.querySelector(`#${CSS.escape(target)}`)?.textContent
  if (!source) return
  try {
    await navigator.clipboard.writeText(source)
    showToast('Copied to clipboard')
  } catch {
    showToast('Clipboard access is unavailable')
  }
}

document.addEventListener('click', event => {
  const tab = event.target.closest('[data-tab]')
  if (tab) {
    setActiveTab(tab.dataset.tab)
    return
  }

  const trigger = event.target.closest('[data-action]')
  if (!trigger) return
  const action = trigger.dataset.action

  if (action === 'open-api') setActiveTab('api')
  if (action === 'reset') {
    if (!confirm('Reset the mascot, expressions, and motions to the defaults?')) return
    definition = createFreshDefinition()
    selectedExpression = Object.keys(definition.expressions)[0]
    selectedAnimation = Object.keys(definition.animations)[0]
    draftItems = []
    draftLoop = true
    commitDefinition()
    renderPanel()
    showToast('Studio reset')
  }
  if (action === 'export-json') exportDefinition()
  if (action === 'export-svg') exportSvg()
  if (action === 'import-json') importFile.click()
  if (action === 'copy-code') copyCode(trigger.dataset.target)
  if (action === 'add-to-draft') addDraftItem(trigger.dataset.type, trigger.dataset.key)
  if (action === 'remove-draft-item') {
    updateActiveDraft(() => {
      draftItems = draftItems.filter(item => item.id !== trigger.dataset.id)
    })
  }
  if (action === 'clear-draft') {
    updateActiveDraft(() => { draftItems = [] })
    showToast('Draft cleared')
  }
  if (action === 'toggle-draft-loop') {
    draftLoop = !draftLoop
    if (draftPreviewActive) previewDraftTimeline()
    else renderDraftTimeline()
  }
  if (action === 'play-draft') {
    const state = mascot.getState()
    if (!draftPreviewActive || state.animationKey !== DRAFT_ANIMATION_KEY || state.done) previewDraftTimeline()
    else if (state.playing) {
      mascot.pause()
      isPlaying = false
      renderDraftTimeline()
      updatePerformanceStatus()
    } else {
      mascot.resume()
      isPlaying = true
      renderDraftTimeline()
      updatePerformanceStatus()
    }
  }
  if (action === 'save-draft') saveDraftMotion()
  if (action === 'select-shape') {
    const shapeDefinition = createDefinition({ shape: trigger.dataset.key })
    definition.blob.shape = trigger.dataset.key
    definition.blob.width = shapeDefinition.blob.width
    definition.blob.height = shapeDefinition.blob.height
    commitDefinition()
    renderPanel()
  }
  if (action === 'set-render-mode') {
    definition.blob.renderMode = trigger.dataset.mode
    commitDefinition()
    renderPanel()
    showToast(trigger.dataset.mode === 'rigged-2d' ? 'Rigged 2D renderer active' : 'Projected 3D renderer active')
  }
  if (action === 'toggle-follow') {
    followCursor = !followCursor
    trigger.setAttribute('aria-pressed', String(followCursor))
    trigger.textContent = followCursor ? 'Following cursor' : 'Follow cursor'
    if (!followCursor) mascot.clearLookTarget()
  }
  if (action === 'select-eye-shape') {
    definition.face.eyeShape = trigger.dataset.key
    commitDefinition()
    renderPanel()
  }
  if (action === 'select-expression') {
    selectedExpression = trigger.dataset.key
    renderPanel()
    previewCurrentSelection()
  }
  if (action === 'duplicate-expression') {
    const source = definition.expressions[selectedExpression]
    const key = createUniqueKey(definition.expressions, `${source.label} copy`, 'expression')
    definition.expressions[key] = clone({ ...source, label: `${source.label} copy` })
    selectedExpression = key
    commitDefinition()
    renderPanel()
    showToast('Expression duplicated')
  }
  if (action === 'delete-expression') {
    if (selectedExpression === 'neutral') {
      showToast('Neutral is the required base pose')
      return
    }
    const usedByMotion = Object.values(definition.animations).some(animation =>
      animation.steps.some(step => step.expression === selectedExpression),
    )
    const usedByDraft = draftItems.some(item => item.type === 'expression' && item.key === selectedExpression)
    if (usedByMotion || usedByDraft) {
      showToast(`Remove this expression from ${usedByDraft ? 'the draft and ' : ''}motion beats first`)
      return
    }
    delete definition.expressions[selectedExpression]
    selectedExpression = 'neutral'
    commitDefinition()
    renderPanel()
    showToast('Expression deleted')
  }
  if (action === 'select-animation') {
    selectedAnimation = trigger.dataset.key
    renderPanel()
    previewCurrentSelection()
  }
  if (action === 'play-selected') {
    if (draftPreviewActive) mascot.setDefinition(definition)
    clearDraftPreviewState()
    mascot.play(selectedAnimation)
    isPlaying = true
    renderDraftTimeline()
    updatePerformanceStatus()
  }
  if (action === 'duplicate-animation') {
    const source = definition.animations[selectedAnimation]
    const key = createUniqueKey(definition.animations, `${source.label} copy`, 'motion')
    definition.animations[key] = clone({ ...source, label: `${source.label} copy` })
    selectedAnimation = key
    commitDefinition()
    renderPanel()
    showToast('Motion duplicated')
  }
  if (action === 'delete-animation') {
    if (Object.keys(definition.animations).length === 1) return
    const deletedKey = selectedAnimation
    delete definition.animations[selectedAnimation]
    draftItems = draftItems.filter(item => !(item.type === 'motion' && item.key === deletedKey))
    selectedAnimation = Object.keys(definition.animations)[0]
    commitDefinition()
    renderPanel()
    showToast('Motion deleted')
  }
  if (action === 'add-step') {
    const steps = definition.animations[selectedAnimation].steps
    const previous = steps.at(-1)
    steps.push({ expression: previous.expression, holdMs: 1800, transitionMs: 620, easing: 'gentle' })
    commitDefinition()
    renderPanel()
  }
  if (action === 'delete-step') {
    const steps = definition.animations[selectedAnimation].steps
    if (steps.length > 1) steps.splice(Number(trigger.dataset.index), 1)
    commitDefinition()
    renderPanel()
  }
  if (action === 'previous-motion' || action === 'next-motion') {
    const keys = Object.keys(definition.animations)
    const current = keys.indexOf(selectedAnimation)
    const delta = action === 'previous-motion' ? -1 : 1
    selectedAnimation = keys[(current + delta + keys.length) % keys.length]
    if (draftPreviewActive) mascot.setDefinition(definition)
    clearDraftPreviewState()
    mascot.play(selectedAnimation)
    isPlaying = true
    renderPanel()
  }
  if (action === 'toggle-play') {
    const state = mascot.getState()
    if (state.done && draftPreviewActive) previewDraftTimeline()
    else if (state.staticExpression || state.done) mascot.play(selectedAnimation)
    else if (state.playing) mascot.pause()
    else mascot.resume()
    isPlaying = !state.playing || Boolean(state.staticExpression) || state.done
    renderDraftTimeline()
    updatePerformanceStatus()
  }
})

document.addEventListener('dragstart', event => {
  const draftBlock = event.target.closest('[data-draft-id]')
  const libraryCard = event.target.closest('[data-library-type][data-library-key]')
  if (!draftBlock && !libraryCard) return

  const payload = draftBlock
    ? { source: 'timeline', id: draftBlock.dataset.draftId }
    : { source: 'library', type: libraryCard.dataset.libraryType, key: libraryCard.dataset.libraryKey }
  draggedDraftItemId = payload.id ?? null
  event.dataTransfer.effectAllowed = draftBlock ? 'move' : 'copy'
  event.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(payload))
  event.dataTransfer.setData('text/plain', JSON.stringify(payload))
  ;(draftBlock ?? libraryCard).classList.add('is-dragging')
})

document.addEventListener('dragend', event => {
  event.target.closest('.is-dragging')?.classList.remove('is-dragging')
  draftTimeline?.querySelector('[data-draft-track]')?.classList.remove('is-drag-over')
  draggedDraftItemId = null
})

draftTimeline.addEventListener('dragover', event => {
  const track = event.target.closest('[data-draft-track]')
  if (!track) return
  event.preventDefault()
  event.dataTransfer.dropEffect = draggedDraftItemId ? 'move' : 'copy'
  track.classList.add('is-drag-over')
})

draftTimeline.addEventListener('dragleave', event => {
  const track = event.target.closest('[data-draft-track]')
  if (track && !track.contains(event.relatedTarget)) track.classList.remove('is-drag-over')
})

draftTimeline.addEventListener('drop', event => {
  const track = event.target.closest('[data-draft-track]')
  if (!track) return
  event.preventDefault()
  track.classList.remove('is-drag-over')
  let payload
  try {
    payload = JSON.parse(event.dataTransfer.getData(DRAG_DATA_TYPE) || event.dataTransfer.getData('text/plain'))
  } catch {
    return
  }

  let insertIndex = getDraftInsertIndex(track, event.clientX)
  if (payload.source === 'library') {
    addDraftItem(payload.type, payload.key, insertIndex)
    return
  }
  if (payload.source === 'timeline') {
    const fromIndex = draftItems.findIndex(item => item.id === payload.id)
    if (fromIndex < 0) return
    updateActiveDraft(() => {
      const [item] = draftItems.splice(fromIndex, 1)
      if (fromIndex < insertIndex) insertIndex -= 1
      draftItems.splice(Math.max(0, insertIndex), 0, item)
    })
  }
})

panel.addEventListener('input', event => {
  const input = event.target.closest('[data-scope][data-path]')
  if (!input) return
  const value = input.type === 'checkbox'
    ? input.checked
    : input.type === 'range' || input.type === 'number'
      ? Number(input.value)
      : input.value
  const scope = input.dataset.scope
  if (scope === 'definition') setPath(definition, input.dataset.path, value)
  if (scope === 'expression') setPath(definition.expressions[selectedExpression].pose, input.dataset.path, value)
  if (scope === 'expression-meta') setPath(definition.expressions[selectedExpression], input.dataset.path, value)
  if (scope === 'animation') setPath(definition.animations[selectedAnimation], input.dataset.path, value)
  if (scope === 'step') setPath(definition.animations[selectedAnimation].steps[Number(input.dataset.index)], input.dataset.path, value)

  const output = input.closest('.range-control')?.querySelector('output')
  if (output) output.textContent = Number(value).toFixed(Number(input.step) < 1 ? 2 : 0)
  const colorCode = input.closest('.color-control')?.querySelector('code')
  if (colorCode) colorCode.textContent = value
  commitDefinition()
})

panel.addEventListener('change', event => {
  if (event.target.matches('select[data-scope="step"], input[data-scope="animation"][data-path="label"]')) renderPanel()
})

importFile.addEventListener('change', async () => {
  const [file] = importFile.files
  if (!file) return
  try {
    const next = JSON.parse(await file.text())
    const result = validateDefinition(next)
    if (!result.ok) throw new Error(result.errors.join(' '))
    definition = ensureExpressionMotions(cloneDefinition(next))
    selectedExpression = Object.keys(definition.expressions)[0]
    selectedAnimation = Object.keys(definition.animations)[0]
    draftItems = []
    draftLoop = true
    commitDefinition()
    renderPanel()
    showToast('Definition imported')
  } catch (error) {
    showToast(error.message || 'Could not import that file')
  } finally {
    importFile.value = ''
  }
})

mascot.subscribe(state => {
  const currentTime = performance.now()
  if (currentTime - lastStatusUpdate < 120) return
  lastStatusUpdate = currentTime
  if (state.animationKey === DRAFT_ANIMATION_KEY && draftPreview) {
    draftPreviewActive = true
    isPlaying = state.playing
    previewTitle.textContent = draftPreview.animation.label
    motionStatus.textContent = `${state.done ? 'Complete' : state.playing ? 'Playing' : 'Paused'} · draft beat ${state.stepIndex + 1}`
    playIcon.textContent = state.playing ? 'Ⅱ' : '▶'
    setActiveDraftItem(draftPreview.stepOwners[state.stepIndex] ?? null)
    const draftPlayButton = draftTimeline?.querySelector('[data-action="play-draft"]')
    if (draftPlayButton) draftPlayButton.textContent = state.playing ? 'Pause' : 'Play'
    return
  }
  const animation = definition.animations[state.animationKey]
  if (!animation) return
  isPlaying = state.playing
  if (state.staticExpression) {
    previewTitle.textContent = definition.expressions[state.staticExpression]?.label ?? 'Expression'
    motionStatus.textContent = `Expression preview · ${titleCase(definition.blob.shape)} blob`
  } else {
    previewTitle.textContent = animation.label
    motionStatus.textContent = `${state.done ? 'Complete' : state.playing ? 'Playing' : 'Paused'} · beat ${state.stepIndex + 1}`
  }
  playIcon.textContent = state.playing ? 'Ⅱ' : '▶'
})

stage.addEventListener('pointermove', event => {
  if (!followCursor) return
  const bounds = stage.getBoundingClientRect()
  const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1))
  const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1))
  mascot.setLookTarget({ x, y })
})

stage.addEventListener('pointerleave', () => {
  if (followCursor) mascot.clearLookTarget()
})

renderPanel()
previewCurrentSelection()
