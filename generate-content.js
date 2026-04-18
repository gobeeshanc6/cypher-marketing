import 'dotenv/config'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { join } from 'path'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

if (!OPENAI_API_KEY || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
  console.error('Set OPENAI_API_KEY, CLOUDFLARE_ACCOUNT_ID, and CLOUDFLARE_API_TOKEN env vars')
  process.exit(1)
}

const NICHE = process.env.NICHE || 'cybersecurity careers'
const BRAND = process.env.BRAND || 'cypherjobs.io'
const OUTPUT_DIR = './output'
const CANVAS_W = 1080
const CANVAS_H = 1920

const FONT_PATH = './fonts/Inter-Bold.ttf'
if (existsSync(FONT_PATH)) {
  GlobalFonts.registerFromPath(FONT_PATH, 'InterBold')
}
const FONT_FAMILY = existsSync(FONT_PATH) ? 'InterBold' : 'sans-serif'

async function generateSlideContent() {
  console.log('Generating slide content with GPT-4o-mini...')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You create viral TikTok slideshow content for the ${NICHE} niche. Output JSON only.`,
        },
        {
          role: 'user',
          content: `Create a TikTok slideshow with 8 slides about ${NICHE}.

Rules:
- Slide 1: Hook - under 10 words, must trigger curiosity or surprise
- Slide 2: Agitate a pain point the audience feels
- Slides 3-7: Value delivery - each slide reveals one insight, tip, or fact. Escalate interest.
- Slide 8: CTA - mention ${BRAND} and "Follow for more"
- Each slide needs an image_prompt for AI image generation (dark, moody, professional aesthetic)
- Image prompts should describe realistic scenes (offices, screens, servers, people working) not abstract art
- Caption should include 3-5 relevant hashtags

Output JSON:
{
  "slides": [
    {
      "lines": [
        {"text": "slide text line 1", "size": 84, "weight": "bold"},
        {"text": "slide text line 2", "size": 64, "weight": "normal"}
      ],
      "image_prompt": "description for AI image generation"
    }
  ],
  "caption": "TikTok caption with hashtags"
}`,
        },
      ],
    }),
  })

  const data = await res.json()
  if (data.error) {
    console.error('OpenAI error:', data.error.message)
    process.exit(1)
  }

  return JSON.parse(data.choices[0].message.content)
}

async function generateImage(prompt, index) {
  console.log(`  Generating image ${index + 1}...`)

  const fullPrompt = `${prompt}. Dark moody lighting, cinematic, high contrast, professional photography, 9:16 portrait orientation`

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        steps: 8,
      }),
    }
  )

  const data = await res.json()

  if (!data.result?.image) {
    console.error(`  Image generation failed for slide ${index + 1}:`, data.errors || 'unknown error')
    return null
  }

  const buffer = Buffer.from(data.result.image, 'base64')
  const imagePath = join(OUTPUT_DIR, `bg_${String(index + 1).padStart(2, '0')}.png`)
  writeFileSync(imagePath, buffer)
  return imagePath
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

async function renderSlide(slide, imagePath, index) {
  const canvas = createCanvas(CANVAS_W, CANVAS_H)
  const ctx = canvas.getContext('2d')

  const img = await loadImage(imagePath)
  const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height)
  const drawW = img.width * scale
  const drawH = img.height * scale
  const offsetX = (CANVAS_W - drawW) / 2
  const offsetY = (CANVAS_H - drawH) / 2
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const PADDING = 80
  const MAX_TEXT_W = CANVAS_W - PADDING * 2
  const totalLines = slide.lines.length
  const startY = CANVAS_H * 0.42

  let currentY = startY
  for (const line of slide.lines) {
    const size = line.size || 64
    const weight = line.weight || 'normal'

    ctx.font = `${weight} ${size}px ${FONT_FAMILY}`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4

    const wrapped = wrapText(ctx, line.text, MAX_TEXT_W)
    const lineHeight = size * 1.3
    for (const l of wrapped) {
      ctx.fillText(l, CANVAS_W / 2, currentY)
      currentY += lineHeight
    }
    currentY += 10
  }

  const outPath = join(OUTPUT_DIR, `slide_${String(index + 1).padStart(2, '0')}.png`)
  writeFileSync(outPath, canvas.toBuffer('image/png'))
  console.log(`  ${outPath}`)
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const content = await generateSlideContent()
  console.log(`\nGenerated ${content.slides.length} slides\n`)

  console.log('Generating background images with FLUX...\n')
  const imagePaths = []
  for (let i = 0; i < content.slides.length; i++) {
    const path = await generateImage(content.slides[i].image_prompt, i)
    imagePaths.push(path)
    if (i < content.slides.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log('\nRendering final slides...\n')
  for (let i = 0; i < content.slides.length; i++) {
    if (imagePaths[i]) {
      await renderSlide(content.slides[i], imagePaths[i], i)
    } else {
      console.error(`  Skipping slide ${i + 1} - no background image`)
    }
  }

  const schedule = [
    {
      slides: content.slides.map((_, i) => `./output/slide_${String(i + 1).padStart(2, '0')}.png`),
      caption: content.caption,
    },
  ]
  writeFileSync('./schedules/week.json', JSON.stringify(schedule, null, 2))

  console.log(`\nDone - ${content.slides.length} slides generated`)
  console.log(`Caption: ${content.caption}`)
}

main().catch(console.error)
