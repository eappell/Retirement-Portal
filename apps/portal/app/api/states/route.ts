import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function findDataPath(filename: string) {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'api', 'data', filename)
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch (e) {}
    dir = path.join(dir, '..')
  }
  // fallback to original location
  return path.join(process.cwd(), 'api', 'data', filename)
}

const DATA_PATH = findDataPath('states.json')

export async function GET() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8')
    return new NextResponse(raw, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('portal states route GET fs error', err, 'DATA_PATH:', DATA_PATH)
    // In some production environments filesystem access to repo-root may not be available.
    // Fall back to importing the JSON so it can be bundled with the app at build time.
    try {
      // dynamic import relative to this file (may be bundled)
      const mod = await import('../../../../../../api/data/states.json')
      const data = (mod && (mod.default || mod)) || mod
      return NextResponse.json(data)
    } catch (impErr) {
      console.error('portal states route GET import fallback failed', impErr)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }
}

export async function POST(req: Request) {
  const key = req.headers.get('x-api-key') || null
  if (process.env.PORTAL_API_KEY && key !== process.env.PORTAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    // Attempt to write, but in serverless production this may fail.
    try {
      fs.writeFileSync(DATA_PATH, JSON.stringify(body, null, 2), 'utf8')
      return NextResponse.json({ ok: true })
    } catch (writeErr) {
      console.error('portal states route POST write failed', writeErr, 'DATA_PATH:', DATA_PATH)
      // Writing to bundled files isn't supported in many hosting environments
      return NextResponse.json({ error: 'Write not supported in this environment' }, { status: 501 })
    }
  } catch (err) {
    console.error('portal states route POST parse error', err)
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

export async function PUT(req: Request) {
  return POST(req)
}
