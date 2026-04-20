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

const PLATFORMS = {
  tiktok:    { w: 1080, h: 1920 },
  instagram: { w: 1080, h: 1350 },
  linkedin:  { w: 1080, h: 1080 },
}

const POST_HOURS_UTC = {
  tiktok: 23,
  instagram: 17,
  linkedin: 15,
}

const FONT_PATH = './fonts/Inter-Bold.ttf'
if (existsSync(FONT_PATH)) {
  GlobalFonts.registerFromPath(FONT_PATH, 'InterBold')
}
const FONT_FAMILY = existsSync(FONT_PATH) ? 'InterBold' : 'sans-serif'

const PILLARS = [
  { name: 'career-advice', desc: 'breaking into cybersecurity, levelling up, career transitions, first job tips' },
  { name: 'certs', desc: 'certification comparisons (CISSP vs CEH vs CompTIA), which certs matter, study tips, ROI of certs' },
  { name: 'job-market', desc: 'hiring trends, salary ranges by role, in-demand skills, job market stats and data' },
  { name: 'specialism-spotlight', desc: 'deep dive into one role: pentesting, GRC, threat intel, SOC analyst, cloud security, incident response' },
  { name: 'tools-and-skills', desc: 'technical skills employers want, tools to learn, programming languages for security, hands-on labs' },
  { name: 'myth-busting', desc: 'debunking myths: "you need a CS degree", "hacking is illegal", "cybersecurity is only for techies"' },
  { name: 'community', desc: 'networking tips, conferences, communities to join, mentorship, share your story prompts' },
]

const HOOK_STYLES = [
  'a surprising statistic or number',
  'a counterintuitive claim that challenges assumptions',
  'a direct question to the audience',
  'a bold controversial opinion',
  'a "stop doing X" warning',
  'a "nobody talks about X" reveal',
  'a salary or money figure',
  'a "X things you need to know" list tease',
]

const POSTED_PATH = './content/posted.json'

function getPostedHistory() {
  if (!existsSync(POSTED_PATH)) return []
  return JSON.parse(readFileSync(POSTED_PATH, 'utf-8'))
}

function savePostedEntry(entry) {
  const history = getPostedHistory()
  history.push(entry)
  mkdirSync('./content', { recursive: true })
  writeFileSync(POSTED_PATH, JSON.stringify(history, null, 2))
}

function getTodaysPillar() {
  const history = getPostedHistory()
  const usedPillars = history.slice(-PILLARS.length).map(h => h.pillar)
  for (const pillar of PILLARS) {
    if (!usedPillars.includes(pillar.name)) return pillar
  }
  const lastPillar = history.length > 0 ? history[history.length - 1].pillar : null
  const lastIndex = PILLARS.findIndex(p => p.name === lastPillar)
  return PILLARS[(lastIndex + 1) % PILLARS.length]
}

function getTodaysHookStyle() {
  const history = getPostedHistory()
  const usedHooks = history.slice(-HOOK_STYLES.length).map(h => h.hookStyle)
  const available = HOOK_STYLES.filter(h => !usedHooks.includes(h))
  if (available.length === 0) return HOOK_STYLES[Math.floor(Math.random() * HOOK_STYLES.length)]
  return available[Math.floor(Math.random() * available.length)]
}

function getRecentTopicsSummary() {
  const history = getPostedHistory().slice(-7)
  if (history.length === 0) return ''
  const lines = history.map(h => `- [${h.pillar}] "${h.hook}"`)
  return `\n\nIMPORTANT - These topics were posted recently. Do NOT repeat or closely resemble any of them:\n${lines.join('\n')}`
}

