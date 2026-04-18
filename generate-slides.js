import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const OUTPUT_DIR = './output'
const CANVAS_W = 1080
const CANVAS_H = 1920
const OVERLAY_OPACITY = 0.55
const OVERLAY_COLOR = '0, 0, 0'

// Load custom font if available
const FONT_PATH = './fonts/Inter-Bold.ttf'
if (existsSync(FONT_PATH)) {
  GlobalFonts.registerFromPath(FONT_PATH, 'InterBold')
}

const FONT_FAMILY = existsSync(FONT_PATH) ? 'InterBold' : 'sans-serif'

// Load slides from config file or use inline defaults
let slides
const CONFIG_PATH = './slides-config.json'

if (existsSync(CONFIG_PATH)) {
  slides = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
} else {
  slides = [
    {
      imagePath: './images/cybersecurity/slide_01.jpg',
      lines: [
        { text: '5 cyber roles that', size: 84, weight: 'bold', y: 820 },
        { text: "don't need a degree", size: 84, weight: 'bold', y: 920 },
      ],
    },
    {
      imagePath: './images/cybersecurity/slide_02.jpg',
      lines: [
        { text: 'Most people think', size: 64, weight: 'normal', y: 780 },
        { text: 'you need a CS degree', size: 64, weight: 'bold', y: 870 },
        { text: 'to break into cyber.', size: 64, weight: 'normal', y: 960 },
        { text: "Here's why that's wrong.", size: 56, weight: 'bold', y: 1060 },
      ],
    },
    {
      imagePath: './images/cybersecurity/slide_03.jpg',
      lines: [
        { text: '01. SOC Analyst', size: 72, weight: 'bold', y: 840 },
        { text: '$55-75k entry', size: 56, weight: 'normal', y: 940 },
        { text: 'CompTIA Security+ is enough', size: 48, weight: 'normal', y: 1020 },
      ],
    },
    {
      imagePath: './images/cybersecurity/slide_04.jpg',
      lines: [
        { text: '02. Penetration Tester', size: 72, weight: 'bold', y: 840 },
        { text: '$70-90k entry', size: 56, weight: 'normal', y: 940 },
        { text: 'OSCP + home lab experience', size: 48, weight: 'normal', y: 1020 },
      ],
    },
    {
      imagePath: './images/cybersecurity/slide_05.jpg',
      lines: [
        { text: '03. GRC Analyst', size: 72, weight: 'bold', y: 840 },
        { text: '$60-80k entry', size: 56, weight: 'normal', y: 940 },
        { text: 'No coding required', size: 48, weight: 'normal', y: 1020 },
      ],
    },
    {
      imagePath: './images/cybersecurity/slide_06.jpg',
      lines: [
        { text: '04. Cloud Security Engineer', size: 64, weight: 'bold', y: 840 },
        { text: '$80-110k entry', size: 56, weight: 'normal', y: 940 },
        { text: 'AWS or Azure certs', size: 48, weight: 'normal', y: 1020 },
      ],
    },
    {
      imagePath: './images/cybersecurity/slide_07.jpg',
      lines: [
        { text: '05. Incident Responder', size: 72, weight: 'bold', y: 840 },
        { text: '$65-85k entry', size: 56, weight: 'normal', y: 940 },
        { text: 'Thrives under pressure', size: 48, weight: 'normal', y: 1020 },
      ],
    },
    {
      imagePath: './images/cybersecurity/slide_08.jpg',
      lines: [
        { text: 'Find these roles now', size: 76, weight: 'bold', y: 800 },
        { text: 'cypherjobs.io', size: 72, weight: 'bold', y: 920 },
        { text: 'Follow for more cyber careers', size: 48, weight: 'normal', y: 1030 },
      ],
    },
  ]
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

async function generateSlide(slide, index) {
  const canvas = createCanvas(CANVAS_W, CANVAS_H)
  const ctx = canvas.getContext('2d')

  const img = await loadImage(slide.imagePath)
  const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height)
  const drawW = img.width * scale
  const drawH = img.height * scale
  const offsetX = (CANVAS_W - drawW) / 2
  const offsetY = (CANVAS_H - drawH) / 2
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH)

  ctx.fillStyle = `rgba(${OVERLAY_COLOR}, ${OVERLAY_OPACITY})`
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const PADDING = 80
  const MAX_TEXT_W = CANVAS_W - PADDING * 2

  for (const line of slide.lines) {
    ctx.font = `${line.weight} ${line.size}px ${FONT_FAMILY}`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4

    const wrapped = wrapText(ctx, line.text, MAX_TEXT_W)
    const lineHeight = line.size * 1.2
    wrapped.forEach((l, i) => {
      ctx.fillText(l, CANVAS_W / 2, line.y + i * lineHeight)
    })
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  const outPath = join(OUTPUT_DIR, `slide_${String(index + 1).padStart(2, '0')}.png`)
  const buffer = canvas.toBuffer('image/png')
  writeFileSync(outPath, buffer)
  console.log(`  ${outPath}`)
}

async function main() {
  console.log(`Generating ${slides.length} slides...\n`)
  for (let i = 0; i < slides.length; i++) {
    await generateSlide(slides[i], i)
  }
  console.log(`\nDone - ${slides.length} slides in ${OUTPUT_DIR}/`)
}

main().catch(console.error)
