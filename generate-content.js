import 'dotenv/config'
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs'
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { join } from 'path'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.error('Set OPENAI_API_KEY env var')
  process.exit(1)
}

const NICHE = process.env.NICHE || 'cybersecurity careers'
const BRAND = process.env.BRAND || 'cypherjobs.io'
const HANDLE = BRAND.replace('.io', '')
const OUTPUT_DIR = './output'
const STOCK_DIR = './images/stock'

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

const FONT_BOLD_PATH = './fonts/Inter-Bold.ttf'
const FONT_REGULAR_PATH = './fonts/Inter-Regular.ttf'
if (existsSync(FONT_BOLD_PATH)) GlobalFonts.registerFromPath(FONT_BOLD_PATH, 'InterBold')
if (existsSync(FONT_REGULAR_PATH)) GlobalFonts.registerFromPath(FONT_REGULAR_PATH, 'InterRegular')
const FONT_BOLD = existsSync(FONT_BOLD_PATH) ? 'InterBold' : 'sans-serif'
const FONT_REGULAR = existsSync(FONT_REGULAR_PATH) ? 'InterRegular' : 'sans-serif'

const COLORS = {
  overlay: 'rgba(20, 15, 10, 0.30)',
  gradientStart: 'rgba(20, 12, 8, 0)',
  gradientMid: 'rgba(20, 12, 8, 0.35)',
  gradientEnd: 'rgba(20, 12, 8, 0.65)',
  highlight: '#C4956A',
  highlightText: '#FFFFFF',
  title: '#FFFFFF',
  subtitle: 'rgba(255, 255, 255, 0.80)',
  bullet: 'rgba(255, 255, 255, 0.85)',
  bulletDot: '#C4956A',
  watermark: 'rgba(255, 255, 255, 0.60)',
}

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
  return `\n\nDo NOT repeat or closely resemble these recent topics:\n${lines.join('\n')}`
}

