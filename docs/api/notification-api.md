# API 명세서 — 알림

> 담당: 알림(Notification) 백엔드
> 범위: 알림 목록 조회 (조회 전용 / GET)
> 관련 기능 ID: `N101`~`N105` (전부 동일 API로 커버)

---

## 1. 개요

> 팀 공통 API 규칙(응답 형식·에러 코드·공통 코드값)을 따릅니다.

| 항목 | 값 |
| --- | --- |
| Base URL | `/api/v1` |
| 인증 | `Authorization: Bearer {accessToken}` |
| Content-Type | `application/json` |

## 2. 기능ID ↔ category / type 매핑

| 기능ID | 기능명 | category | type | linkTo |
| --- | --- | --- | --- | --- |
| N101 | 위험 신호 알림 | `W` | `WARNING` | `GUIDE_WARNING` |
| N102 | 기록 리마인더 | `R` | `RECORD_REMINDER` | `HOME` |
| N103 | 리포트 도착 알림 | `P` | `REPORT_READY` | `REPORT` |
| N104 | PDF 저장 완료 알림 | `P` | `PDF_SAVED` | `REPORT` |
| N105 | 연속 기록 독려 알림 | `R` | `STREAK` | `HOME` |

- `linkTo`는 DB 컬럼이 아니라 `category` 값으로부터 서버가 코드로 매핑해 내려준다 (`NOTIFICATION_LINK_TO` 상수).
- `type`은 `alarm.type` 컬럼에 저장된 의미 코드다. **아이콘 매핑용** — `category`(W/R/P, 3종/점 색)로는 5종 아이콘을 구분할 수 없어 별도 필드로 둔다. 프론트가 `type` → 아이콘으로 매핑한다.
- `alarm.type`은 DB상 자유 문자열이라, 서버는 위 5종만 그대로 내려주고 **값이 없거나(null) 계약 밖 값이면 `null`로 폴백**한다. 즉 응답의 `type`은 항상 5종 중 하나 또는 `null`이다.

---

## 3. GET /api/v1/notifications — 알림 목록 조회

### Request

| 위치 | 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | string | ✅ | `Bearer {accessToken}` |

```http
GET /api/v1/notifications
Authorization: Bearer eyJhbGc...
```

### Response 200 — `data`

```json
{
  "unreadCount": 1,
  "notifications": [
    {
      "id": 5001,
      "category": "W",
      "type": "WARNING",
      "title": "주의가 필요한 기록이 있어요",
      "content": "오늘 기록에서 붉은색 변이 감지됐어요. 가이드 탭에서 자세한 안내를 확인해보세요.",
      "linkTo": "GUIDE_WARNING",
      "regDate": "2026-05-12T14:32:00",
      "isRead": false
    },
    {
      "id": 5000,
      "category": "R",
      "type": "RECORD_REMINDER",
      "title": "기록할 시간이에요",
      "content": "30초면 충분해요. 지금 기록해볼까요?",
      "linkTo": "HOME",
      "regDate": "2026-05-12T18:00:00",
      "isRead": true
    }
  ]
}
```

### Response Body 설명

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| unreadCount | number | Y | 안읽음 알림 개수(🔔 뱃지용) |
| notifications | array | Y | 알림 목록(reg_date 내림차순). 없으면 `[]` |
| notifications[].id | number | Y | 알림 ID (`alarm_map.id`) |
| notifications[].category | string | Y | `W`(위험) / `R`(기록) / `P`(리포트) — 점 색 표시용 |
| notifications[].type | string \| null | Y | 아이콘 매핑용 의미 코드 (`WARNING`/`RECORD_REMINDER`/`REPORT_READY`/`PDF_SAVED`/`STREAK`). 값이 없거나 계약 밖 값이면 `null` → 프론트 기본 아이콘 폴백 |
| notifications[].title | string | Y | 알림 제목 |
| notifications[].content | string | Y | 알림 내용 |
| notifications[].linkTo | string | Y | 탭 시 이동 화면 (`GUIDE_WARNING`/`HOME`/`REPORT`) |
| notifications[].regDate | string | Y | 발생 일시(ISO 8601) |
| notifications[].isRead | boolean | Y | 읽음 여부 |

### Error

```tsx
{ "success": false, "code": "UNAUTHORIZED", "message": "로그인이 필요합니다." }
{ "success": false, "code": "INTERNAL_SERVER_ERROR", "message": "서버 내부 오류가 발생했습니다." }
```

### DB 처리

| 사용 테이블 | 사용 목적 | 사용 컬럼 |
| --- | --- | --- |
| alarm_map | 본인 알림 목록 + 읽음 상태 조회(reg_date 내림차순) | user_id, alarm_id, reg_date, is_read |
| alarm → (join) | alarm_id로 종류·제목·내용 조인 | category, type, title, content |

> 📌 `alarm_map.alarm_id`는 스키마상 nullable이라, 알람 원본이 없는 행(`alarm: null`)은 목록에서 제외한다.

---

## 4. 알림 생성(트리거) 규칙 — 이 API 범위 밖 (참고용)

`alarm_map` insert는 각 도메인/배치가 담당하며, 이 조회 API는 관여하지 않는다.

| 기능ID | 발송 조건 | 트리거 방식 | 담당(추정) |
| --- | --- | --- | --- |
| N101 위험 신호 | 부글 기록 저장 시 위험 신호 감지 | 이벤트성 (기록 저장 API 내부) | 부글 기록팀 |
| N102 기록 리마인더 | 매일 오후 6시까지 당일 기록 없음 | 배치/스케줄러 (매일 18시) | 미정 |
| N103 리포트 도착 | 주간 리포트 생성 완료 | 이벤트성 (리포트 생성 로직 내부) | 리포트팀 |
| N104 PDF 저장 완료 | 월간 리포트 PDF 생성 완료 | 이벤트성 (PDF 생성 로직 내부) | 리포트팀 |
| N105 연속 기록 독려 | 연속 기록 3/7/30일, 이후 +10일마다 | 배치/스케줄러 (매일 실행) | 미정 |

## 5. 확인 필요 사항

1. **N102·N105 배치 담당** — 매일 전체 유저를 훑는 스케줄러가 필요한데 담당 미정.
2. **N101 예외 처리** — "알림 설정을 꺼도 항상 뜬다"는 게 `alarm_map` insert 자체를 늘 하라는 뜻인지, 앱 내 표시만 항상 하고 푸시(FCM)는 토글을 따르라는 뜻인지 확인 필요.
