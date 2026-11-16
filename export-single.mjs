import { build } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const result = await build({
  root,
  base: './',
  build: {
    write: false,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: Infinity,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
const outputs = (Array.isArray(result) ? result : [result]).flatMap(r => r.output)
const entry = outputs.find(item => item.fileName === 'index.html')
if (!entry || entry.type !== 'asset') throw new Error('No HTML entry was generated.')
const sourceFor = path => {
  const name = path.replace(/^\.?\//, '')
  const item = outputs.find(output => output.fileName === name)
  if (!item) throw new Error(`Missing build output: ${path}`)
  return item.type === 'chunk' ? item.code : String(item.source)
}
let html = String(entry.source)
html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (_, path) =>
  `<script type="module">${sourceFor(path).replace(/<\/script/gi, '<\\/script')}</script>`)
html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g, tag => {
  const path = tag.match(/\bhref="([^"]+)"/)?.[1]
  if (!path) throw new Error('Stylesheet has no URL.')
  return `<style>${sourceFor(path).replace(/<\/style/gi, '<\\/style')}</style>`
})
const favicon = await readFile(new URL('./public/moon.svg', import.meta.url), 'utf8')
html = html.replace(/<link\b[^>]*\brel="icon"[^>]*>/g,
  `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}" />`)
if (/<script\b[^>]*\bsrc=|<link\b[^>]*\brel="stylesheet"/i.test(html)) {
  throw new Error('The export still contains external scripts or styles.')
}
const destination = new URL('./Smart-Sleep-Companion.html', import.meta.url)
await writeFile(destination, html, 'utf8')
console.log(`单文件已导出：${fileURLToPath(destination)}（${(Buffer.byteLength(html) / 1024).toFixed(1)} KB）`)
