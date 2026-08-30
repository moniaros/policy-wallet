#!/usr/bin/env node
/**
 * Renders the raster brand set from app/icon.svg via headless Chrome:
 * apple-icon.png (180), maskable PWA icons (192/512), favicon.ico (32+16).
 * Maskable variants get 10% extra safe-area padding on the brand ground.
 * Run: node scripts/brand-assets.mjs   (re-run after any icon.svg change)
 */
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync('app/icon.svg', 'utf8')
const page = async (b, html, size) => {
  const p = await (await b.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })).newPage()
  await p.setContent(html)
  const buf = await p.screenshot({ type: 'png' })
  return buf
}
const plain = (size) => `<body style="margin:0">${svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`)}</body>`
// maskable: the icon shrunk to 80% centred on the brand ground, radius removed (the mask supplies shape)
const maskable = (size) => `<body style="margin:0;background:#29685B;display:grid;place-items:center;width:${size}px;height:${size}px">
  <div style="width:${Math.round(size*0.8)}px;height:${Math.round(size*0.8)}px">${svg.replace(/width="512" height="512"/, 'width="100%" height="100%"').replace('rx="112"','rx="0" fill-opacity="0"')}</div></body>`

const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
writeFileSync('app/apple-icon.png', await page(b, plain(180), 180))
writeFileSync('public/icons/icon-192x192.png', await page(b, maskable(192), 192))
writeFileSync('public/icons/icon-512x512.png', await page(b, maskable(512), 512))
writeFileSync('/tmp/fav32.png', await page(b, plain(32), 32))
writeFileSync('/tmp/fav16.png', await page(b, plain(16), 16))
await b.close()
console.log('✓ apple-icon.png 180 · icons 192/512 (maskable) · /tmp/fav{16,32}.png for ICO')
