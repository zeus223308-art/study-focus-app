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

## 스펙상 추후

- OCR 문서 검색
- Google Drive (썸네일 로컬 / 원본 클라우드)
- 3·2·1 백지 공부 · 80% 채점 · 광고/유료
- 위젯 · 드래그 앤 드롭 · PDF · 단권화 · 필기 펜/형광펜

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
