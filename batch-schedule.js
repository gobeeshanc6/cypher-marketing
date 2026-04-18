import 'dotenv/config'
import { readFileSync, existsSync } from 'fs'

const BUFFER_API_KEY = process.env.BUFFER_API_KEY
const GITHUB_REPO = process.env.GITHUB_REPO || 'gobeeshanc6/cypher-marketing'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const POST_NOW = process.env.POST_NOW === 'true'
const DRAFT_MODE = process.env.DRAFT_MODE === 'true'

// Format: "tiktok:channel_id,instagram:channel_id,linkedin:channel_id"
const BUFFER_CHANNELS = {}
const channelsRaw = process.env.BUFFER_CHANNELS || ''
for (const entry of channelsRaw.split(',').map(s => s.trim()).filter(Boolean)) {
  const [platform, id] = entry.split(':')
  if (platform && id) BUFFER_CHANNELS[platform] = id
}

if (!BUFFER_API_KEY || Object.keys(BUFFER_CHANNELS).length === 0) {
  console.error('Set BUFFER_API_KEY and BUFFER_CHANNELS (e.g. "tiktok:id1,instagram:id2") env vars')
  process.exit(1)
}

const CACHE_BUST = Date.now()

function toPublicUrl(slide) {
  if (slide.startsWith('http')) return slide
  const cleanPath = slide.replace(/^\.\//, '')
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${cleanPath}?v=${CACHE_BUST}`
}

async function createPost(post, channelId, platform) {
  const imageAssets = post.slides.map(s => ({ url: toPublicUrl(s) }))

  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post { id text }
        }
        ... on MutationError {
          message
        }
      }
    }
  `

  const variables = {
    input: {
      text: post.caption,
      channelId,
      schedulingType: 'automatic',
      mode: POST_NOW ? 'shareNow' : (post.scheduledAt ? 'customScheduled' : 'addToQueue'),
      ...(!POST_NOW && post.scheduledAt && { dueAt: post.scheduledAt }),
      ...(DRAFT_MODE && { saveToDraft: true }),
      ...(platform === 'instagram' && { postType: 'post' }),
      assets: { images: imageAssets },
    },
  }

  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BUFFER_API_KEY}`,
    },
    body: JSON.stringify({ query: mutation, variables }),
  })

  const data = await res.json()

  if (data.errors) {
    console.error(`  Failed [${channelId}]: ${data.errors[0].message}`)
    return false
  }

  const result = data.data.createPost
  if (result.message) {
    console.error(`  Failed [${channelId}]: ${result.message}`)
    return false
  }

  return true
}

async function main() {
  const platforms = Object.keys(BUFFER_CHANNELS)
  console.log(`Posting to ${platforms.length} channel(s): ${platforms.join(', ')}\n`)

  let success = 0
  let total = 0

  for (const [platform, channelId] of Object.entries(BUFFER_CHANNELS)) {
    const schedulePath = `./schedules/${platform}.json`
    if (!existsSync(schedulePath)) {
      console.error(`  No schedule found: ${schedulePath} - skipping ${platform}`)
      continue
    }

    const schedule = JSON.parse(readFileSync(schedulePath, 'utf-8'))
    console.log(`  ${platform}: ${schedule.length} post(s)`)

    for (const post of schedule) {
      total++
      if (await createPost(post, channelId, platform)) {
        console.log(`    Scheduled: ${post.slides.length} slides - ${post.caption.slice(0, 50)}...`)
        success++
      }
    }
  }

  console.log(`\nDone - ${success}/${total} posts scheduled`)
}

main().catch(console.error)
