import { createDefinition, listBlobShapes } from '/packages/open-mascot/src/index.js'
import { createMascot } from '/packages/open-mascot/src/web.js'

const colors = {
  circle: '#6fcf97',
  oval: '#78a9ff',
  capsule: '#ff9a76',
  bean: '#a990e8',
  drop: '#64c7d0',
  'rounded-square': '#f2c45e',
}

const shapeList = document.querySelector('#shape-list')
const animationSelect = document.querySelector('#animation')
const shapeName = document.querySelector('#shape-name')
const definitionCode = document.querySelector('#definition-code')
const shapes = listBlobShapes()
const requestedShape = new URLSearchParams(location.search).get('shape')
let selectedShape = shapes.includes(requestedShape) ? requestedShape : 'circle'
let definition = createDefinition({ shape: selectedShape, color: colors[selectedShape] })
const mascot = createMascot('#mascot', { definition, animation: animationSelect.value })

const label = value => value.replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase())

const renderSelection = () => {
  shapeList.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.shape === selectedShape))
  })
  shapeName.textContent = label(selectedShape)
  definitionCode.textContent = `{ shape: '${selectedShape}' }`
}

for (const shape of shapes) {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.shape = shape
  button.textContent = label(shape)
  button.addEventListener('click', () => {
    selectedShape = shape
    definition = createDefinition({ shape, color: colors[shape] })
    mascot.setDefinition(definition).play(animationSelect.value)
    renderSelection()
  })
  shapeList.append(button)
}

animationSelect.addEventListener('change', () => mascot.play(animationSelect.value))
renderSelection()
