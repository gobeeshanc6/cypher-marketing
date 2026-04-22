# Content Pipeline Redesign - Match Proven TikTok Format

## Problem

Current slides use AI-generated backgrounds (Cloudflare FLUX), heavy dark overlays, centered text, and 7-8 slide carousels. They look corporate and artificial - getting zero views. Competitor posts using real lifestyle photos with casual left-aligned text are getting significantly more engagement.

## Goals

- Match the visual style of proven high-performing TikTok content
- Replace AI-generated backgrounds with curated real stock photos
- Simplify posts from 7-8 slides down to 1-2 slides (max 3)
- Make content feel authentic and personal, not branded/corporate

## Visual Style

### Backgrounds
- Curate 30-50 real lifestyle/tech photos from Unsplash/Pexels (free commercial use)
- Store in `images/stock/` directory
- Categories: coffee + desk, keyboard closeups, person coding, cozy workspace, laptop with warm lighting, bookshelves, warm afternoon light
- Pipeline tracks recently used photos to avoid repeats

### Overlay
- Light semi-transparent dark overlay (~0.30-0.35 opacity, down from 0.45)
- Subtle bottom gradient for text readability
- Photo should remain clearly visible and prominent

### Typography
- Left-aligned text (not centered)
- Bold title text - large but not overpowering
- One keyword highlighted in a warm tan/brown rounded pill
- Subtitle text in parentheses, smaller, slightly transparent
- Bullet points with small dot markers, casual sizing
- Small "@cypherjobs" watermark top-left

### What to Remove
- No pagination dots / slide indicators
- No CTA slides
- No heavy corporate overlay

## Post Format

### Structure
- 1-2 slides per post (max 3 in rare cases)
- **Slide 1**: Bold hook title with one highlighted keyword, optional subtitle
- **Slide 2** (optional): 3-5 short bullet points with actionable tips
- Brand presence through watermark only, no dedicated CTA

### Platform Sizing (unchanged)
- TikTok: 1080x1920
- Instagram: 1080x1350
- LinkedIn: 1080x1080

## Content Generation

### Keep
- GPT-4o-mini for content generation
- Pillar rotation system (7 pillars)
- Hook style rotation
- Topic memory / posted history to avoid repetition

### Change
- Simplify the prompt drastically - output a title, highlight word, optional subtitle, optional short bullet list (3-5 items max)
- Tone shift: casual, direct, like a friend giving advice - not a brand lecturing
- Generate 1-2 slides worth of content, not 8
- Examples of good titles from inspiration: "How to build a career in tech", "Code daily (even 30-60 minutes)", "Build REAL projects", "Pick ONE clear tech direction"

### Prompt Output Format
```json
{
  "slides": [
    {
      "title": "Build REAL projects",
      "highlight": "REAL",
      "subtitle": "most imp!",
      "bullets": null
    },
    {
      "title": null,
      "highlight": null,
      "subtitle": null,
      "bullets": ["Portfolio projects > certifications", "Solve a real problem you care about", "Document everything on GitHub"]
    }
  ],
  "caption": "TikTok caption with 3-5 hashtags"
}
```

## Photo Library Management

### Curation
- Download ~40 photos across categories into `images/stock/`
- Name files descriptively: `coffee-desk-01.jpg`, `keyboard-warm-03.jpg`, etc.
- Organize flat (no subdirectories) for simplicity

### Selection
- Track used photos in `content/posted.json` (add `photo` field to entries)
- Random selection from unused photos, cycling through the full library before repeating
- Different photo for each slide in a multi-slide post

## Files to Change

### `generate-content.js` (major rewrite)
- Remove FLUX image generation entirely (no more Cloudflare AI calls)
- Simplify GPT prompt for 1-2 slide output
- Add stock photo selection logic with repeat tracking
- Update schedule generation for fewer slides
- Remove `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` requirements

### `generate-slides.js` (major rewrite of renderer)
- New rendering function matching inspiration style
- Left-aligned text layout
- Lighter overlay
- Tan/brown highlight pill for keywords
- Remove pagination dots
- Smaller, more casual font sizing

### New: `images/stock/` directory
- 30-50 curated lifestyle/tech photos

### `content/posted.json` schema update
- Add `photo` field to track which stock photos were used

### `batch-schedule.js` (minor update)
- Update to handle 1-2 slides instead of 7-8

### Fonts
- Download Inter font (Bold + Regular weights) into `fonts/` - the directory exists but is currently empty
- Inter matches the clean, modern look of the inspiration

## Color Palette

- Overlay: `rgba(20, 15, 10, 0.30)` (lighter than current)
- Highlight pill: `#C4956A` (warm tan, matching inspiration)
- Highlight text: `#FFFFFF`
- Title text: `#FFFFFF`
- Subtitle: `rgba(255, 255, 255, 0.80)`
- Bullets: `rgba(255, 255, 255, 0.85)`
- Bullet dots: `#C4956A`
- Watermark: `rgba(255, 255, 255, 0.60)`
