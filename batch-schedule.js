import 'dotenv/config'
import { readFileSync, existsSync } from 'fs'

const BUFFER_API_KEY = process.env.BUFFER_API_KEY
const BUFFER_CHANNEL_ID = process.env.BUFFER_CHANNEL_ID
const GITHUB_REPO = process.env.GITHUB_REPO || 'gobeeshanc6/cypher-marketing'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'

if (!BUFFER_API_KEY || !BUFFER_CHANNEL_ID) {
  console.error('Set BUFFER_API_KEY and BUFFER_CHANNEL_ID env vars first')
  process.exit(1)
}

function toPublicUrl(slide) {
  if (slide.startsWith('http')) return slide
  const cleanPath = slide.replace(/^\.\//, '')
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${cleanPath}`
}

const schedulePath = './schedules/week.json'
if (!existsSync(schedulePath)) {
  console.error('No schedules/week.json found - copy week.json.example and edit it')
  process.exit(1)
}

const schedule = JSON.parse(readFileSync(schedulePath, 'utf-8'))

async function createPost(post) {
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
      channelId: BUFFER_CHANNEL_ID,
      schedulingType: post.scheduledAt ? 'automatic' : 'notification',
      mode: post.scheduledAt ? 'customScheduled' : 'addToQueue',
      ...(post.scheduledAt && { dueAt: post.scheduledAt }),
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
    console.error(`Failed: ${data.errors[0].message}`)
    return false
  }

  const result = data.data.createPost
  if (result.message) {
    console.error(`Failed: ${result.message}`)
    return false
  }

  console.log(`Scheduled: ${post.slides.length} slides - ${post.caption.slice(0, 50)}...`)
  return true
}

async function main() {
  console.log(`Scheduling ${schedule.length} posts via Buffer...\n`)

  let success = 0
  for (const post of schedule) {
    if (await createPost(post)) success++
  }

  console.log(`\nDone - ${success}/${schedule.length} posts scheduled`)
}

main().catch(console.error)
