import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function findDataPath(filename: string) {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'api', 'data', filename)
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // Path doesn't exist, continue searching
    }
    dir = path.join(dir, '..')
  }
  return path.join(process.cwd(), 'api', 'data', filename)
}

const DATA_PATH = findDataPath('cities.json')

export async function GET() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8')
    return new NextResponse(raw, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('portal cities route GET fs error', err, 'DATA_PATH:', DATA_PATH)
    try {
      // dynamic import of bundled copy inside the portal app
      const mod = await import('../data/cities.json')
      const data = (mod && (mod.default || mod)) || mod
      return NextResponse.json(data)
    } catch (impErr) {
      console.error('portal cities route GET import fallback failed', impErr)
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
    try {
      fs.writeFileSync(DATA_PATH, JSON.stringify(body, null, 2), 'utf8')
      return NextResponse.json({ ok: true })
    } catch (writeErr) {
      console.error('portal cities route POST write failed', writeErr, 'DATA_PATH:', DATA_PATH)
      return NextResponse.json({ error: 'Write not supported in this environment' }, { status: 501 })
    }
  } catch (err) {
    console.error('portal cities route POST parse error', err)
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

export async function PUT(req: Request) {
  return POST(req)
}
