# API 명세서 — 웹 푸시 (Push)

> 담당: 알림(Notification) 백엔드
> 범위: 웹 푸시(FCM) 기기 토큰 등록·해제 — 리마인더·연속기록 푸시의 **1단계**
> 관련: 발송 모듈(2단계)·스케줄러(3단계)는 별도. 이 API는 토큰 저장·삭제만 담당.

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
| 400 | `BAD_REQUEST` | `token` 누락/빈 문자열/512자 초과/문자열 아님 |
| 401 | `UNAUTHORIZED` | 토큰 없음 / 만료 / 유효하지 않음 |

### DB 처리

| 사용 테이블 | 사용 목적 | 사용 컬럼 |
| --- | --- | --- |
| push_token | 기기 토큰 저장(token 기준 upsert). 유저당 여러 기기 가능 | user_id, token, reg_date, update_date |

---

## 3. DELETE /api/v1/push/tokens — FCM 기기 토큰 해제

로그아웃/알림 끄기 시 **해당 기기의 토큰만** 해제한다. 공용 기기에서 로그아웃한 뒤
이전 사용자에게 푸시가 가는 것을 막기 위함. 프론트는 로그아웃 시 자신이 보유한
FCM 토큰으로 이 API를 호출한다.

### Request

| 위치 | 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | string | ✅ | `Bearer {accessToken}` |
| Body | `token` | string | ✅ | 해제할 FCM 기기 토큰 (1~512자) |

```http
DELETE /api/v1/push/tokens
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{ "token": "fcm-registration-token..." }
```

### Response 200 — `data`

