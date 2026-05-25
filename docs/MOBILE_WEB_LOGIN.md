# 모바일에서 APK 없이 Google 로그인 (웹)

네이티브 APK/IPA 없이 **휴대폰 브라우저**만으로 Drive 백업·로그인이 가능합니다.

## 접속 주소 (이 URL만 사용)

**https://zeus223308-art.github.io/study-focus-app/**

- 끝에 `/study-focus-app` 경로가 있어야 합니다 (루트만 열면 OAuth가 깨질 수 있음)
- **Chrome** 또는 **Safari** 권장 (카카오톡·인스타 등 **인앱 브라우저**는 로그인 실패가 잦음)

## 로그인 절차

1. 위 주소로 접속
2. **설정** 탭 → **Google 로그인**
3. Google 계정 선택 (OAuth **테스트 사용자**에 등록된 Gmail)
4. 로그인 후 설정 화면으로 돌아오면 완료

## Google Cloud (이미 Web 클라이언트 있으면)

**Web application** OAuth 클라이언트에 다음이 있어야 합니다.

| 항목 | 값 |
|------|-----|
| JavaScript origins | `https://zeus223308-art.github.io` |
| Redirect URIs | `https://zeus223308-art.github.io/study-focus-app` |
| 테스트 사용자 | 로그인할 Gmail |

Android/iOS OAuth 클라이언트는 **웹 로그인에 필요 없습니다.**

## 홈 화면에 추가 (선택)

Safari **공유 → 홈 화면에 추가** / Chrome **앱 설치** → 앱처럼 실행 (여전히 웹 OAuth)

## 네이티브만 되는 기능

카메라·ML Kit OCR 등 일부 기능은 APK/IPA가 필요할 수 있습니다. Drive 동기화·기본 사용은 웹으로 가능합니다.
