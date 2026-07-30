# API 명세서 — 웹 푸시 (Push)

> 담당: 알림(Notification) 백엔드
> 범위: 웹 푸시(FCM) 기기 토큰 등록 — 리마인더·연속기록 푸시의 **1단계**
> 관련: 발송 모듈(2단계)·스케줄러(3단계)는 별도. 이 API는 토큰 저장만 담당.

---

## 1. 개요

| 항목 | 값 |
| --- | --- |
| Base URL | `/api/v1` |
| 인증 | `Authorization: Bearer {accessToken}` |
| Content-Type | `application/json` |

- 서비스는 웹앱이므로 네이티브 푸시가 아니라 **Web Push(FCM + PWA)** 로 구현한다.
- **토큰 발급·서비스워커 등록·권한 요청은 프론트(PWA) 담당.** 백엔드는 발급된
  토큰을 저장(이 API)하고, 이후 발송(2단계)에만 사용한다.

---

## 2. POST /api/v1/push/tokens — FCM 기기 토큰 등록

프론트가 FCM에서 발급받은 기기 토큰을 등록한다. 한 유저가 여러 기기(PC·폰)를
가질 수 있어 유저당 여러 토큰이 저장되며, **토큰 기준 upsert**로 재등록은 멱등하게
처리된다(이미 있으면 소유 유저만 갱신).

### Request

| 위치 | 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | string | ✅ | `Bearer {accessToken}` |
| Body | `token` | string | ✅ | FCM 기기 등록 토큰 (1~512자) |

```http
POST /api/v1/push/tokens
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{ "token": "fcm-registration-token..." }
```

### Response 201 — `data`

```json
{
  "token": "fcm-registration-token..."
}
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `token` | string | Y | 등록(또는 갱신)된 토큰. 요청 토큰이 반영됐는지 확인용 |

> 📌 **멱등**: 같은 토큰을 다시 등록해도 소유 유저만 갱신되고 중복 행이 생기지 않는다.

### Error

| HTTP | code | 조건 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | `token` 누락/빈 문자열/512자 초과 |
| 401 | `UNAUTHORIZED` | 토큰 없음 / 만료 / 유효하지 않음 |

### DB 처리

| 사용 테이블 | 사용 목적 | 사용 컬럼 |
| --- | --- | --- |
| push_token | 기기 토큰 저장(token 기준 upsert). 유저당 여러 기기 가능 | user_id, token, reg_date, update_date |

---

## 3. 필요한 환경변수 (참고 — 발송 단계에서 사용)

이 API(토큰 등록)는 Firebase 없이 동작하지만, 이후 발송(2단계)에서 아래 env가 필요하다.

| env | 정체 | 사용처 |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | 서비스 계정 JSON을 Base64 인코딩한 값 | 백엔드 발송 (Firebase Admin) |
| `FIREBASE_VAPID_KEY` | 웹 푸시 VAPID 공개키 | 주로 프론트 토큰 발급 |

> 🔒 서비스 계정 키는 시크릿이므로 레포에 커밋 금지, 배포 env로만 주입한다.
