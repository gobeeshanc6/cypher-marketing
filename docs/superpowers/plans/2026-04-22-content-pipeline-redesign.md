# Content Pipeline Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the CypherJobs social content pipeline to match a proven TikTok format - real stock photos, left-aligned casual text, 1-2 slides per post, lighter overlays.

**Architecture:** Replace AI image generation (Cloudflare FLUX) with a curated stock photo library. Rewrite the renderer for left-aligned text with tan highlight pills. Simplify the GPT prompt to output 1-2 slides of casual, direct content instead of 8-slide carousels.

**Tech Stack:** Node.js (ESM), @napi-rs/canvas, GPT-4o-mini (OpenAI API), sharp, Inter font

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `images/stock/*.jpg` | Create | 40 curated lifestyle/tech photos from Unsplash/Pexels |
| `fonts/Inter-Bold.ttf` | Create | Bold weight of Inter font for titles |
| `fonts/Inter-Regular.ttf` | Create | Regular weight of Inter font for subtitles/bullets |
| `generate-content.js` | Rewrite | Content generation (GPT prompt), photo selection, slide rendering, schedule output |
| `generate-slides.js` | Keep | Legacy manual slide generator (unchanged, still works for one-off use) |
| `batch-schedule.js` | Unchanged | Already handles arbitrary slide counts via schedule JSON |
| `content/posted.json` | Schema update | Add `photos` field to entries |

**Key decision:** `batch-schedule.js` already reads slide arrays from schedule JSON files and posts them - it doesn't care about slide count. No changes needed there. `generate-slides.js` is the old manual renderer; we leave it for backward compat but the main pipeline is `generate-content.js`.

---

### Task 1: Download Inter Font Files

**Files:**
- Create: `fonts/Inter-Bold.ttf`
- Create: `fonts/Inter-Regular.ttf`

- [ ] **Step 1: Download Inter Bold and Regular from Google Fonts**

```bash
curl -L -o /tmp/Inter.zip "https://fonts.google.com/download?family=Inter"
unzip -o /tmp/Inter.zip -d /tmp/Inter
cp /tmp/Inter/static/Inter_18pt-Bold.ttf fonts/Inter-Bold.ttf
cp /tmp/Inter/static/Inter_18pt-Regular.ttf fonts/Inter-Regular.ttf
rm -rf /tmp/Inter /tmp/Inter.zip
```

Verify they exist:
```bash
ls -la fonts/
```

Expected: Two `.ttf` files, each ~300-400KB.

- [ ] **Step 2: Commit fonts**

```bash
git add fonts/Inter-Bold.ttf fonts/Inter-Regular.ttf
git commit -m "chore: add Inter Bold and Regular fonts"
```

---

### Task 2: Curate Stock Photo Library

**Files:**
- Create: `images/stock/` directory with ~40 photos

Download ~40 photos from Unsplash using their direct download URLs. All photos are free for commercial use (Unsplash license). Aim for this category distribution:

- ~10 coffee + desk scenes
- ~8 keyboard / typing closeups
- ~8 person coding at cozy workspace
- ~7 laptop with warm lighting
- ~7 bookshelves, warm afternoon light, cozy interior

- [ ] **Step 1: Create the directory**

```bash
mkdir -p images/stock
```

- [ ] **Step 2: Download photos from Unsplash**

Write a temporary download script `download-stock.js` that fetches photos from Unsplash source URLs and saves them with descriptive names. Each URL uses the `https://images.unsplash.com/photo-{id}?w=1080&q=80` format for consistent 1080px-wide high-quality downloads.

