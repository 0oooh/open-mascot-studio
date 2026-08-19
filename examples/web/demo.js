import {
  cloneDefinition,
  createDefinition,
  listBlobShapes,
  validateDefinition,
} from '/packages/open-mascot/src/index.js'
import { createMascot } from '/packages/open-mascot/src/web.js'

const STORAGE_KEY = 'open-mascot-studio-v1'
const panel = document.querySelector('#panel')
const stage = document.querySelector('#stage-canvas')
const saveState = document.querySelector('#save-state')
const previewTitle = document.querySelector('#preview-title')
const motionStatus = document.querySelector('#motion-status')
const playIcon = document.querySelector('#play-icon')
const toast = document.querySelector('#toast')
const importFile = document.querySelector('#import-file')

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const titleCase = value => value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ')

const createFreshDefinition = () => createDefinition({
  name: 'Mallow',
  shape: 'circle',
  color: '#b986cf',
  eyeColor: '#2e1835',
  stageColor: '#10151d',
})

const loadDefinition = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.face && saved.face.eyeShape == null) saved.face.eyeShape = 'capsule'
    if (validateDefinition(saved).ok) return saved
  } catch {}
  return createFreshDefinition()
}

const query = new URLSearchParams(location.search)
let definition = loadDefinition()
let activeTab = ['design', 'expressions', 'motions', 'api'].includes(query.get('tab'))
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

const updatePerformanceStatus = () => {
  const animation = definition.animations[selectedAnimation]
  previewTitle.textContent = activeTab === 'expressions'
    ? definition.expressions[selectedExpression].label
    : animation.label
  motionStatus.textContent = `${isPlaying ? 'Playing' : 'Paused'} · ${titleCase(definition.blob.shape)} blob`
  playIcon.textContent = isPlaying ? 'Ⅱ' : '▶'
  stage.style.setProperty('--stage', definition.stage.color)
}

const previewCurrentSelection = () => {
  if (activeTab === 'expressions') {
    mascot.setExpression(selectedExpression)
    isPlaying = false
  } else {
    mascot.play(selectedAnimation)
    isPlaying = true
  }
  updatePerformanceStatus()
}

