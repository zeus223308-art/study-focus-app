# Free OCR & Handwriting (React + Vite + Tailwind)

브라우저·모바일 크로스 플랫폼 필기 캔버스 + OCR 페이지.

| 엔진 | 비용 | 품질 | 한도 |
|------|------|------|------|
| **Tesseract.js** | 0원 | 인쇄체 양호, 악필·필기체 약함 | 무제한 (기기 CPU) |
| **Groq Vision** (선택) | Groq 무료 한도 / BYOK | 손글씨·필기체 우수 | Groq 계정 정책 |

## STEP 1: 패키지 설치 (한 줄)

```bash
cd ocr-handwriting-vite && npm install react react-dom tesseract.js groq-sdk && npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
```

이미 `package.json`이 있으면:

```bash
cd ocr-handwriting-vite && npm install
```

## STEP 2: 환경 변수

```bash
cp .env.example .env
```

`.env` 예시:

```env
VITE_GROQ_API_KEY=gsk_xxxxxxxx
VITE_GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
VITE_TESSERACT_LANG=kor+eng
```

- **Tesseract만**: `VITE_GROQ_API_KEY` 비워 두기 → 무료·무제한
- **고품질**: [Groq Console](https://console.groq.com/keys)에서 API 키 발급

## 실행

```bash
npm run dev
```

## STEP 3: 프로젝트에 붙이기

`src/components/FreeOcrHandwriting.jsx` 를 복사한 뒤:

```jsx
import FreeOcrHandwriting from './components/FreeOcrHandwriting.jsx';

export default function App() {
  return <FreeOcrHandwriting />;
}
```

`vite.config.js`에 Tesseract worker 설정이 필요합니다 (`optimizeDeps.exclude`, `worker.format`).

## Safari / 모바일 대응

- `touch-action: none` + `passive: false` 터치 차단 (스크롤 간섭 방지)
- Pointer Events + `setPointerCapture` (Safari 터치 끊김 완화)
- `devicePixelRatio` 캔버스 스케일 (Retina 선명도)
- `overscroll-behavior: contain`, `-webkit-touch-callout: none`

## 보안

`VITE_GROQ_API_KEY`는 빌드에 포함되어 브라우저에 노출됩니다. **개인·데모·BYOK** 용도만 권장합니다. 공개 서비스는 백엔드 프록시를 사용하세요.
