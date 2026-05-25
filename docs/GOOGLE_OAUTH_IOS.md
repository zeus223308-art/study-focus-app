# iOS Google 로그인 (테스터 · TestFlight · 내부 배포)

`whichone7@gmail.com` 같은 **iOS 테스터**가 `400` / *Access blocked* 없이 Drive 로그인하려면 **Web Client ID만으로는 부족**합니다. 아래를 **같은 Google Cloud 프로젝트**에서 진행하세요.

## 1. 테스트 사용자

1. [OAuth 동의 화면](https://console.cloud.google.com/apis/credentials/consent)
2. **테스트 사용자**에 `whichone7@gmail.com` 추가
3. iPhone **설정 → Google / Safari**에서 로그인할 계정이 **그 Gmail**인지 확인

## 2. iOS OAuth 클라이언트 만들기

1. [사용자 인증 정보](https://console.cloud.google.com/apis/credentials) → **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
2. 유형: **iOS**
3. **번들 ID**: `com.memorysherpa.app` (앱과 동일해야 함)
4. 생성 후 **iOS Client ID** 복사 (`….apps.googleusercontent.com`)

## 3. EAS 빌드에 Client ID 넣기

로컬 `.env`만 바꾸면 **이미 설치된 IPA는 변하지 않습니다.** EAS secret + **새 iOS 빌드**가 필요합니다.

```bash
cd study-focus-app
npx eas-cli secret:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com" --scope project
```

(이미 Web ID가 있다면 그대로 두고 iOS만 추가)

## 4. iOS 앱 다시 빌드 · 배포

```bash
npx eas build -p ios --profile preview
# 또는 TestFlight용 production
```

빌드 완료 후 테스터에게 **새 설치 링크 / TestFlight**로 받게 하세요.

## 5. 테스터가 할 일

1. **새 빌드** 설치 (예전 IPA로는 iOS Client ID가 반영되지 않음)
2. 앱 **설정 → Google 로그인**
3. 반드시 **`whichone7@gmail.com`** 으로 로그인

## 체크리스트

| 항목 | 값 |
|------|-----|
| 번들 ID | `com.memorysherpa.app` |
| 테스트 사용자 | `whichone7@gmail.com` |
| EAS secret | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| Web Client ID와 동일 GCP 프로젝트 | 필수 |

## 여전히 실패할 때

- 동의 화면이 **Testing**인데 테스트 사용자에 없음 → 차단
- **다른 Google 계정**으로 로그인 시도 → 차단
- **옛 IPA** 사용 → iOS Client ID 미포함 → 400
- Web Client ID만 넣고 iOS Client ID secret 없이 빌드 → 400