async function generateSlideContent() {
  const pillar = getTodaysPillar()
  const hookStyle = getTodaysHookStyle()
  const recentTopics = getRecentTopicsSummary()

  console.log(`Content pillar: ${pillar.name}`)
  console.log(`Hook style: ${hookStyle}`)
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
          content: `You create viral TikTok slideshow content for the ${NICHE} niche. Style: warm, cozy, approachable - like a friend giving career advice over coffee. NOT dark/hacker aesthetic. Output JSON only.`,
        },
        {
          role: 'user',
          content: `Create a TikTok slideshow with 8 slides about ${NICHE}.

TODAY'S CONTENT PILLAR: "${pillar.name}" - ${pillar.desc}
Focus the entire post on this specific topic area. Be specific and actionable, not generic.

HOOK STYLE: The first slide must open with ${hookStyle}. Make it scroll-stopping.
${recentTopics}

Visual style: warm lifestyle aesthetic (think cozy desk setups, coffee shops, laptops with warm lighting). Each slide has a bold title with ONE highlighted keyword, an optional subtitle in parentheses, and bullet points for detail slides.

Slide structure:
- Slide 1 (hook): Bold title with one highlighted keyword. Under 10 words, trigger curiosity.
- Slide 2 (agitate): Pain point the audience feels. Title + subtitle.
- Slides 3-7 (value): Each has a title with highlighted keyword + 3-5 bullet points with actionable tips.
- Slide 8 (CTA): Mention ${BRAND} and "Follow for more"

Image prompts should describe WARM, COZY scenes: coffee cups on wooden desks, laptop screens with warm lighting, person coding at a cozy workspace, bookshelves with tech books, warm afternoon light through windows. NO dark/moody/neon. Think lifestyle photography.

Output JSON:
{
  "slides": [
    {
      "title": "main title text",
      "highlight": "one keyword from the title to highlight in a colored box",
      "subtitle": "optional parenthetical subtitle or null",
      "bullets": ["bullet point 1", "bullet point 2"] or null for hook/CTA slides,
      "image_prompt": "warm cozy lifestyle scene description"
    }
  ],
  "caption": "TikTok caption with 3-5 hashtags"
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

  const content = JSON.parse(data.choices[0].message.content)

  for (const slide of content.slides) {
    const match = slide.title?.match(/\*{1,2}(.+?)\*{1,2}/)
    if (match) {
      if (!slide.highlight) slide.highlight = match[1]
      slide.title = slide.title.replace(/\*+/g, '')
    }
  }

  return { content, pillar: pillar.name, hookStyle }
}

async function generateImage(prompt, index) {
  console.log(`  Generating image ${index + 1}...`)

  const fullPrompt = `${prompt}. Warm golden hour lighting, cozy atmosphere, soft bokeh background, lifestyle photography, 9:16 portrait orientation, shallow depth of field`

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

const COLORS = {
  overlay: 'rgba(30, 20, 15, 0.45)',
  highlight: '#D4845A',
  highlightText: '#FFFFFF',
  title: '#FFFFFF',
  subtitle: 'rgba(255, 255, 255, 0.85)',
  bullet: 'rgba(255, 255, 255, 0.9)',
  bulletDot: '#D4845A',
  watermark: 'rgba(255, 255, 255, 0.7)',
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

function drawTitleWithHighlight(ctx, title, highlight, y, maxWidth) {
  const TITLE_SIZE = 72
  const PADDING_X = 80

  ctx.font = `bold ${TITLE_SIZE}px ${FONT_FAMILY}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  if (!highlight) {
    ctx.fillStyle = COLORS.title
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 3
    const wrapped = wrapText(ctx, title, maxWidth)
    let cy = y
    for (const line of wrapped) {
      ctx.fillText(line, PADDING_X, cy)
      cy += TITLE_SIZE * 1.35
    }
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    return cy + 10
  }

  const hlLower = highlight.toLowerCase()
  const hlWords = new Set(hlLower.split(' '))
  const allWords = title.split(' ')

  let cx = PADDING_X
  let cy = y

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3

  for (const word of allWords) {
    ctx.font = `bold ${TITLE_SIZE}px ${FONT_FAMILY}`
    const wordWidth = ctx.measureText(word).width
    const spaceWidth = ctx.measureText(' ').width

    if (cx + wordWidth > PADDING_X + maxWidth && cx > PADDING_X) {
      cx = PADDING_X
      cy += TITLE_SIZE * 1.4
    }

    if (hlWords.has(word.toLowerCase())) {
      const padX = 14
      const padY = 8
      const boxW = wordWidth + padX * 2
      const boxH = TITLE_SIZE + padY * 2

      ctx.fillStyle = COLORS.highlight
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      drawRoundedRect(ctx, cx - padX, cy - padY + 2, boxW, boxH, 14)

      ctx.fillStyle = COLORS.highlightText
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetY = 2
      ctx.fillText(word, cx, cy)

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 3
    } else {
      ctx.fillStyle = COLORS.title
      ctx.fillText(word, cx, cy)
    }

    cx += wordWidth + spaceWidth
  }

  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  return cy + TITLE_SIZE * 1.5 + 10
}

