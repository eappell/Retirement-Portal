import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'api', 'data', 'cities.json')

export async function GET() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8')
    return new NextResponse(raw, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('portal cities route GET error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const key = req.headers.get('x-api-key') || null
  if (process.env.PORTAL_API_KEY && key !== process.env.PORTAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    fs.writeFileSync(DATA_PATH, JSON.stringify(body, null, 2), 'utf8')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('portal cities route POST error', err)
    return NextResponse.json({ error: 'Write failed' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  return POST(req)
}
