# cypher-marketing

TikTok + LinkedIn slideshow content pipeline for CypherJobs.

## How it works

1. Find hooks from viral CyberTok slideshows (see `prompts/extract-hooks.md`)
2. Source images from Pinterest using Claude-generated search terms
3. Generate slides with `npm run generate` (or load from `slides-config.json`)
4. Schedule via Postiz Agent CLI with `npm run batch`
5. Post from TikTok Drafts to avoid spam detection

## Setup

```bash
npm install

# Optional: add a custom font
cp Inter-Bold.ttf fonts/

# Add images to images/cybersecurity/
# Edit slides-config.json or modify generate-slides.js defaults

npm run generate
```

## Scheduling

```bash
npm install -g postiz
export POSTIZ_API_KEY=your_key
export TIKTOK_INTEGRATION_ID=your_id

# Edit schedules/week.json (see week.json.example)
npm run batch
```

## Directory structure

```
images/          # Pinterest-sourced images (gitignored)
output/          # Generated slide PNGs (gitignored)
fonts/           # Custom TTF/OTF fonts (gitignored)
prompts/         # Claude prompts for hook extraction
schedules/       # Weekly post schedules
```
