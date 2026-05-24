import { readFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

export async function GET() {
  const iconPath = path.join(process.cwd(), 'public', 'icon-180.png')
  const body = await readFile(iconPath)

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
