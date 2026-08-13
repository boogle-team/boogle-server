# AUTH-08 소셜 계정 연동

## API 리스트 항목

| index           | name           | 기능 ID   | API ID  | EndPoint                  | Method | 설명                                                                            | BE 담당자 | FE 담당자 | 프론트 연동 여부 |
| --------------- | -------------- | --------- | ------- | ------------------------- | ------ | ------------------------------------------------------------------------------- | --------- | --------- | ---------------- |
| 회원가입,로그인 | 소셜 계정 연동 | A101,A102 | AUTH-08 | `/api/v1/auth/oauth/link` | POST   | 동일한 인증 이메일의 기존 사용자에게 새 소셜 로그인 수단을 연결하고 로그인 처리 | 준형 안   | 시연      | 시작 전          |

## 기본 정보

| 항목           | 내용                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 기능 ID        | A101,A102 / AUTH-08                                                                                                                                                                                                            |
| 기능명         | 소셜 계정 연동                                                                                                                                                                                                                 |
| EndPoint       | `/api/v1/auth/oauth/link`                                                                                                                                                                                                      |
| Method         | `POST`                                                                                                                                                                                                                         |
| Success Status | `200 OK`                                                                                                                                                                                                                       |
| 설명           | 소셜 로그인 결과 교환에서 동일한 인증 이메일의 기존 계정이 발견되었을 때 발급된 일회용 `accountLinkToken`을 사용하여 새 소셜 계정을 기존 사용자에게 연결합니다. 기존 프로필과 서비스 기록은 유지하며 로그인 토큰을 발급합니다. |

### Header

없음

### Path Variable

없음

### Query String

없음

### Request

```json
{
  "accountLinkToken": "account-link-token-value"
}
```

## Request Body 설명

| 필드             | 타입   | 필수 | 설명                                                                                                               |
| ---------------- | ------ | ---- | ------------------------------------------------------------------------------------------------------------------ |
| accountLinkToken | string | Y    | `POST /api/v1/auth/oauth/exchange`가 `ACCOUNT_LINK_REQUIRED` 응답에서 발급한 짧은 만료시간의 일회용 계정 연동 토큰 |

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "access-token-value",
    "refreshToken": "refresh-token-value",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "refreshTokenExpiresIn": 1209600,
    "isNewUser": false,
    "nextAction": "HOME",
    "onboardingCompleted": true,
    "user": {
      "id": 1,
      "email": "member@example.com",
      "nickname": "부글이",
      "profileImage": null,
      "profileImageSource": null,
      "gender": "N",
      "ageGroup": 20,
      "baselineType": "R",
      "sensitiveInfoAgreed": false
    }
  },
  "message": "소셜 계정이 연동되었습니다."
}
```

## Response Body 설명

| 필드                       | 타입    | 필수 | 설명                                                   |
| -------------------------- | ------- | ---- | ------------------------------------------------------ |
| success                    | boolean | Y    | 요청 성공 여부                                         |
| data                       | object  | Y    | 계정 연동 후 로그인 결과                               |
| data.accessToken           | string  | Y    | API 인증용 액세스 토큰                                 |
| data.refreshToken          | string  | Y    | 토큰 재발급용 리프레시 토큰                            |
| data.tokenType             | string  | Y    | `Bearer` 고정                                          |
| data.expiresIn             | number  | Y    | 액세스 토큰 만료 시간(초)                              |
| data.refreshTokenExpiresIn | number  | Y    | 리프레시 토큰 만료 시간(초)                            |
| data.isNewUser             | boolean | Y    | 기존 사용자이므로 `false`                              |
| data.nextAction            | string  | Y    | 온보딩 완료 시 `HOME`, 미완료 시 `ONBOARDING_REQUIRED` |
| data.onboardingCompleted   | boolean | Y    | 기존 계정의 온보딩 완료 여부                           |
| data.user                  | object  | Y    | 기존 사용자 프로필. 새 소셜 프로필로 덮어쓰지 않음     |
| message                    | string  | Y    | 처리 결과 메시지                                       |

### Error

```text
400 Bad Request
- AUTH_ACCOUNT_LINK_TOKEN_REQUIRED: accountLinkToken은 필수입니다.

401 Unauthorized
- AUTH_INVALID_ACCOUNT_LINK_TOKEN: 유효하지 않거나 이미 사용된 계정 연동 토큰입니다.
- AUTH_ACCOUNT_LINK_TOKEN_EXPIRED: 계정 연동 요청이 만료되었습니다. 소셜 로그인을 다시 진행해주세요.

403 Forbidden
- AUTH_WITHDRAWN_USER: 탈퇴한 사용자는 로그인할 수 없습니다.

409 Conflict
- SOCIAL_LOGIN_FAILED: 소셜 계정을 연동할 수 없습니다.

500 Internal Server Error
- SOCIAL_LOGIN_FAILED: 소셜 계정 연동 중 오류가 발생했습니다.
```

## DB 처리

| 테이블                 | 처리                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `social_account`       | 토큰에 포함된 제공자·제공자 사용자 ID·검증 이메일을 기존 `member.id`에 연결합니다. `(provider, provider_id)`와 `(user_id, provider)` 고유 제약을 재검증합니다. |
| `member`               | 기존 프로필과 사용자 ID를 유지합니다. 신규 회원을 만들거나 프로필을 덮어쓰지 않습니다.                                                                         |
| `refresh_token`        | 연동 성공 후 기존 사용자에게 발급한 refreshToken의 해시와 만료시간을 저장합니다.                                                                               |
| `auth_temporary_token` | `ACCOUNT_LINK` 타입 토큰을 일회성으로 소비하고 payload를 제거합니다. 기본 만료시간은 5분입니다.                                                                |

## 기존 AUTH-07 응답 변경

동일한 인증 이메일의 기존 사용자와 아직 연결되지 않은 소셜 계정이 발견되면 자동 연동하지 않고 다음 응답을 반환합니다.

```json
{
  "success": true,
  "data": {
    "nextAction": "ACCOUNT_LINK_REQUIRED",
    "accountLinkToken": "account-link-token-value",
    "accountLinkTokenExpiresIn": 300,
    "provider": "google",
    "email": "member@example.com"
  },
  "message": "동일한 이메일로 가입된 계정이 있습니다. 계정 연동 여부를 선택해주세요."
}
```

- `[연동]`: `POST /api/v1/auth/oauth/link` 호출
- `[취소]`: 토큰을 폐기하고 로그인 화면으로 이동. 별도 API 호출 없음
- 검증된 이메일이 없으면 기존과 동일하게 로그인을 거부
- 토큰은 서버에 해시로 저장하며 짧은 만료시간과 일회성 사용을 적용
