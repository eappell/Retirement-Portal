const fs = require('fs')
const path = require('path')

const DATA_PATH = path.join(process.cwd(), 'api', 'data', 'cities.json')

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const raw = fs.readFileSync(DATA_PATH, 'utf8')
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).send(raw)
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const key = req.headers['x-api-key'] || req.query.key
      if (process.env.PORTAL_API_KEY && key !== process.env.PORTAL_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const body = req.body
      const content = typeof body === 'string' ? body : JSON.stringify(body, null, 2)
      try {
        fs.writeFileSync(DATA_PATH, content, 'utf8')
        return res.status(200).json({ ok: true })
      } catch (e) {
        console.error('Failed to write cities.json', e)
        return res.status(500).json({ error: 'Write failed' })
      }
    }

    res.setHeader('Allow', 'GET,PUT,POST')
    res.status(405).end()
  } catch (err) {
    console.error('cities API error', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
