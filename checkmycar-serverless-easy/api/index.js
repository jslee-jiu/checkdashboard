export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
    const { imageBase64 } = req.body || {}
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

    const model = process.env.CF_MODEL || '@cf/meta/llama-3.2-11b-vision-instruct'
    const accountId = process.env.CF_ACCOUNT_ID
    const token = process.env.CF_API_TOKEN
    if (!accountId || !token) {
      return res.status(200).json({
        code: 'DEMO',
        title: '서버 설정 필요 (데모 응답)',
        steps: ['Vercel 환경변수에 CF_ACCOUNT_ID, CF_API_TOKEN 설정', '배포 다시 실행', '정상 동작 확인'],
        source: 'demo'
      })
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(model)}`
    const labels = ['ENGINE','TPMS','BATT','BRAKE','OIL','COOLANT','AIRBAG','ABS','INFO']
    const sys = `You are a car dashboard warning light expert.
Return ONLY compact JSON: {"code": "...", "title": "...", "steps": ["...", "...", "..."]}
- code: one of ${labels.join(', ')} (pick the closest; use INFO if unsure)
- title: concise Korean title
- steps: exactly 3 Korean action steps (short imperative sentences).`

    const body = {
      messages: [
        {"role": "system", "content": sys},
        {"role": "user", "content": [
          {"type": "text", "text": "Identify visible dashboard warning indicators and respond as JSON."},
          {"type": "image_url", "image_url": `data:image/jpeg;base64,${imageBase64}`}
        ]}
      ]
    }

    const cf = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const j = await cf.json()
    let raw = ''
    try {
      raw = (j && j.result && (j.result.response || j.result.text || j.result.output_text)) || ''
    } catch {}

    let parsed = null
    try { parsed = JSON.parse(raw) } catch {}
    if (!parsed && typeof raw === 'string') {
      const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(raw.slice(start, end+1)) } catch {}
      }
    }

    const out = {
      code: (parsed && parsed.code) || 'INFO',
      title: (parsed && parsed.title) || '특이 경고 없음 (AI)',
      steps: (parsed && Array.isArray(parsed.steps) && parsed.steps.length === 3) ? parsed.steps : ['정상으로 보입니다', '문제가 지속되면 재촬영', '필요 시 정비소 방문'],
      source: 'ai'
    }
    return res.status(200).json(out)
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}