```json
{
  "deleted": true
}
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `deleted` | boolean | Y | 실제로 삭제된 토큰이 있었으면 `true`, 이미 없던 토큰이면 `false` |

> 📌 **멱등**: 이미 없던 토큰을 해제해도 `200 { deleted: false }`로 성공한다. 로그아웃 재시도가 안전하다.
> 📌 **스코프**: `(user_id, token)` 조건으로 삭제한다. 같은 토큰이 다른 유저에게
> 재등록(소유 이전)된 경우 그 유저의 유효 토큰은 지우지 않는다.
> 📌 **범위**: 요청한 그 기기 토큰만 해제한다. 유저의 다른 기기(PC·폰) 토큰은
> 유지되어 다른 기기 푸시는 끊기지 않는다.

### Error

| HTTP | code | 조건 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | `token` 누락/빈 문자열/512자 초과/문자열 아님 |
| 401 | `UNAUTHORIZED` | 토큰 없음 / 만료 / 유효하지 않음 |

### DB 처리

| 사용 테이블 | 사용 목적 | 사용 컬럼 |
| --- | --- | --- |
| push_token | `(user_id, token)`로 스코프해 삭제(`deleteMany`) | user_id, token |

---

## 4. 필요한 환경변수 (참고 — 발송 단계에서 사용)

이 API(토큰 등록)는 Firebase 없이 동작하지만, 이후 발송(2단계)에서 아래 env가 필요하다.

| env | 정체 | 사용처 |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | 서비스 계정 JSON을 Base64 인코딩한 값 | 백엔드 발송 (Firebase Admin) |
| `FIREBASE_VAPID_KEY` | 웹 푸시 VAPID 공개키 | 주로 프론트 토큰 발급 |

> 🔒 서비스 계정 키는 시크릿이므로 레포에 커밋 금지, 배포 env로만 주입한다.

---

## 5. 발송 모듈 (2단계) — 내부 서비스 (API 아님)

각 도메인/배치는 아래 서비스를 주입해 푸시를 발송한다. (HTTP 엔드포인트 아님)

**`PushSenderService.send(userId, { notificationId, title, body, type, linkTo })`**
- 해당 유저의 `push_token` 전부를 조회해 **모든 기기로 발송**(멀티 기기).
- 발송 결과에서 만료·무효 토큰(`registration-token-not-registered` 등)은 `push_token`에서 **자동 삭제**(죽은 토큰 누적 방지).
- `FIREBASE_SERVICE_ACCOUNT_BASE64` 미설정 환경에서는 앱을 죽이지 않고 **발송을 no-op**으로 처리한다(토큰 등록 등 나머지 기능은 정상 동작).

**FCM 메시지는 data-only** (프론트 계약). `notification` 필드를 넣지 않고 `data`에만
담아, 백그라운드는 서비스워커의 `showNotification()`, 포그라운드는 `onMessage()`가
직접 표시한다(자동 표시·수동 표시 중복 방지). **FCM `data` 값은 모두 문자열**이라
`notificationId`는 문자열로 변환해 전송한다.

```ts
// 사용 예 (3단계 스케줄러 등에서)
await pushSenderService.send(userId, {
  notificationId: 123,          // 인앱 알림 DB id (문자열로 변환되어 전송)
  title: '기록할 시간이에요',
  body: '30초면 충분해요. 지금 기록해볼까요?',
  type: 'RECORD_REMINDER',      // WARNING/RECORD_REMINDER/REPORT_READY/PDF_SAVED/STREAK
  linkTo: 'HOME',               // GUIDE_WARNING/HOME/REPORT
});
```

실제 전송되는 FCM payload:

```json
{
  "data": {
    "notificationId": "123",
    "title": "기록할 시간이에요",
    "body": "30초면 충분해요. 지금 기록해볼까요?",
    "type": "RECORD_REMINDER",
    "linkTo": "HOME"
  }
}
```

> 📌 **범위**: 이 모듈은 "발송하는 도구"까지다. "언제 보낼지"(리마인더/연속기록 조건 판정)와 in-app 알림 생성(`NotificationCreationService`)을 함께 부르는 오케스트레이션은 **3단계(스케줄러)** 몫이다.
> 📌 발송 검증: 유닛테스트는 firebase-admin mock으로 커버. **실제 브라우저 수신**은 프론트(PWA)가 발급한 FCM 토큰이 있어야 확인 가능하다.

---

## 6. 스케줄러 (3단계) — 매일 배치 발송

`NotificationSchedulerService`가 매일 정해진 시각에 조건을 판정해, 대상 유저에게
**in-app 알림 생성 + 푸시 발송**을 함께 호출한다. (`@nestjs/schedule` 기반 cron)

| 알림 | 시각(KST) | 조건 | 발송 |
| --- | --- | --- | --- |
| N102 기록 리마인더 | 매일 18:00 | 오늘 부글 기록 없음 | `RECORD_REMINDER` 생성 + 푸시 |
| N105 연속기록 독려 | 매일 09:00 | **어제까지** 연속 기록 **1일 이상** | `STREAK`(며칠째) 생성 + 푸시 |

- **대상**: `status='A'` 이고 `record_alarm != 'N'`(null=기본 Y 포함)인 회원. 알림을 끈 유저는 제외.
- **기록 기준**: `boogle_record`(홈 streak과 동일). 오늘 기록이 있으면 리마인더 스킵.
- **연속 일수**: 아침 배치라 **어제까지**의 연속 일수를 센다(오늘 기록은 제외). 최근 60일까지 계산.
- **실패 격리**: 유저별로 예외를 격리해, 한 명 발송 실패가 배치 전체를 멈추지 않는다.
- **쿼리**: 대상 회원 ID로 DB에서 필터해 필요한 기록만 조회한다.
- **KST**: cron에 `timeZone: 'Asia/Seoul'` 지정. 배포 인스턴스 1개 전제(중복 실행 없음).
- 조건 판정 로직은 cron 데코레이터와 분리(`runRecordReminders`/`runStreakEncouragement`)해 유닛테스트한다.

> 📌 이벤트성 알림(위험/리포트/PDF)은 스케줄러가 아니라 각 도메인이 발생 시점에
> `NotificationCreationService.create()`를 호출해 심는다(이 스케줄러 범위 밖).