const commitDefinition = () => {
  const result = validateDefinition(definition)
  if (!result.ok) {
    saveState.innerHTML = '<i></i> Finish this field to save'
    return false
  }
  scheduleSave()
  mascot.setDefinition(definition)
  previewCurrentSelection()
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

const renderDesign = () => {
  const shapes = listBlobShapes().map(shape => `
    <button type="button" data-action="select-shape" data-key="${shape}" aria-pressed="${shape === definition.blob.shape}">
      <strong>${titleCase(shape)}</strong>
      <span>${shape === 'circle' ? 'Default primitive' : 'Same motion rig'}</span>
    </button>`).join('')

  return `
    ${panelHeading('Shape the character', 'Tune one stable vector mascot. Every expression and animation inherits these choices.')}
    <section class="render-mode-block">
      <div class="section-title"><h3>Blob primitive</h3><span>Six built-ins</span></div>
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
        ${rangeField({ label: 'Eye width', path: 'face.eyeWidth', value: definition.face.eyeWidth, min: 8, max: 38 })}
        ${rangeField({ label: 'Eye height', path: 'face.eyeHeight', value: definition.face.eyeHeight, min: 10, max: 68 })}
        ${rangeField({ label: 'Eye spacing', path: 'face.eyeGap', value: definition.face.eyeGap, min: 28, max: 100 })}
        ${rangeField({ label: 'Vertical position', path: 'face.eyeY', value: definition.face.eyeY, min: -45, max: 35 })}
      </div>
    </section>
    <section class="section-block">
      <div class="section-title"><h3>Silhouette</h3><span>Motion-safe proportions</span></div>
      <div class="control-grid">
        ${rangeField({ label: 'Blob width', path: 'blob.width', value: definition.blob.width, min: 130, max: 290 })}
        ${rangeField({ label: 'Blob height', path: 'blob.height', value: definition.blob.height, min: 130, max: 290 })}
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
  const chips = Object.entries(definition.expressions).map(([key, item]) => `
    <button class="choice-chip" type="button" data-action="select-expression" data-key="${escapeHtml(key)}" aria-pressed="${key === selectedExpression}">
      ${escapeHtml(item.label)}
    </button>`).join('')

  return `
    ${panelHeading('Direct the expression', 'Pose each eye independently, then add restrained body language. Asymmetry keeps the face feeling alive.')}
    <div class="chip-list">${chips}</div>
    <section class="section-block">
      <div class="section-title"><h3>Selected pose</h3><span>${escapeHtml(selectedExpression)}</span></div>
      <label class="field">
        <span>Expression name</span>
        <input class="text-input" value="${escapeHtml(expression.label)}" data-scope="expression-meta" data-path="label" />
      </label>
    </section>
    <details class="subsection" open>
      <summary>Blob direction</summary>
      <div class="subsection-content control-grid">
        ${poseRange('Horizontal', 'blob.x', -34, 34)}
        ${poseRange('Lift', 'blob.y', -34, 34)}
        ${poseRange('Head tilt', 'blob.rotation', -28, 28)}
        ${poseRange('Width scale', 'blob.scaleX', .7, 1.3, .01)}
        ${poseRange('Height scale', 'blob.scaleY', .7, 1.3, .01)}
      </div>
    </details>
    <details class="subsection" open>
      <summary>Gaze</summary>
      <div class="subsection-content control-grid">
        ${poseRange('Horizontal gaze', 'gaze.x', -18, 18)}
        ${poseRange('Vertical gaze', 'gaze.y', -18, 18)}
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

const renderStep = (step, index) => `
  <div class="step-card">
    <div class="step-heading"><strong>Beat ${index + 1}</strong><span>${escapeHtml(step.expression)}</span></div>
    <div class="control-grid">
      <label class="field">
        <span>Expression</span>
        <select class="select-input" data-scope="step" data-index="${index}" data-path="expression">${expressionOptions(step.expression)}</select>
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
  const chips = Object.entries(definition.animations).map(([key, item]) => `
    <button class="choice-chip" type="button" data-action="select-animation" data-key="${escapeHtml(key)}" aria-pressed="${key === selectedAnimation}">
      ${escapeHtml(item.label)}
    </button>`).join('')

  return `
    ${panelHeading('Compose the motion', 'Sequence expression beats, tune timing, and preview the same motion data used by both renderers.')}
    <div class="chip-list">${chips}</div>
    <section class="section-block">
      <div class="section-title"><h3>Playback</h3><span>${animation.steps.length} beats</span></div>
      <div class="control-grid">
        <label class="field">
          <span>Mode</span>
          <select class="select-input" data-scope="animation" data-path="playback">
            ${optionList([{ value: 'loop', label: 'Loop' }, { value: 'once', label: 'Play once' }], animation.playback)}
          </select>
        </label>
        ${rangeField({ label: 'Ambient motion', path: 'ambient', value: animation.ambient, min: 0, max: 1, step: .01, scope: 'animation' })}
        <label class="check-field">
          <input type="checkbox" data-scope="animation" data-path="blink" ${animation.blink ? 'checked' : ''} />
          Natural blinking
        </label>
      </div>
      <div class="action-row">
        <button class="primary-button" type="button" data-action="play-selected">Play selected motion</button>
      </div>
    </section>
    <section class="section-block">
      <div class="section-title"><h3>Timeline</h3><span>Expression → hold → transition</span></div>
      ${animation.steps.map(renderStep).join('')}
    </section>`
}

const browserInstall = 'npm install open-mascot'
const browserExample = `import { createDefinition } from 'open-mascot'
import { createMascot } from 'open-mascot/web'

const definition = createDefinition({
  shape: '${definition.blob.shape}',
  color: '${definition.blob.color}',
})

const mascot = createMascot('#mascot', {
  definition,
  animation: '${selectedAnimation}',
})`
const nativeInstall = 'npm install open-mascot open-mascot-react-native react-native-svg'
const nativeExample = `import { createDefinition } from 'open-mascot'
import { OpenMascot } from 'open-mascot-react-native'

const definition = createDefinition({ shape: '${definition.blob.shape}' })

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

const renderApi = () => `
  ${panelHeading('Ship the character', 'The studio edits the same portable JSON definition consumed by the browser and React Native packages.')}
  <div class="info-note purple">Both renderers share blob geometry, expressions, animation timing, ambient motion, and the versioned definition schema.</div>
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
  const renders = { design: renderDesign, expressions: renderExpressions, motions: renderMotions, api: renderApi }
  panel.innerHTML = renders[activeTab]()
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.setAttribute('aria-selected', String(button.dataset.tab === activeTab))
  })
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

const exportDefinition = () => {
  const blob = new Blob([`${JSON.stringify(definition, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${definition.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'mascot'}.mascot.json`
  link.click()
  URL.revokeObjectURL(url)
  showToast('Definition exported')
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
    definition = createFreshDefinition()
    selectedExpression = Object.keys(definition.expressions)[0]
    selectedAnimation = Object.keys(definition.animations)[0]
    commitDefinition()
    renderPanel()
    showToast('Studio reset')
  }
  if (action === 'export-json') exportDefinition()
  if (action === 'import-json') importFile.click()
  if (action === 'copy-code') copyCode(trigger.dataset.target)
  if (action === 'select-shape') {
    const shapeDefinition = createDefinition({ shape: trigger.dataset.key })
    definition.blob.shape = trigger.dataset.key
    definition.blob.width = shapeDefinition.blob.width
    definition.blob.height = shapeDefinition.blob.height
    commitDefinition()
    renderPanel()
  }
  if (action === 'select-eye-shape') {
    definition.face.eyeShape = trigger.dataset.key
    commitDefinition()
    renderPanel()
  }
  if (action === 'select-expression') {
    selectedExpression = trigger.dataset.key
    renderPanel()
    mascot.setExpression(selectedExpression)
    isPlaying = false
    updatePerformanceStatus()
  }
  if (action === 'select-animation') {
    selectedAnimation = trigger.dataset.key
    renderPanel()
    mascot.play(selectedAnimation)
    isPlaying = true
    updatePerformanceStatus()
  }
  if (action === 'play-selected') {
    mascot.play(selectedAnimation)
    isPlaying = true
    updatePerformanceStatus()
  }
  if (action === 'previous-motion' || action === 'next-motion') {
    const keys = Object.keys(definition.animations)
    const current = keys.indexOf(selectedAnimation)
    const delta = action === 'previous-motion' ? -1 : 1
    selectedAnimation = keys[(current + delta + keys.length) % keys.length]
    mascot.play(selectedAnimation)
    isPlaying = true
    renderPanel()
  }
  if (action === 'toggle-play') {
    if (isPlaying) mascot.pause()
    else mascot.resume()
    isPlaying = !isPlaying
    updatePerformanceStatus()
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
  if (event.target.matches('select[data-scope="step"]')) renderPanel()
})

importFile.addEventListener('change', async () => {
  const [file] = importFile.files
  if (!file) return
  try {
    const next = JSON.parse(await file.text())
    const result = validateDefinition(next)
    if (!result.ok) throw new Error(result.errors.join(' '))
    definition = cloneDefinition(next)
    selectedExpression = Object.keys(definition.expressions)[0]
    selectedAnimation = Object.keys(definition.animations)[0]
    commitDefinition()
    renderPanel()
    showToast('Definition imported')
  } catch (error) {
    showToast(error.message || 'Could not import that file')
  } finally {
    importFile.value = ''
  }
})

renderPanel()
previewCurrentSelection()
