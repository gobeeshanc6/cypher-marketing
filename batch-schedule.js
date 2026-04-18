import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const INTEGRATION_ID = process.env.TIKTOK_INTEGRATION_ID

if (!INTEGRATION_ID) {
  console.error('Set TIKTOK_INTEGRATION_ID env var first')
  process.exit(1)
}

const schedule = JSON.parse(readFileSync('./schedules/week.json', 'utf-8'))

for (const post of schedule) {
  const slideFlags = post.slides.map(slide => {
    const result = JSON.parse(execSync(`postiz upload ${slide}`).toString())
    return `-m "${result.path}"`
  }).join(' ')

  execSync(
    `postiz posts:create \
      -c "${post.caption}" \
      ${slideFlags} \
      -s "${post.scheduledAt}" \
      -t draft \
      -i "${INTEGRATION_ID}"`,
    { stdio: 'inherit' }
  )

  console.log(`Scheduled: ${post.slides.length} slides at ${post.scheduledAt}`)
}
