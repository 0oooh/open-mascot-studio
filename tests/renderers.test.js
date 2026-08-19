import assert from 'node:assert/strict'
import test from 'node:test'
import { buildScene, createDefinition, sampleAnimation } from '../packages/open-mascot/src/index.js'
import { renderSceneToSvgString } from '../packages/open-mascot/src/web.js'
import { renderNativeScene } from '../packages/open-mascot-react-native/src/native-elements.js'

const sceneFor = shape => {
  const definition = createDefinition({ shape })
  return buildScene(definition, sampleAnimation(definition, 'idle', 900).pose)
}

test('the browser renderer produces a complete standalone SVG', () => {
  const svg = renderSceneToSvgString(sceneFor('bean'), { label: 'Bean & friend' })
  assert.match(svg, /^<svg xmlns=/)
  assert.match(svg, /aria-label="Bean &amp; friend"/)
  assert.match(svg, /<path d="M /)
  assert.equal((svg.match(/<ellipse/g) ?? []).length, 1)
  assert.equal((svg.match(/<path/g) ?? []).length, 3)
  assert.match(svg, /<\/svg>$/)
})

test('the React Native adapter renders the same scene through injected primitives', () => {
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props ?? {}, children }
    },
  }
  const primitives = {
    Svg: 'Svg',
    G: 'G',
    Path: 'Path',
    Ellipse: 'Ellipse',
    Rect: 'Rect',
  }
  const scene = sceneFor('drop')
  const tree = renderNativeScene(React, primitives, scene, {
    width: 320,
    height: 240,
    accessibilityLabel: 'Drop mascot',
  })
  assert.equal(tree.type, 'Svg')
  assert.equal(tree.props.width, 320)
  assert.equal(tree.props.accessibilityLabel, 'Drop mascot')
  assert.equal(tree.children[0].type, 'Rect')
  assert.equal(tree.children[2].type, 'G')
  assert.equal(tree.children[2].children[0].type, 'Path')
  assert.equal(tree.children[2].children[0].props.d, scene.blob.path)
})