async function renderSlide(slide, imagePath, index, totalSlides, platform, dims) {
  const W = dims.w
  const H = dims.h
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  const img = await loadImage(imagePath)
  const scale = Math.max(W / img.width, H / img.height)
  const drawW = img.width * scale
  const drawH = img.height * scale
  const offsetX = (W - drawW) / 2
  const offsetY = (H - drawH) / 2
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH)

  ctx.fillStyle = COLORS.overlay
  ctx.fillRect(0, 0, W, H)

  const gradient = ctx.createLinearGradient(0, H * 0.3, 0, H)
  gradient.addColorStop(0, 'rgba(20, 12, 8, 0)')
  gradient.addColorStop(0.5, 'rgba(20, 12, 8, 0.4)')
  gradient.addColorStop(1, 'rgba(20, 12, 8, 0.75)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)

  ctx.font = `bold 28px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.watermark
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  ctx.fillText(`@${BRAND.replace('.io', '')}`, 60, 60)
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  const PADDING = 80
  const MAX_TEXT_W = W - PADDING * 2
  const hasBullets = slide.bullets && slide.bullets.length > 0
  const startY = hasBullets ? H * 0.22 : H * 0.35

  let currentY = drawTitleWithHighlight(ctx, slide.title || '', slide.highlight, startY, MAX_TEXT_W)

  if (slide.subtitle) {
    ctx.font = `normal 44px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.subtitle
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 2
    const subText = `(${slide.subtitle.replace(/^\(|\)$/g, '')})`
    const wrapped = wrapText(ctx, subText, MAX_TEXT_W)
    for (const line of wrapped) {
      ctx.fillText(line, PADDING, currentY)
      currentY += 44 * 1.3
    }
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    currentY += 20
  }

  if (hasBullets) {
    const BULLET_SIZE = 36
    const DOT_RADIUS = 7
    currentY += 10

    for (const bullet of slide.bullets) {
      ctx.fillStyle = COLORS.bulletDot
      ctx.beginPath()
      ctx.arc(PADDING + DOT_RADIUS, currentY + BULLET_SIZE * 0.55, DOT_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = `normal ${BULLET_SIZE}px ${FONT_FAMILY}`
      ctx.fillStyle = COLORS.bullet
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetY = 2

      const bulletX = PADDING + DOT_RADIUS * 2 + 16
      const wrapped = wrapText(ctx, bullet, MAX_TEXT_W - DOT_RADIUS * 2 - 16)
      for (const line of wrapped) {
        ctx.fillText(line, bulletX, currentY)
        currentY += BULLET_SIZE * 1.4
      }
      currentY += 8
    }
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  }

  const dotCount = totalSlides || 8
  const dotRadius = 5
  const dotSpacing = 22
  const dotsWidth = (dotCount - 1) * dotSpacing
  const dotsStartX = (W - dotsWidth) / 2
  const dotsY = H - 80

  for (let i = 0; i < dotCount; i++) {
    ctx.beginPath()
    ctx.arc(dotsStartX + i * dotSpacing, dotsY, dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = i === index ? '#FFFFFF' : 'rgba(255, 255, 255, 0.35)'
    ctx.fill()
  }

  const platformDir = join(OUTPUT_DIR, platform)
  const outPath = join(platformDir, `slide_${String(index + 1).padStart(2, '0')}.png`)
  writeFileSync(outPath, canvas.toBuffer('image/png'))
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  for (const platform of Object.keys(PLATFORMS)) {
    mkdirSync(join(OUTPUT_DIR, platform), { recursive: true })
  }

  const { content, pillar, hookStyle } = await generateSlideContent()
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

  console.log('\nRendering slides for all platforms...\n')
  for (const [platform, dims] of Object.entries(PLATFORMS)) {
    console.log(`  ${platform} (${dims.w}x${dims.h}):`)
    for (let i = 0; i < content.slides.length; i++) {
      if (imagePaths[i]) {
        await renderSlide(content.slides[i], imagePaths[i], i, content.slides.length, platform, dims)
      } else {
        console.error(`    Skipping slide ${i + 1} - no background image`)
      }
    }
    console.log(`    ${content.slides.length} slides`)
  }

  const MAX_SLIDES = { linkedin: 4 }

  mkdirSync('./schedules', { recursive: true })
  const now = new Date()
  for (const platform of Object.keys(PLATFORMS)) {
    const scheduledAt = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      POST_HOURS_UTC[platform],
      0,
      0,
    )).toISOString()
    const allSlides = content.slides.map((_, i) => `./output/${platform}/slide_${String(i + 1).padStart(2, '0')}.png`)
    const max = MAX_SLIDES[platform]
    const selectedSlides = max && allSlides.length > max
      ? [allSlides[0], ...allSlides.slice(1, -1).filter((_, i) => i % Math.ceil((allSlides.length - 2) / (max - 2)) === 0).slice(0, max - 2), allSlides[allSlides.length - 1]]
      : allSlides
    const schedule = [
      {
        slides: selectedSlides,
        caption: content.caption,
        scheduledAt,
      },
    ]
    writeFileSync(`./schedules/${platform}.json`, JSON.stringify(schedule, null, 2))
  }

  savePostedEntry({
    date: new Date().toISOString().split('T')[0],
    pillar,
    hookStyle,
    hook: content.slides[0]?.title || '',
    caption: content.caption,
  })

  console.log(`\nDone - ${content.slides.length} slides x ${Object.keys(PLATFORMS).length} platforms`)
  console.log(`Pillar: ${pillar} | Hook: ${hookStyle}`)
  console.log(`Caption: ${content.caption}`)
}

main().catch(console.error)
