/**
 * Generates the committed, anonymized Greek PDF fixtures for the ingestion test suite:
 *   - tests/fixtures/policy-text-layer-el.pdf : real text layer (pdfjs extracts Greek)
 *   - tests/fixtures/policy-scanned-el.pdf    : image-only (no text layer → OCR path)
 * Both contain €50.000-style amounts and dd/mm/yyyy dates.
 *
 * Dev tool only (run once; output is committed). Embeds a system Greek font (Arial);
 * the font path is Windows-specific and irrelevant to CI, which uses the committed PDFs.
 */
import { readFile, writeFile, mkdir } from "fs/promises"
import path from "path"
import { PDFDocument, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import { createCanvas, GlobalFonts } from "@napi-rs/canvas"

const FONT_PATH = "C:/Windows/Fonts/arial.ttf"
const OUT_DIR = path.join(process.cwd(), "tests/fixtures")

const TEXT_LAYER_LINES = [
  ["ΑΣΦΑΛΕΙΕΣ ΠΑΡΑΔΕΙΓΜΑ Α.Ε.", 16],
  ["Αριθμός Συμβολαίου: TEST-2026-0001", 12],
  ["Διάρκεια ασφάλισης από 01/01/2026 έως 31/12/2026", 12],
  ["Συνολικό Ασφάλιστρο: €450,00", 12],
  ["", 12],
  ["Πίνακας Καλύψεων", 14],
  ["Αστική Ευθύνη €50.000", 12],
  ["Πυρκαγιά €50.000", 12],
  ["Κλοπή €30.000", 12],
]

const SCANNED_LINES = [
  ["ΑΣΦΑΛΕΙΕΣ ΠΑΡΑΔΕΙΓΜΑ Α.Ε.", 34],
  ["Αριθμός Συμβολαίου: TEST-2026-0002", 24],
  ["Διάρκεια ασφάλισης από 15/03/2026 έως 14/03/2027", 24],
  ["Συνολικό Ασφάλιστρο: €600,00", 24],
  ["", 24],
  ["Πίνακας Καλύψεων", 30],
  ["Αστική Ευθύνη €50.000", 24],
  ["Πυρκαγιά €40.000", 24],
]

async function makeTextLayer() {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(await readFile(FONT_PATH), { subset: true })
  const page = doc.addPage([595, 842])
  let y = 800
  for (const [text, size] of TEXT_LAYER_LINES) {
    if (text) page.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) })
    y -= size + 10
  }
  await writeFile(path.join(OUT_DIR, "policy-text-layer-el.pdf"), await doc.save())
}

async function makeScanned() {
  GlobalFonts.registerFromPath(FONT_PATH, "Arial")
  const W = 1240, H = 1754 // ~A4 @150dpi
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = "#111111"
  let y = 90
  for (const [text, size] of SCANNED_LINES) {
    if (text) {
      ctx.font = `${size}px Arial`
      ctx.fillText(text, 70, y)
    }
    y += size + 22
  }
  const png = canvas.toBuffer("image/png")
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const img = await doc.embedPng(png)
  page.drawImage(img, { x: 0, y: 0, width: 595, height: 842 })
  await writeFile(path.join(OUT_DIR, "policy-scanned-el.pdf"), await doc.save())
}

await mkdir(OUT_DIR, { recursive: true })
await makeTextLayer()
await makeScanned()
console.log("[fixtures] wrote policy-text-layer-el.pdf + policy-scanned-el.pdf")