function pickStockPhotos(count) {
  const allPhotos = readdirSync(STOCK_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  const history = getPostedHistory()
  const recentPhotos = new Set(history.slice(-allPhotos.length).flatMap(h => h.photos || []))
  const unused = allPhotos.filter(p => !recentPhotos.has(p))
  const pool = unused.length >= count ? unused : allPhotos
  const shuffled = pool.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(f => join(STOCK_DIR, f))
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
          content: `You create short, casual TikTok slideshow content for the ${NICHE} niche. Tone: like a friend giving advice over coffee. Direct, warm, no corporate speak. Output JSON only.`,
        },
        {
          role: 'user',
          content: `Create a TikTok post with 1-2 slides about ${NICHE}.

CONTENT PILLAR: "${pillar.name}" - ${pillar.desc}

HOOK STYLE: Open with ${hookStyle}. Make it scroll-stopping.
${recentTopics}

Format:
- Slide 1: A bold, short title (under 8 words). One keyword to highlight. Optional short subtitle.
- Slide 2 (optional, only if the topic needs tips/steps): 3-5 short bullet points. No title needed.

Good title examples: "How to build a career in tech", "Code daily (even 30-60 minutes)", "Build REAL projects", "Pick ONE clear tech direction", "Prepare specifically for interviews"

Use plain hyphens (-) instead of em dashes. Keep everything casual and direct.

Output JSON:
{
  "slides": [
    {
      "title": "short punchy title",
      "highlight": "ONE keyword from the title",
      "subtitle": "optional short subtitle or null",
      "bullets": null
    }
  ],
  "caption": "short caption with 3-5 hashtags"
}

If adding a second slide with bullets:
{
  "slides": [
    { "title": "...", "highlight": "...", "subtitle": "...", "bullets": null },
    { "title": null, "highlight": null, "subtitle": null, "bullets": ["tip 1", "tip 2", "tip 3"] }
  ],
  "caption": "..."
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

async function renderSlide(slide, imagePath, platform, dims, index) {
  const W = dims.w
  const H = dims.h
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  const img = await loadImage(imagePath)
  const scale = Math.max(W / img.width, H / img.height)
  const drawW = img.width * scale
  const drawH = img.height * scale
  ctx.drawImage(img, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH)

  ctx.fillStyle = COLORS.overlay
  ctx.fillRect(0, 0, W, H)

  const gradient = ctx.createLinearGradient(0, H * 0.3, 0, H)
  gradient.addColorStop(0, COLORS.gradientStart)
  gradient.addColorStop(0.5, COLORS.gradientMid)
  gradient.addColorStop(1, COLORS.gradientEnd)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)

  const PAD = 70
  const MAX_W = W - PAD * 2

  ctx.font = `600 26px ${FONT_BOLD}`
  ctx.fillStyle = COLORS.watermark
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(`@${HANDLE}`, PAD, 55)

  const hasBullets = slide.bullets && slide.bullets.length > 0
  const hasTitle = slide.title && slide.title.trim().length > 0
  let currentY = hasBullets && !hasTitle ? H * 0.18 : H * 0.35

  if (hasTitle) {
    const TITLE_SIZE = 68
    ctx.font = `bold ${TITLE_SIZE}px ${FONT_BOLD}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const hlWord = slide.highlight?.toLowerCase()
    const words = slide.title.split(' ')

    let cx = PAD
    let cy = currentY

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 3

    for (const word of words) {
      ctx.font = `bold ${TITLE_SIZE}px ${FONT_BOLD}`
      const wordW = ctx.measureText(word).width
      const spaceW = ctx.measureText(' ').width

      if (cx + wordW > PAD + MAX_W && cx > PAD) {
        cx = PAD
        cy += TITLE_SIZE * 1.4
      }

      if (hlWord && word.toLowerCase().replace(/[^a-z]/g, '') === hlWord.toLowerCase().replace(/[^a-z]/g, '')) {
        const px = 14
        const py = 8
        ctx.fillStyle = COLORS.highlight
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
        drawRoundedRect(ctx, cx - px, cy - py + 2, wordW + px * 2, TITLE_SIZE + py * 2, 12)

        ctx.fillStyle = COLORS.highlightText
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetY = 2
        ctx.fillText(word, cx, cy)

        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetY = 3
      } else {
        ctx.fillStyle = COLORS.title
        ctx.fillText(word, cx, cy)
      }

      cx += wordW + spaceW
    }

    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    currentY = cy + TITLE_SIZE * 1.5 + 10
  }

  if (slide.subtitle) {
    ctx.font = `normal 40px ${FONT_REGULAR}`
    ctx.fillStyle = COLORS.subtitle
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 2
    const subText = slide.subtitle.startsWith('(') ? slide.subtitle : `(${slide.subtitle})`
    const wrapped = wrapText(ctx, subText, MAX_W)
    for (const line of wrapped) {
      ctx.fillText(line, PAD, currentY)
      currentY += 40 * 1.35
    }
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    currentY += 15
  }

  if (hasBullets) {
    const BULLET_SIZE = 34
    const DOT_R = 6
    currentY += 10

    for (const bullet of slide.bullets) {
      ctx.fillStyle = COLORS.bulletDot
      ctx.beginPath()
      ctx.arc(PAD + DOT_R, currentY + BULLET_SIZE * 0.55, DOT_R, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = `normal ${BULLET_SIZE}px ${FONT_REGULAR}`
      ctx.fillStyle = COLORS.bullet
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetY = 2

      const bulletX = PAD + DOT_R * 2 + 14
      const wrapped = wrapText(ctx, bullet, MAX_W - DOT_R * 2 - 14)
      for (const line of wrapped) {
        ctx.fillText(line, bulletX, currentY)
        currentY += BULLET_SIZE * 1.4
      }
      currentY += 8
    }
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
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
  const slideCount = content.slides.length
  console.log(`\nGenerated ${slideCount} slide(s)\n`)

  const photos = pickStockPhotos(slideCount)
  console.log(`Selected photos: ${photos.map(p => p.split('/').pop()).join(', ')}\n`)

  console.log('Rendering slides for all platforms...\n')
  for (const [platform, dims] of Object.entries(PLATFORMS)) {
    console.log(`  ${platform} (${dims.w}x${dims.h}):`)
    for (let i = 0; i < slideCount; i++) {
      await renderSlide(content.slides[i], photos[i], platform, dims, i)
    }
    console.log(`    ${slideCount} slide(s)`)
  }

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
    const slides = content.slides.map((_, i) =>
      `./output/${platform}/slide_${String(i + 1).padStart(2, '0')}.png`
    )
    writeFileSync(`./schedules/${platform}.json`, JSON.stringify([{
      slides,
      caption: content.caption,
      scheduledAt,
    }], null, 2))
  }

  savePostedEntry({
    date: new Date().toISOString().split('T')[0],
    pillar,
    hookStyle,
    hook: content.slides[0]?.title || '',
    caption: content.caption,
    photos: photos.map(p => p.split('/').pop()),
  })

  console.log(`\nDone - ${slideCount} slide(s) x ${Object.keys(PLATFORMS).length} platforms`)
  console.log(`Pillar: ${pillar} | Hook: ${hookStyle}`)
  console.log(`Caption: ${content.caption}`)
}

main().catch(console.error)
