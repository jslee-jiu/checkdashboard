// api/analyze.js
export const runtime = 'nodejs';

export default async function handler(request) {
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
    }
    const { imageBase64 } = await request.json().catch(() => ({}));
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 required' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    const model = process.env.CF_MODEL || '@cf/meta/llama-3.2-11b-vision-instruct';
    const accountId = process.env.CF_ACCOUNT_ID;
    const token = process.env.CF_API_TOKEN;

    if (!accountId || !token) {
      return new Response(JSON.stringify({
        code: 'DEMO',
        title: '서버 설정 필요 (데모 응답)',
        steps: ['Vercel 환경변수에 CF_ACCOUNT_ID, CF_API_TOKEN 설정', 'Redeploy', '다시 테스트'],
        source: 'demo',
      }), { status: 200, headers: { 'content-type': 'application/json' }});
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(model)}`;
    const labels = ['ENGINE','TPMS','BATT','BRAKE','OIL','COOLANT','AIRBAG','ABS','INFO'];
    const sys = `You are a car dashboard warning light expert.
Return ONLY JSON: {"code":"...","title":"...","steps":["...","...","..."]}.
- code: one of ${labels.join(', ')} (INFO only if VERY unsure)
- title: Korean
- steps: 3 short Korean actions.`;

    const payload = {
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: [
          { type: 'text', text: 'Identify dashboard warning indicators and respond as JSON.' },
          { type: 'image_url', image_url: `data:image/jpeg;base64,${imageBase64}` },
        ]},
      ],
    };

    const cf = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await cf.json();

    let raw = j?.result?.response || j?.result?.text || j?.result?.output_text || '';
    let parsed = null;
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch {}
    if (!parsed && typeof raw === 'string') {
      const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
      if (a >= 0 && b > a) { try { parsed = JSON.parse(raw.slice(a, b+1)); } catch {} }
    }

    const out = {
      code: parsed?.code || 'INFO',
      title: parsed?.title || '특이 경고 없음 (AI)',
      steps: Array.isArray(parsed?.steps) && parsed.steps.length === 3 ? parsed.steps : ['정상으로 보입니다', '문제가 지속되면 재촬영', '필요 시 정비소 방문'],
      source: 'ai',
    };
    return new Response(JSON.stringify(out), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
