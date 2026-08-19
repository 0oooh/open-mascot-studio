import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const outputDirectory = path.join(root, 'dist', 'server')
const files = [
  ['/', 'examples/web/index.html', 'text/html; charset=utf-8'],
  ['/index.html', 'examples/web/index.html', 'text/html; charset=utf-8'],
  ['/examples/web/demo.js', 'examples/web/demo.js', 'text/javascript; charset=utf-8'],
  ['/examples/web/styles.css', 'examples/web/styles.css', 'text/css; charset=utf-8'],
  ['/examples/web/timeline.js', 'examples/web/timeline.js', 'text/javascript; charset=utf-8'],
  ['/examples/web/vocabulary.js', 'examples/web/vocabulary.js', 'text/javascript; charset=utf-8'],
  ['/packages/open-mascot/src/definition.js', 'packages/open-mascot/src/definition.js', 'text/javascript; charset=utf-8'],
  ['/packages/open-mascot/src/index.js', 'packages/open-mascot/src/index.js', 'text/javascript; charset=utf-8'],
  ['/packages/open-mascot/src/motion.js', 'packages/open-mascot/src/motion.js', 'text/javascript; charset=utf-8'],
  ['/packages/open-mascot/src/scene.js', 'packages/open-mascot/src/scene.js', 'text/javascript; charset=utf-8'],
  ['/packages/open-mascot/src/shapes.js', 'packages/open-mascot/src/shapes.js', 'text/javascript; charset=utf-8'],
  ['/packages/open-mascot/src/web.js', 'packages/open-mascot/src/web.js', 'text/javascript; charset=utf-8'],
]

const assets = {}
for (const [url, source, contentType] of files) {
  assets[url] = {
    body: await readFile(path.join(root, source), 'utf8'),
    contentType,
  }
}

const worker = `const assets = ${JSON.stringify(assets)}

const securityHeaders = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const asset = assets[url.pathname]
    if (!asset) return new Response('Not found', { status: 404, headers: securityHeaders })
    const cacheControl = asset.contentType.startsWith('text/html')
      ? 'no-cache'
      : 'public, max-age=300'
    return new Response(asset.body, {
      headers: {
        ...securityHeaders,
        'Cache-Control': cacheControl,
        'Content-Type': asset.contentType,
      },
    })
  },
}
`

await rm(path.join(root, 'dist'), { recursive: true, force: true })
await mkdir(outputDirectory, { recursive: true })
await writeFile(path.join(outputDirectory, 'index.js'), worker)
console.log(`Built Open Mascot Studio (${files.length} routes).`)