```javascript
import { writeFileSync, mkdirSync } from 'fs'

const STOCK_DIR = './images/stock'
mkdirSync(STOCK_DIR, { recursive: true })

const photos = [
  // Coffee + desk scenes
  { name: 'coffee-desk-01.jpg', url: 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=1080&q=80' },
  { name: 'coffee-desk-02.jpg', url: 'https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?w=1080&q=80' },
  { name: 'coffee-desk-03.jpg', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1080&q=80' },
  { name: 'coffee-desk-04.jpg', url: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=1080&q=80' },
  { name: 'coffee-desk-05.jpg', url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1080&q=80' },
  { name: 'coffee-desk-06.jpg', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1080&q=80' },
  { name: 'coffee-desk-07.jpg', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1080&q=80' },
  { name: 'coffee-desk-08.jpg', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1080&q=80' },
  { name: 'coffee-desk-09.jpg', url: 'https://images.unsplash.com/photo-1485217988980-11786ced9454?w=1080&q=80' },
  { name: 'coffee-desk-10.jpg', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1080&q=80' },
  // Keyboard / typing closeups
  { name: 'keyboard-01.jpg', url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=1080&q=80' },
  { name: 'keyboard-02.jpg', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1080&q=80' },
  { name: 'keyboard-03.jpg', url: 'https://images.unsplash.com/photo-1529236183275-4fdcf2bc987e?w=1080&q=80' },
  { name: 'keyboard-04.jpg', url: 'https://images.unsplash.com/photo-1558050032-160f36233a07?w=1080&q=80' },
  { name: 'keyboard-05.jpg', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1080&q=80' },
  { name: 'keyboard-06.jpg', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80' },
  { name: 'keyboard-07.jpg', url: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=1080&q=80' },
  { name: 'keyboard-08.jpg', url: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=1080&q=80' },
  // Person coding at workspace
  { name: 'coding-01.jpg', url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=1080&q=80' },
  { name: 'coding-02.jpg', url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1080&q=80' },
  { name: 'coding-03.jpg', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080&q=80' },
  { name: 'coding-04.jpg', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&q=80' },
  { name: 'coding-05.jpg', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1080&q=80' },
  { name: 'coding-06.jpg', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1080&q=80' },
  { name: 'coding-07.jpg', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1080&q=80' },
  { name: 'coding-08.jpg', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1080&q=80' },
  // Laptop with warm lighting
  { name: 'laptop-warm-01.jpg', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1080&q=80' },
  { name: 'laptop-warm-02.jpg', url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1080&q=80' },
  { name: 'laptop-warm-03.jpg', url: 'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=1080&q=80' },
  { name: 'laptop-warm-04.jpg', url: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1080&q=80' },
  { name: 'laptop-warm-05.jpg', url: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=1080&q=80' },
  { name: 'laptop-warm-06.jpg', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1080&q=80' },
  { name: 'laptop-warm-07.jpg', url: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=1080&q=80' },
  // Cozy interior / bookshelves / warm light
  { name: 'cozy-01.jpg', url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1080&q=80' },
  { name: 'cozy-02.jpg', url: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1080&q=80' },
  { name: 'cozy-03.jpg', url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1080&q=80' },
  { name: 'cozy-04.jpg', url: 'https://images.unsplash.com/photo-1486946255434-2466348c2166?w=1080&q=80' },
  { name: 'cozy-05.jpg', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1080&q=80' },
  { name: 'cozy-06.jpg', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1080&q=80' },
  { name: 'cozy-07.jpg', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1080&q=80' },
]

for (let i = 0; i < photos.length; i++) {
  const { name, url } = photos[i]
  console.log(`[${i + 1}/${photos.length}] ${name}...`)
  try {
    const res = await fetch(url)
    if (!res.ok) { console.error(`  FAILED: ${res.status}`); continue }
    const buffer = Buffer.from(await res.arrayBuffer())
    writeFileSync(`${STOCK_DIR}/${name}`, buffer)
    console.log(`  OK (${(buffer.length / 1024).toFixed(0)}KB)`)
  } catch (e) {
    console.error(`  ERROR: ${e.message}`)
  }
  if (i < photos.length - 1) await new Promise(r => setTimeout(r, 300))
}

console.log('\nDone!')
```

Run it:
```bash
node download-stock.js
```

Expected: ~40 jpg files in `images/stock/`, each 50-200KB.

- [ ] **Step 3: Verify photos look right**

```bash
ls -la images/stock/ | head -20
ls images/stock/ | wc -l
```

Expected: ~40 files. Spot-check a few by opening them to confirm they're warm lifestyle photos, not broken downloads.

- [ ] **Step 4: Clean up and commit**

```bash
rm download-stock.js
git add images/stock/
git commit -m "chore: add curated stock photo library (40 photos)"
```

---

### Task 3: Rewrite the Slide Renderer in `generate-content.js`

This is the core visual change. We rewrite the rendering logic in `generate-content.js` to match the inspiration style.

**Files:**
- Modify: `generate-content.js`

- [ ] **Step 1: Replace the top section - imports, constants, font loading, and color palette**

