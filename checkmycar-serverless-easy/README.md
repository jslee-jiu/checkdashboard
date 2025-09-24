# checkmycar – 서버리스 데모 (쉬운 버전)

이미지 업로드 → `/api` → Cloudflare Workers AI 호출 → `code/title/steps` 반환 → 화면 표시.

## 1) 가장 쉬운 배포 (내 PC에 Node 없어도 됨)
1. GitHub 새 저장소 만들기 → 압축 풀어 나온 **파일들** 업로드 (폴더째 업로드 X)
2. Vercel → **Add New → Project → Import Git**
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. 배포 후, **Project Settings → Environment Variables** 추가
   - `CF_ACCOUNT_ID` = Cloudflare Account ID
   - `CF_API_TOKEN` = Workers AI 실행 권한 포함 토큰
   - (선택) `CF_MODEL` = `@cf/meta/llama-3.2-11b-vision-instruct`
4. **Redeploy** → URL에서 이미지 업로드 → **AI 분석 실행**

> 환경변수 비어 있으면 서버가 `source: "demo"` 응답을 돌려줍니다(프론트는 정상 작동).

## 2) 로컬에서 테스트(선택)
```
npm install
npm run dev
# http://localhost:5173
```
- 로컬에서는 `/api`가 없으니, 버튼 클릭 시 **서버 호출 실패 → 로컬 휴리스틱**으로 결과를 보여줍니다.

## 3) 확인 포인트
- 결과 카드에 **AI/DEMO/LOCAL** 뱃지가 표시됩니다.
- AI가 실제로 돈다면 `AI`가 보여요. `DEMO`면 환경변수 미설정 상태입니다.

## 4) 다음 단계(선택)
- Supabase 로그인/DB 붙여 히스토리를 서버 저장
- 프롬프트/레이블 튜닝, 아이콘 전용 소형 분류 모델 추가
- 이미지 전처리(리사이즈·노이즈 제거) 고도화
