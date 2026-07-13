# API 명세서 — 홈 / 캘린더 / 날짜별 기록 조회

> 담당: 홈(Home) · 캘린더(Calendar) 화면 백엔드
> 범위: 홈 화면 조회, 월간 캘린더 조회, 날짜별 기록 상세 조회 (모두 **조회 전용 / GET**)
> 관련 기능 ID: `H101`, `H102`, `C101`, `C102`

---

## 1. 개요

> 팀 공통 API 규칙(응답 형식·에러 코드·공통 코드값)을 따릅니다. 아래는 그 요약이며, 본 화면 범위에 해당하는 부분만 발췌했습니다.

### 1.1 공통 규약

| 항목 | 값 |
| --- | --- |
| Base URL | `/api/v1` |
| 인증 | `Authorization: Bearer {accessToken}` (모든 엔드포인트 필수) |
| Content-Type | `application/json` |
| 타임존 | `Asia/Seoul` (KST) |
| 날짜 형식 | `YYYY-MM-DD` |
| 일시 형식 | ISO 8601 (`YYYY-MM-DDTHH:mm:ss`) |

### 1.2 공통 응답 형식

**성공**

```json
{
  "success": true,
  "data": {},
  "message": "요청이 성공적으로 처리되었습니다."
}
```

**실패**

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "에러 메시지"
}
```

> 아래 각 엔드포인트의 Response 예시는 위 래퍼 중 **`data` 내용만** 표기합니다. 실제 응답은 §1.2 성공 래퍼로 감쌉니다.

### 1.3 이 화면에서 사용하는 에러

| HTTP | code | 설명 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 필수 파라미터 누락 / 형식 오류 (year·month·date 등) |
| 401 | `UNAUTHORIZED` | 토큰 없음 / 만료 / 유효하지 않음 (기능명세 `A-2` 대응) |
| 500 | `INTERNAL_SERVER_ERROR` | 서버 내부 오류 |

---

## 2. 공통 Enum 코드

프론트/백엔드가 동일하게 해석해야 하는 코드값입니다. DB에는 아래 **코드(1자리)** 로 저장하고, 라벨 매핑은 클라이언트에서 처리합니다.

### 2.1 부글 기록 (`boogle_record`)

| 필드 | 코드 → 의미 |
| --- | --- |
| `hasBowel` (`has_bowel`) | `true` 배변함 / `false` 배변 안 함 *(boolean)* |
| `stoolBristol` | `1`~`7` (브리스톨 척도) |
| `stoolSimple` | `H` 딱딱 / `M` 보통 / `T` 묽음 *(백엔드 자동 변환: 1~2=H, 3~4=M, 5~7=T)* |
| `bowelFeeling` | `C` 편안 / `N` 보통 / `H` 힘듦 |
| `stomach` (복통) | `N` 없음 / `M` 보통 / `L` 심함 |
| `distension` (복부팽만) | `N` 없음 / `M` 보통 / `L` 심함 |
| `remainingFeeling` (잔변감) | `N` 없음 / `M` 보통 / `L` 심함 |
| `urgency` (긴박감) | `N` 없음 / `M` 보통 / `L` 심함 |
| `takenTime` (소요시간) | `1` 5분 이하 / `2` 5~15분 / `3` 15분 이상 *(공통 문서 미정의 — §9 참고)* |
| `amount` (양) | `S` 적음 / `N` 보통 / `M` 많음 |
| `color` (색상) | `B` 갈색 / `D` 어두운색 / `N` 검은색 / `R` 붉은색 / `G` 회색 / `E` 초록색 |
| `boogleRecordStatus` | `A` 활성 / `D` 삭제 |

### 2.2 생활 기록 (`life_record`)

| 필드 | 코드 → 의미 |
| --- | --- |
| `sleep` | `G` 좋음 / `N` 보통 / `B` 부족 |
| `stress` | `L` 낮음 / `N` 보통 / `H` 높음 |
| `water` | `L` 부족 / `N` 보통 / `H` 충분 |
| `mealRegular` | `R` 규칙 / `N` 보통 / `I` 불규칙 |
| `sleepTime` | `1` 5시간 이하 / `2` 5~7시간 / `3` 7시간 이상 |
| `exercise` | `N` 안함 / `L` 가볍게 / `H` 충분히 |
| `caffeine` | `N` 없음 / `O` 1잔 / `M` 2잔 이상 |
| `medicine` | `C` 감기약 / `V` 항생제 / `L` 유산균 / `I` 철분제 / `B` 변비약 / `E` 기타 |
| `outing` | `N` 평소와 같음 / `L` 외출 많음 / `T` 여행 중 |
| `hormone` | `N` 없음 / `M` 생리 중 / `E` 변화 있음 |

### 2.3 캘린더 날짜 상태

| 코드 | 의미 | 색상 |
| --- | --- | --- |
| `BOWEL` | 배변 기록 있음 (`has_bowel = true`) | 초록 |
| `NO_BOWEL` | 배변 없음 기록 (`has_bowel = false`) | 노랑 |
| `NONE` | 미기록 | 빈칸 |

### 2.4 위험 신호 (참고)

백엔드 고정 룰 (AI 판단 없음). 실제 화면에서는 **알림(Notification) 화면**에 노출됨 (홈 응답에는 미포함, §9 참고).

| 코드 | 조건 |
| --- | --- |
| `FLAG_BLOOD_RED` | 변 색상 `R` (붉은색 의심) |
| `FLAG_BLOOD_BLACK` | 변 색상 `N` (검은색 의심) |
| `FLAG_PAIN_SEVERE` | 복통 `L` (심함) |

---

## 3. API 목록

| # | Method | Path | 설명 | 기능 ID |
| --- | --- | --- | --- | --- |
| 1 | GET | `/api/v1/home` | 홈 화면 데이터 (사용자·주간스트립·오늘 기록·주간 패턴) | H101, H102 |
| 2 | GET | `/api/v1/calendar` | 월간 캘린더 조회 | C101 |
| 3 | GET | `/api/v1/calendar/daily` | 날짜별 기록 상세 조회 | C102 |

---

## 4. GET /api/v1/home

홈 화면에 필요한 오늘 기준 데이터를 한 번에 반환합니다.
(사용자 정보 + 주간 날짜 스트립 + 오늘 부글 기록 리스트 + 오늘 생활 기록 요약 + 이번 주 패턴)

### Request

| 위치 | 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | string | ✅ | `Bearer {accessToken}` |
| Query | `date` | string(`YYYY-MM-DD`) | ❌ | 기준 날짜. 생략 시 서버 오늘 날짜(KST) |

```http
GET /api/v1/home
Authorization: Bearer eyJhbGc...
```

### Response 200 — `data`

```json
{
  "user": {
    "id": 1,
    "nickname": "땅콩잼",
    "userType": "R",
    "userTypeLabel": "규칙형",
    "joinedDays": 12
  },
  "today": {
    "date": "2026-05-12",
    "greeting": "오늘 부글 신호를 보냈어요!"
  },
  "streak": 2,
  "weekStrip": [
    { "date": "2026-05-10", "hasRecord": false },
    { "date": "2026-05-11", "hasRecord": true },
    { "date": "2026-05-12", "hasRecord": true },
    { "date": "2026-05-13", "hasRecord": false },
    { "date": "2026-05-14", "hasRecord": false },
    { "date": "2026-05-15", "hasRecord": false },
    { "date": "2026-05-16", "hasRecord": false }
  ],
  "boogleCount": 2,
  "boogleRecords": [
    {
      "id": 100,
      "regDate": "2026-05-12T08:30:00",
      "hasBowel": true,
      "stoolBristol": 4,
      "stoolSimple": "M",
      "bowelFeeling": "C",
      "stomach": "N"
    },
    {
      "id": 101,
      "regDate": "2026-05-12T17:30:00",
      "hasBowel": true,
      "stoolBristol": 6,
      "stoolSimple": "T",
      "bowelFeeling": "H",
      "stomach": "N"
    }
  ],
  "lifeRecord": {
    "id": 55,
    "regDate": "2026-05-12T21:00:00",
    "sleep": "B",
    "stress": "L",
    "water": "L",
    "mealRegular": "R",
    "foods": [
      { "id": 7, "name": "야식" },
      { "id": 1, "name": "자극적인 음식" }
    ]
  },
  "weeklyPattern": {
    "ruleCode": "CONSTIPATION_PATTERN",
    "label": "딱딱한 변 경향",
    "description": "수분이 부족했던 날과 함께 나타났어요."
  }
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `user.nickname` | string | 닉네임 (`member.nickname`) |
| `user.userType` | string \| null | 최근 월간 유형 코드(공통 문서 §6 월간). 유형 산출 전이면 `null` |
| `user.userTypeLabel` | string \| null | 유형 한글 라벨 (`규칙형` 등) |
| `user.joinedDays` | int | 가입 후 경과일 (`member.reg_date` 기준, 가입일 = 1일째) |
| `today.greeting` | string | 인사/상태 메시지 (오늘 기록 상태 기반) |
| `streak` | int | 연속 기록 일수 (배너 "N일 연속 기록 중") |
| `weekStrip` | array(7) | 오늘이 포함된 주(일~토) 7일. 각 날짜의 기록 유무 → 날짜 스트립 점 표시용 |
| `weekStrip[].hasRecord` | boolean | 그날 부글 기록 존재 여부 |
| `boogleCount` | int | 오늘 부글 기록 건수 ("오늘 N회 기록했어요") |
| `boogleRecords` | array | 오늘 부글 기록 **요약 리스트** (시간 오름차순). 없으면 `[]` → '기록하기' 유도 |
| `lifeRecord` | object \| null | 오늘 생활 기록 **요약**(+음식 태그). 없으면 `null` → '생활도 기록할까요?' 유도 |
| `lifeRecord.foods` | array | 오늘 먹은 것 태그 (`life_food_tag` → `food`) |
| `weeklyPattern` | object \| null | 이번 주 대표 패턴 1건. 없으면 `null` → 카드 숨김 |

> 💡 부글 기록은 **하루 여러 건** 가능 → 배열(`boogleRecords`) + 건수(`boogleCount`)로 반환. 상세 항목(복부팽만·색상·메모 등)은 홈에서 생략, 상세는 `#6` 사용.
> ⚠️ `weeklyPattern`은 **리포트/가이드 도메인(주간 패턴 산출) 데이터**에 의존합니다. 홈은 산출 결과를 읽어 표시만 함 → 해당 팀과 데이터 소스/포맷 협의 필요.

---

## 5. GET /api/v1/calendar

지정한 연/월의 날짜별 상태와 월간 요약 통계를 반환합니다.

### Request

| 위치 | 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | string | ✅ | `Bearer {accessToken}` |
| Query | `year` | int | ✅ | 연도 (예: `2026`) |
| Query | `month` | int | ✅ | 월 `1`~`12` |

```http
GET /api/v1/calendar?year=2026&month=6
Authorization: Bearer eyJhbGc...
```

### Response 200 — `data`

```json
{
  "year": 2026,
  "month": 6,
  "days": [
    { "date": "2026-06-01", "boogleStatus": "BOWEL", "hasLifeRecord": true, "stoolSimple": "M" },
    { "date": "2026-06-02", "boogleStatus": "NO_BOWEL", "hasLifeRecord": false, "stoolSimple": null },
    { "date": "2026-06-03", "boogleStatus": "NONE", "hasLifeRecord": true, "stoolSimple": null }
  ],
  "summary": {
    "recordedDays": 10,
    "noBowelDays": 3,
    "unrecordedDays": 17,
    "stoolDistribution": {
      "hard":   { "count": 6,  "percent": 30 },
      "normal": { "count": 10, "percent": 50 },
      "loose":  { "count": 4,  "percent": 20 }
    }
  }
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `days` | array | 해당 월 **1일~말일 전체** (날짜 오름차순) |
| `days[].date` | string | 날짜 (`YYYY-MM-DD`) |
| `days[].boogleStatus` | enum | `BOWEL`(🟠 부글) / `NO_BOWEL`(🟡 배변없음) / `NONE`(부글 기록 없음) |
| `days[].hasLifeRecord` | boolean | 그날 생활 기록 존재 여부 (🟢 생활 점 표시용) |
| `days[].stoolSimple` | enum \| null | `boogleStatus=BOWEL`일 때만 값 존재, 그 외 `null` |
| `summary.recordedDays` | int | 부글 기록이 존재하는 날 수 (`BOWEL` + `NO_BOWEL`) |
| `summary.noBowelDays` | int | 배변 없음(`NO_BOWEL`) 날 수 |
| `summary.unrecordedDays` | int | 부글 미기록(`NONE`) 날 수 |
| `summary.stoolDistribution` | object | 배변 있음 기록의 변 상태 분포 (count + 반올림 percent) |

> 📌 캘린더 점은 3종: 부글 상태(`boogleStatus`)로 🟠/🟡, 생활 기록(`hasLifeRecord`)으로 🟢. 한 날짜에 두 점 동시 표시 가능.
> 📌 `summary` 3종은 **부글 기록 기준**. 생활만 기록한 날(`boogleStatus=NONE` + `hasLifeRecord=true`)은 `unrecordedDays`에 포함됨.
> 📌 percent는 `BOWEL` 기록 총합 기준 반올림. 합이 100이 안 될 수 있으니 프론트 표기 시 주의.

### Error

| HTTP | code | 조건 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | `month`가 1~12 범위 밖 / `year`·`month` 누락 or 숫자 아님 |

---

## 6. GET /api/v1/calendar/daily

특정 날짜의 부글 기록 + 생활 기록 **전체 상세**를 반환합니다. 캘린더 날짜 탭 시 하단 상세 카드(`C102`)에 사용됩니다.

### Request

| 위치 | 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | string | ✅ | `Bearer {accessToken}` |
| Query | `date` | string(`YYYY-MM-DD`) | ✅ | 조회 날짜 |

```http
GET /api/v1/calendar/daily?date=2026-06-17
Authorization: Bearer eyJhbGc...
```

### Response 200 — `data`

```json
{
  "date": "2026-06-17",
  "boogleRecords": [
    {
      "id": 100,
      "regDate": "2026-06-17T08:30:00",
      "hasBowel": true,
      "stoolBristol": 4,
      "stoolSimple": "M",
      "bowelFeeling": "C",
      "stomach": "N",
      "distension": "N",
      "remainingFeeling": "N",
      "urgency": "N",
      "takenTime": 2,
      "amount": "N",
      "color": "B",
      "memo": "어제 회식에서 술을 많이 마셨어요.",
      "autoTags": ["음주", "야식"],
      "tags": [{ "id": 3, "name": "회식" }],
      "updatedAt": null
    }
  ],
  "lifeRecord": {
    "id": 55,
    "regDate": "2026-06-17T21:00:00",
    "sleep": "N",
    "stress": "L",
    "water": "H",
    "mealRegular": "R",
    "sleepTime": 2,
    "exercise": "L",
    "caffeine": "O",
    "medicine": "L",
    "outing": "N",
    "hormone": "N",
    "memo": null,
    "autoTags": [],
    "tags": [{ "id": 7, "name": "야식" }],
    "foods": [{ "id": 2, "name": "기름진 음식" }],
    "updatedAt": null
  }
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `boogleRecords` | array | 해당 날짜 부글 기록 **전체 리스트**(하루 여러 건 가능, 시간순). 없으면 `[]` |
| `lifeRecord` | object \| null | 해당 날짜 생활 기록(하루 1건). 없으면 `null` |
| `*.autoTags` | string[] | LLM 자동 추출 태그. `auto_tags`(콤마 문자열)를 배열로 파싱해 반환 |
| `*.tags` | object[] | 연결된 태그 (`boogle_tags`/`life_tags` → `tags`) |
| `lifeRecord.foods` | object[] | 먹은 것 태그 (`life_food_tag` → `food`) |
| `lifeRecord.hormone` 등 민감정보 | - | 민감정보 미동의 사용자는 해당 필드가 `null`로 저장되어 있음 |

> 📌 부글 기록이 없으면 `boogleRecords: []`, 생활 기록이 없으면 `lifeRecord: null`. **둘 다 없어도 404가 아니라 200**으로 반환합니다. (기능명세: "이 날은 기록이 없어요"는 프론트 표시 상태)

### Error

| HTTP | code | 조건 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | `date` 누락 / 형식 오류 |

---

## 7. 인증 & 소유권

- 모든 엔드포인트는 JWT의 `userId`를 기준으로 **본인 데이터만** 조회합니다. (쿼리에 별도 userId 파라미터 없음)
- 토큰 만료/무효 → `401 UNAUTHORIZED` (기능명세 `A-2`: 프론트가 로그인 화면 리다이렉션 처리)

---

## 8. 구현 노트 (Prisma)

> 내 구현 참고용. 실제 모델명은 `schema.prisma` 확정 후 정리.

- **home**: `member`(user) 1건 + 오늘 `boogle_record` **여러 건**(리스트) + `life_record` 1건(+음식 태그) + 이번 주(일~토) 날짜별 기록 유무(weekStrip) + 이번 주 패턴(리포트팀 산출 결과).
  - `userType`: 최근 `monthly_record.user_type` 조회 (없으면 null).
  - `joinedDays`: `DATEDIFF(today, member.reg_date) + 1`.
  - `streak`: 오늘부터 거꾸로 연속으로 기록이 있는 일수 (기준=부글 기록, §9 확인).
  - `weekStrip`: 이번 주 범위에서 `boogle_record` 있는 날짜 집합 → 7일 매핑.
- **calendar**: `boogle_record` + `life_record` 를 각각 월 범위(`reg_date BETWEEN 월초 AND 월말 AND status='A'`)로 조회.
  - 월 전체 날짜 배열은 서버에서 생성 후 병합: 날짜별 `boogleStatus`(부글) + `hasLifeRecord`(생활) 판정.
  - 하루 여러 건일 때 날짜 대표값(`stoolSimple`) 규칙 필요(§9).
  - `stoolDistribution`은 `has_bowl=true` 건들의 `stool_simple` 집계.
- **calendar/daily**: 해당 날짜 `boogle_record` **여러 건** + `life_record` 1건(+ `boogle_tags`/`life_tags`/`life_food_tag` join). 경로는 부글 도메인 `/records` 충돌 회피 위해 `/calendar` 하위에 둠.
- 날짜 범위 조회 시 KST 기준 하루 경계(`00:00:00` ~ `23:59:59`) 주의. `reg_date`가 `datetime`이므로 날짜만으로 매칭 X.
- `status='A'`(삭제 안 된 것)만 조회.

---

## 9. 확인 필요 사항

> 응답 형식·에러 코드·Base URL은 팀 공통 규칙에 맞췄습니다. 아래는 이 화면 특화로 남은 항목.

1. **하루 여러 건 기록 → 캘린더 날짜 대표값** — 부글 기록은 하루 N건 가능. 캘린더 한 칸의 `stoolSimple`/색상을 무엇으로 정할지 규칙 필요(예: 마지막 기록 / 대표 1건 / 우선순위). weekStrip 점 표시에도 동일 이슈.
2. **홈 `weeklyPattern` 데이터 소스** — 이번 주 패턴 카드는 리포트/가이드팀 산출물. 어느 API/테이블에서 읽는지, 없을 때 `null` 규칙, `ruleCode`↔문구 매핑 주체 협의 필요.
3. **위험신호(alert) 위치** — 실제 화면상 위험신호는 **알림 화면**에 있음(홈 X). 알림 화면/API 담당이 미지정으로 보임 → 스코프 확인. (홈 응답에서는 제외해 둠)
4. **홈의 `userType` 출처** — 가입 12일 사용자는 월간 유형(15일↑ 필요) 산출 전인데 화면엔 "규칙형" 표기됨. → `monthly_record` 기준인지 / `baseline_type` 매핑인지 확정 필요.
5. **날짜 경계 정책** — 하루 기준을 자정으로 볼지, 새벽 기록(예: 03시)을 전날로 볼지. (KST 기준 `reg_date` 범위 조회에 영향)
6. **`stoolDistribution` percent 반올림** 방식 — 합계 100 보정 여부.
7. **`takenTime`(배변 소요시간) 코드값 미정의** — 공통 문서 §3(배변 기록)에 `takenTime`이 빠져 있음. 현재 `sleepTime`과 동일하게 `1`/`2`/`3` 3단계로 가정. 공통 문서에 추가 필요.
