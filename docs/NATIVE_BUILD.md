# MemorySherpa 네이티브 빌드 (Android / iOS + ML Kit OCR)

Windows에서는 **iOS 로컬 prebuild/Xcode 빌드가 불가**합니다. iOS는 **EAS 클라우드 빌드**를 사용하세요.

## 1. EAS 로그인 (최초 1회)

```bash
cd study-focus-app
npx eas-cli login
npx eas-cli build:configure
```

## 2. Android APK (실기기 설치용)

```bash
npm run build:android:apk
```

또는

```bash
npx eas build -p android --profile preview
```

완료 후 터미널에 **다운로드 링크**가 나옵니다. APK를 폰에 설치하세요.

### USB로 바로 설치 (PC + Android 폰)

```bash
npx expo run:android
```

## 3. iOS Google 로그인 (테스터)

iPhone에서 Drive 로그인 400 오류 → **[GOOGLE_OAUTH_IOS.md](./GOOGLE_OAUTH_IOS.md)** (iOS OAuth 클라이언트 + EAS secret + 재빌드).

## 4. iOS (기기 없어도 빌드는 가능)

### A) 실제 iPhone (나중에 기기 생기면)

- Apple Developer Program ($99/년) 필요
- `preview` 프로필:

```bash
npm run build:ios:device
```

### B) iOS 시뮬레이터용 (Mac에서만 실행)

```bash
npm run build:ios:sim
```

`.app` / 시뮬레이터 빌드를 Mac에서 받아 실행합니다.

## 5. Android + iOS 동시에

```bash
npm run build:native:preview
```

## 6. OCR 테스트

- **Expo Go 불가** — 위 개발 빌드 또는 APK/IPA 필요
- 촬영 → 번들 화면 **「인식된 글자」** / **다시 인식**
- 검색에서 인식 텍스트로 찾기

## 프로필 요약

| 프로필 | Android | iOS |
|--------|---------|-----|
| `preview` | APK (internal) | iPhone 설치용 |
| `preview-simulator` | — | 시뮬레이터 |
| `development` | Dev Client | Dev Client |