Replace everything from line 1 through line 56 (the end of `HOOK_STYLES`) with the new version. This removes Cloudflare env vars, updates the overlay/color constants, loads both Inter font weights, and keeps the pillars/hooks arrays.

```javascript
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
```

- [ ] **Step 2: Replace the posted history helpers and content generation function**

Replace the `POSTED_PATH` constant through end of `generateSlideContent()` (lines 58-176 in current file). The key change is a drastically simplified GPT prompt that outputs 1-2 slides instead of 8.

```javascript
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
```

- [ ] **Step 3: Replace the image generation and rendering functions**

Remove the old `generateImage()` function entirely (it called Cloudflare FLUX). Replace the `wrapText`, `drawRoundedRect`, `drawTitleWithHighlight`, and `renderSlide` functions with the new renderer that matches the inspiration style.

```javascript
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

  // Watermark
  ctx.font = `600 26px ${FONT_BOLD}`
  ctx.fillStyle = COLORS.watermark
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(`@${HANDLE}`, PAD, 55)

  const hasBullets = slide.bullets && slide.bullets.length > 0
  const hasTitle = slide.title && slide.title.trim().length > 0
  let currentY = hasBullets && !hasTitle ? H * 0.18 : H * 0.35

  // Title with highlight
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

  // Subtitle
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

  // Bullets
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
```

- [ ] **Step 4: Replace the `main()` function**

Remove the old main function and replace with one that uses stock photos instead of FLUX, and outputs fewer slides.

```javascript
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
```

- [ ] **Step 5: Run it and verify the output**

```bash
node generate-content.js
```

Expected output:
```
Content pillar: specialism-spotlight
Hook style: ...
Generating slide content with GPT-4o-mini...

Generated 1 slide(s)

Selected photos: coffee-desk-03.jpg

Rendering slides for all platforms...

  tiktok (1080x1920):
    1 slide(s)
  instagram (1080x1350):
    1 slide(s)
  linkedin (1080x1080):
    1 slide(s)

Done - 1 slide(s) x 3 platforms
```

Visually check the output slides:
```bash
ls -la output/tiktok/
ls -la output/instagram/
ls -la output/linkedin/
```

Open a few slides to verify:
- Real photo visible through light overlay
- Left-aligned text
- Tan highlight pill on the keyword
- @cypherjobs watermark top-left
- No pagination dots

- [ ] **Step 6: Commit**

```bash
git add generate-content.js
git commit -m "feat: redesign content pipeline - stock photos, new renderer, 1-2 slides"
```

---

### Task 4: Visual QA and Tuning

After running the pipeline once, inspect the output and tune any rendering values that don't quite match the inspiration.

**Files:**
- Modify: `generate-content.js` (constants/values only)

- [ ] **Step 1: Generate a few test posts and compare to inspiration**

Run the pipeline 2-3 times and compare the output against the inspiration images at `images/cybersecurity/inspiration/`.

```bash
node generate-content.js
```

Open the TikTok slides side by side with the inspiration images. Check:
- Is the overlay too dark or too light? Adjust `COLORS.overlay` opacity (currently 0.30).
- Is the title font too big or small? Adjust `TITLE_SIZE` (currently 68).
- Is the highlight pill the right color/size? Adjust `COLORS.highlight` and padding values.
- Is the watermark positioned right? Adjust the `55` y-coordinate and `26px` font size.
- Are bullets readable? Adjust `BULLET_SIZE` (currently 34).

- [ ] **Step 2: Tweak values and re-render until it matches**

Make adjustments directly in `generate-content.js` constants. Re-run `node generate-content.js` after each change.

- [ ] **Step 3: Commit tuned values**

```bash
git add generate-content.js
git commit -m "fix: tune rendering values to match inspiration style"
```

---

### Task 5: Update .gitignore and Clean Up

**Files:**
- Modify: `.gitignore` (if stock photos should not be tracked - they probably should be since they're curated assets)

- [ ] **Step 1: Verify .gitignore is sensible**

```bash
cat .gitignore
```

Stock photos in `images/stock/` should be committed (they're curated project assets, not generated output). The `output/` directory should stay gitignored if it already is.

- [ ] **Step 2: Final full run and commit all output**

```bash
node generate-content.js
git add -A
git status
git commit -m "chore: generate first post with redesigned pipeline"
```
