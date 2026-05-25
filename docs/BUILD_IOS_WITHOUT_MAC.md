# Mac / iOS 개발 환경 없이 iPhone용 앱 만들기

**Mac이나 Xcode는 필요 없습니다.** Expo **EAS Build**가 클라우드에서 iOS 앱을 만듭니다. Windows만 있으면 됩니다.

## whichone7 테스터 — 당장 쓸 수 있는 방법

**iPhone Safari**에서 웹 앱을 쓰면 Mac·빌드 없이 Google 로그인이 됩니다.

- https://zeus223308-art.github.io/study-focus-app/
- 홈 화면에 **추가**하면 앱처럼 사용 가능 (일부 기능은 네이티브만 지원)

네이티브(카메라·ML Kit OCR 등)가 꼭 필요할 때만 아래 IPA 빌드를 진행하세요.

---

## 방법 A: GitHub에서 빌드 (추천, PC에서 `eas login` 불필요)

### 1. Expo 액세스 토큰 만들기

1. [expo.dev](https://expo.dev) 로그인 (Expo 계정 없으면 가입)
2. **Account Settings → Access Tokens** → **Create token**
3. GitHub 저장소 → **Settings → Secrets and variables → Actions**
4. **New repository secret**
   - Name: `EXPO_TOKEN`
   - Value: 방금 만든 토큰

### 2. 워크플로 실행

1. GitHub → **Actions** → **EAS Native Build** → **Run workflow**
2. Platform: **ios** → Run
3. 완료 후 Expo 대시보드 또는 Actions 로그에 **설치 링크** 표시

### 3. iPhone에 설치

- **내부 배포(Internal)** 링크로 설치
- 처음 iOS 빌드 시 **Apple Developer Program** ($99/년) 연동이 필요할 수 있음  
  (EAS가 안내하거나 [credentials 문서](https://docs.expo.dev/app-signing/apple-credentials/) 참고)

---

## 방법 B: Windows 터미널에서 빌드

Mac은 필요 없고, **Expo 로그인만** 필요합니다.

```powershell
cd study-focus-app
npx eas-cli login
npx eas-cli build -p ios --profile preview
```

빌드는 Expo 서버에서 진행됩니다.

---

## 자주 하는 오해

| 오해 | 실제 |
|------|------|
| Mac이 있어야 iOS 빌드 | ❌ EAS 클라우드 빌드면 Windows만으로 가능 |
| iOS 시뮬레이터 빌드로 iPhone 테스트 | ❌ 시뮬레이터 빌드는 **Mac에서만** 실행 |
| Google Cloud만 하면 IPA에 반영 | ❌ **새 EAS 빌드** 후 테스터가 새 앱 설치 |

---

## Apple Developer 없을 때

실제 iPhone에 **설치 가능한 IPA**를 내려면 보통 **Apple Developer Program**이 필요합니다.

- 없으면: 테스터는 **웹 앱** 사용
- 있으면: GitHub Actions 또는 `eas build`로 IPA 생성 후 링크 공유

---

## 이미 설정된 것

- iOS OAuth Client ID → `eas.json` / `.env`
- OAuth 테스트 사용자 → `whichone7@gmail.com` (Console)
- EAS project ID → `app.json` `extra.eas.projectId`
