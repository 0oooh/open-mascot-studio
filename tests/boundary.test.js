import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const packageRoot = path.resolve('packages')

const walk = async directory => {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(item))
    else files.push(item)
  }
  return files
}

test('published packages remain MIT-only', async () => {
  const files = await walk(packageRoot)
  const manifests = files.filter(file => file.endsWith('package.json'))
  assert.equal(manifests.length, 2)
  for (const file of manifests) {
    const manifest = JSON.parse(await readFile(file, 'utf8'))
    assert.equal(manifest.license, 'MIT')
  }
})
