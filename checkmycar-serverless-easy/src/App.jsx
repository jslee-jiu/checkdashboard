import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, Camera, Upload, History, Settings, Image as ImageIcon, LogIn, UserPlus, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-xl font-semibold flex items-center gap-2">{Icon ? <Icon className="w-5 h-5" /> : null}{title}</h3>
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

function NavTab({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`tab ${active ? 'tab-active' : 'hover:bg-slate-100'}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

function DemoAISuggestion({ code, title, steps, source }) {
  const pill = source === 'ai'
    ? <span className="pill pill-ai">AI</span>
    : source === 'demo'
      ? <span className="pill pill-demo">DEMO</span>
      : <span className="pill">LOCAL</span>
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-amber-50"><AlertTriangle className="w-5 h-5 text-amber-500"/></div>
        <div className="text-sm text-slate-500">감지 코드</div>
        <div className="text-sm font-semibold">{code}</div>
        {pill}
      </div>
      <h4 className="text-lg font-semibold">{title}</h4>
      <ul className="list-disc pl-5 space-y-1 text-sm">
        {(steps || []).map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      <div className="flex items-center gap-2 text-sm text-slate-500 pt-2">
        <CheckCircle2 className="w-4 h-4"/> 안전 팁과 정비소 안내는 모델/데모 데이터에 따라 다를 수 있습니다
      </div>
    </div>
  )
}

// Resize to max dimension (e.g., 1280px) and return base64 without prefix
async function toBase64Resized(file, max = 1280) {
  const dataURL = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = reject
    im.src = dataURL
  })
  const { width, height } = img
  let tw = width, th = height
  if (Math.max(width, height) > max) {
    if (width >= height) {
      tw = max
      th = Math.round(height * (max / width))
    } else {
      th = max
      tw = Math.round(width * (max / height))
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = tw; canvas.height = th
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, tw, th)
  const out = canvas.toDataURL('image/jpeg', 0.9) // quality 90%
  return out.split(',')[1] // base64 only
}

async function analyzeWithServer(imageBase64) {
  const r = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 })
  })
  if (!r.ok) throw new Error('API 오류')
  return await r.json() // { code, title, steps, source: 'ai'|'demo' }
}

function analyzeLocallyByHeuristic(file) {
  const name = (file.name || '').toLowerCase()
  if (name.includes('tire') || name.includes('tpms')) {
    return { code: 'TPMS', title: '타이어 공기압 경고 (추정)', steps: ['공기압 보충', '펑크 점검', '겨울철 보정'], source: 'local' }
  }
  if (name.includes('battery')) {
    return { code: 'BATT', title: '배터리/충전 경고 (추정)', steps: ['야간 주행 자제', '단자 점검', '충전 전압 측정'], source: 'local' }
  }
  if (name.includes('engine') || name.includes('check')) {
    return { code: 'ENGINE', title: '엔진 계통 경고 (추정)', steps: ['가속 자제', '연료캡 확인', 'OBD-II 스캔'], source: 'local' }
  }
  return { code: 'INFO', title: '특이 경고 없음 (일반 표시)', steps: ['연료/냉각수/오일 확인', '문제가 지속되면 재업로드', '필요 시 정비소 방문'], source: 'local' }
}

export default function App() {
  const [tab, setTab] = useState('upload')
  const [authTab, setAuthTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [carModel, setCarModel] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [historyItems, setHistoryItems] = useState([])

  const fileInputRef = useRef(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cmc_history') || '[]')
      setHistoryItems(saved)
      const savedEmail = localStorage.getItem('cmc_email') || ''
      const savedCar = localStorage.getItem('cmc_car') || ''
      const savedAuthed = localStorage.getItem('cmc_authed') === '1'
      setEmail(savedEmail)
      setCarModel(savedCar)
      setIsAuthed(savedAuthed)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('cmc_history', JSON.stringify(historyItems))
  }, [historyItems])

  const handleAuth = () => {
    if (authTab === 'signup' && !carModel) { alert('차종을 입력해주세요'); return }
    setIsAuthed(true)
    localStorage.setItem('cmc_email', email)
    localStorage.setItem('cmc_car', carModel)
    localStorage.setItem('cmc_authed', '1')
    setTab('upload')
  }

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    setResult(null)
  }

  const runAnalyze = async () => {
    if (!file) { alert('계기판 사진을 업로드하세요'); return }
    setIsAnalyzing(true)
    try {
      const base64 = await toBase64Resized(file, 1280)
      const data = await analyzeWithServer(base64)
      setResult(data)
      const item = { id: Date.now(), fileName: file.name, preview, detected: data.title, code: data.code, source: data.source || 'ai', at: new Date().toLocaleString() }
      setHistoryItems(prev => [item, ...prev])
    } catch (e) {
      const demo = analyzeLocallyByHeuristic(file)
      setResult(demo)
      const item = { id: Date.now(), fileName: file.name, preview, detected: demo.title, code: demo.code, source: 'local', at: new Date().toLocaleString() }
      setHistoryItems(prev => [item, ...prev])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const Header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-black text-white rounded-xl"><Car className="w-5 h-5"/></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">checkmycar</h1>
          <p className="text-sm text-slate-500">계기판 사진 업로드 → AI 솔루션</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isAuthed ? (
          <div className="flex gap-2">
            <button className="btn" onClick={() => setAuthTab('login')}>로그인</button>
            <button className="btn btn-primary" onClick={() => setAuthTab('signup')}><UserPlus className="w-4 h-4 mr-1" />회원가입</button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="badge">{carModel || '차종 미설정'}</div>
            <button className="btn" onClick={() => setTab('profile')}><Settings className="w-4 h-4 mr-1" />내 정보</button>
          </div>
        )}
      </div>
    </div>
  )

  const AuthPanel = (
    <Section title={authTab === 'login' ? '로그인' : '회원가입'} icon={authTab === 'login' ? LogIn : UserPlus}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="label">이메일</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid gap-2">
          <label className="label">비밀번호</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {authTab === 'signup' && (
          <div className="grid gap-2">
            <label className="label">차종(예: Hyundai Avante 2022)</label>
            <input className="input" value={carModel} onChange={e=>setCarModel(e.target.value)} placeholder="브랜드 모델 연식" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <button className="btn btn-primary w-full" onClick={handleAuth}>{authTab === 'login' ? '로그인' : '회원가입'}</button>
          <button className="btn" type="button" onClick={()=> setAuthTab(authTab === 'login' ? 'signup' : 'login')}>
            {authTab === 'login' ? '처음이신가요? 회원가입' : '이미 계정이 있나요? 로그인'}
          </button>
        </div>
      </div>
    </Section>
  )

  const UploadPanel = (
    <Section title="계기판 사진 업로드" icon={Upload}>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="dropzone">
            {preview ? (
              <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-xl object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-500">
                <ImageIcon className="w-10 h-10"/>
                <p>이미지 파일을 드래그하거나 아래 버튼으로 선택</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button className="btn" onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-1"/> 파일 선택
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e => { setResult(null); const f=e.target.files?.[0]; if(!f) return; setFile(f); setPreview(URL.createObjectURL(f)); }} className="hidden" />
              <button className="btn btn-primary" onClick={runAnalyze} disabled={!file || isAnalyzing}>
                {isAnalyzing ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin"/> 분석 중…</>) : (<>AI 분석 실행</>)}
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Section title="AI 분석 결과" icon={AlertTriangle}>
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div key={(result.code || 'res') + (result.source || '')} initial={{opacity:0, y:4}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-4}} className="space-y-3">
                  <DemoAISuggestion code={result.code || 'N/A'} title={result.title || '결과'} steps={result.steps || ['결과가 비어있습니다']} source={result.source} />
                  <div className="grid gap-2">
                    <label className="label">메모 (선택)</label>
                    <textarea className="textarea" placeholder="정비 이력이나 특이사항 메모"></textarea>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn">근처 정비소 보기 (데모)</button>
                    <button className="btn btn-primary" onClick={()=>alert('저장(데모): 히스토리에 자동 저장됩니다')}>결과 저장</button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} className="text-sm text-slate-500">
                  업로드 후 "AI 분석 실행"을 눌러 결과를 확인하세요.
                </motion.div>
              )}
            </AnimatePresence>
          </Section>
        </div>
      </div>
    </Section>
  )

  const HistoryPanel = (
    <Section title="분석 히스토리" icon={History}>
      <div className="grid md:grid-cols-3 gap-4">
        {historyItems.length === 0 && (
          <div className="text-sm text-slate-500">아직 기록이 없습니다. 분석을 실행하면 여기에 쌓입니다.</div>
        )}
        {historyItems.map(h => (
          <div key={h.id} className="card overflow-hidden">
            {h.preview ? <img src={h.preview} alt={h.fileName} className="h-36 w-full object-cover" /> : null}
            <div className="card-body space-y-1">
              <div className="text-sm font-medium truncate">{h.fileName}</div>
              <div className="text-xs text-slate-500">{h.at}</div>
              <div className="text-sm">{h.code} · {h.detected}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )

  const ProfilePanel = (
    <Section title="내 정보" icon={Settings}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="label">이메일</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid gap-2">
          <label className="label">차종</label>
          <input className="input" value={carModel} onChange={e=>setCarModel(e.target.value)} placeholder="브랜드 모델 연식" />
        </div>
        <div className="md:col-span-2">
          <button className="btn btn-primary w-full" onClick={()=>alert('저장(데모): 로컬에 저장됩니다')}>정보 저장 (데모)</button>
        </div>
      </div>
    </Section>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="container py-6 space-y-6">
        {Header}
        <div className="flex gap-2">
          <NavTab icon={Upload} label="업로드" active={tab === 'upload'} onClick={()=>setTab('upload')} />
          <NavTab icon={History} label="히스토리" active={tab === 'history'} onClick={()=>setTab('history')} />
          <NavTab icon={Settings} label="내 정보" active={tab === 'profile'} onClick={()=>setTab('profile')} />
        </div>
        <AnimatePresence mode="wait">
          {!isAuthed ? (
            <motion.div key="auth" initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-6}}>
              {AuthPanel}
            </motion.div>
          ) : (
            <motion.div key={tab} initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-6}} className="space-y-6">
              {tab === 'upload' && UploadPanel}
              {tab === 'history' && HistoryPanel}
              {tab === 'profile' && ProfilePanel}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-center text-xs text-slate-500 py-4">
          © {new Date().getFullYear()} checkmycar — 서버리스 데모 (쉬운 버전)
        </div>
      </div>
    </div>
  )
}
