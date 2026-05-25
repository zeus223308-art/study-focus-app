# Memora

핸드폰 메모 앱처럼 가볍게 쓰는 **암기·복습 리마인더** 앱입니다.  
사용자가 정리한 스펙 기준으로 구현 중입니다.

## 구현됨 (v1)

- 보관함 · 과목 폴더 · 날짜별 사진 스택(여러 장 겹침 표시)
- 앱 내 카메라 · 촬영 후 「오늘 날짜로 저장」 · 과목 선택
- 복습 주기 (2일마다 / 1·3·5·7일 / 3일마다) · 대시보드 자동 계산
- 오늘의 복습 · 슬라이드쇼(5/10/30초)
- 아카이브 · 시험 직전 태그 · 검색(메모·태그)
- 레이어 on/off · 필기 추가 시 주기 유지/리셋 선택
- 휴지통(익일 자동 삭제, 3일 내 복원)
- 한/영 언어 설정 · 일일 복습 알림
- 디자인: 베이지·흑백 + 주황 포인트(~5%)
- Google Drive appDataFolder 백업 (웹 · Settings에서 연결)

## 스펙상 추후

- OCR 문서 검색
- 3·2·1 백지 공부 · 80% 채점 · 광고/유료
- 위젯 · 드래그 앤 드롭 · PDF · 단권화 · 필기 펜/형광펜

## Google Drive 백업 (웹)

앱 데이터와 사진을 **Google Drive appDataFolder**에 백업해, 웹 앱 업데이트·브라우저 변경 후에도 같은 Google 계정으로 복원할 수 있습니다.

### 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 생성
2. **APIs & Services** → **Enable APIs** → **Google Drive API** 사용 설정
3. **OAuth consent screen** → External → 테스트 사용자에 본인 Gmail 추가
4. **Credentials** → **Create credentials** → **OAuth client ID** → **Web application**
5. **Authorized JavaScript origins**
   - `https://zeus223308-art.github.io`
   - `http://localhost:4173`
   - `http://localhost:8081`
6. **Authorized redirect URIs** — 앱 Settings 화면 하단(개발 모드) 또는 브라우저 콘솔에서 `makeRedirectUri` 값 확인 후 등록. 예:
   - `https://zeus223308-art.github.io/study-focus-app`
   - `http://localhost:4173`

### 2. 환경 변수

`.env.example`을 `.env`로 복사하고 Web client ID를 넣습니다.

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

GitHub Pages 배포 시 **Repository secrets**에 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`를 **개발자가 1회만** 추가합니다. 이후 배포된 앱에서는 **일반 사용자는 Google 로그인만** 하면 됩니다 (Client ID 입력 불필요).

**Android / iOS 앱**에서는 Web Client ID만으로 로그인하면 `400` · *Access blocked: Authorization Error*가 자주 납니다. 같은 Google Cloud 프로젝트에서:

1. **OAuth 동의 화면 → 테스트 사용자**에 테스터 Gmail 추가 (앱 빌드에 쓰는 Client ID와 **같은 프로젝트**).
2. **Android OAuth 클라이언트**: 패키지 `com.memorysherpa.app`, 릴리스 SHA-1 (`eas credentials -p android`).
3. **iOS OAuth 클라이언트**: 번들 ID `com.memorysherpa.app`.
4. `.env` / EAS secrets에 `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` 설정 후 **앱 재빌드**.

Web 클라이언트만 쓸 때는 Settings에 표시되는 **모바일 redirect URI**를 Web 클라이언트의 Authorized redirect URIs에 추가하세요.

```powershell
npm run setup:google-oauth -- YOUR_ID.apps.googleusercontent.com
```

### 3. 사용자 vs 개발자

| | 개발자 (당신) | 다른 사용자 |
|--|--------------|------------|
| Google Cloud Console | 1회 설정 | **불필요** |
| Client ID | GitHub Secret에 1회 | **볼 필요 없음** |
| 앱에서 할 일 | 배포 확인 | **Google 아이디로 로그인** |

Settings → **Google 아이디로 로그인** → 내 Drive에 자동 백업·복원.

> 백업 파일은 Drive 앱 데이터 폴더에만 보이며, 사용자가 일반 Drive UI에서 보지 못합니다.

## 실행

```bash
npm install
npx expo start
```

## 웹 미리보기 (다른 사람과 공유)

앱을 **정적 웹사이트**로 빌드해 GitHub Pages에 올릴 수 있습니다.

### 공개 URL (배포 후)

**https://zeus223308-art.github.io/study-focus-app/**

`main` 브랜치에 push하면 GitHub Actions가 자동으로 `gh-pages` 브랜치에 배포합니다.

### 최초 1회 — GitHub Pages 켜기

1. GitHub 저장소 → **Settings** → **Pages**
2. **Build and deployment** → Source: **Deploy from a branch**
3. Branch: **`gh-pages`** / **`/ (root)`** → Save  
   (첫 배포 워크플로우가 끝난 뒤 `gh-pages` 브랜치가 생깁니다)

### 로컬에서 웹 빌드 확인

```bash
npm run export:web
npm run serve:web
```

브라우저: http://localhost:4173

GitHub Pages와 동일 경로로 테스트하려면 (PowerShell):

```powershell
$env:EXPO_PUBLIC_BASE_PATH='/study-focus-app'
npm run export:web
npm run serve:web
```

→ http://localhost:4173/study-focus-app/

> 웹은 **미리보기·데모**용입니다. 카메라·알림 등은 네이티브 앱에서 완전히 동작합니다. 데이터는 브라우저(IndexedDB)에 저장됩니다.

## 빌드

```bash
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```
