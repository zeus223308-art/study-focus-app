# 스터디 포커스 (Study Focus)

포모도로 타이머와 과목별 공부 기록을 관리하는 모바일 공부 앱입니다.

## 기능

- **포모도로 타이머** — 집중 / 짧은 휴식 / 긴 휴식
- **과목별 기록** — 과목 추가·삭제, 세션 자동 저장
- **통계** — 오늘 집중 시간, 연속 학습 일수, 7일 차트, 과목별 분포
- **설정** — 타이머·일일 목표 커스터마이즈

## 로컬 실행

```bash
npm install
npx expo start
```

## 빌드 (EAS)

```bash
# Android APK
npx eas-cli build --platform android --profile production

# iOS (TestFlight 제출)
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

Expo 계정 로그인 및 Apple Developer 설정이 필요합니다.
