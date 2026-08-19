import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const roots = ['packages', 'scripts', 'tests', 'examples']
const walk = async directory => {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const item = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(item))
    else files.push(item)
  }
  return files
}

const files = []
for (const root of roots) {
  try {
    files.push(...await walk(root))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

const scripts = files.filter(file => /\.(?:js|mjs)$/.test(file))
for (const file of scripts) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status ?? 1)
  }
}

const corePackage = JSON.parse(await readFile('packages/open-mascot/package.json', 'utf8'))
if (corePackage.dependencies && Object.keys(corePackage.dependencies).length) {
  throw new Error('open-mascot must remain dependency-free.')
}

console.log(`Project check passed (${scripts.length} JavaScript modules).`)
