<div align="center">

# 부글 (Boogle)

내 장 상태를 기록하고 패턴을 확인하며 맞춤 생활 습관을 가이드하는 장 건강 관리 앱

</div>

<br/>

## 🙋🏻‍♀️ Boogle의 BE Developer를 소개합니다!

| <a href="https://github.com/yeon-yeon1"><img src="https://github.com/yeon-yeon1.png" width="120px;" alt=""/></a> | <a href="https://github.com/an-junhyung"><img src="https://github.com/an-junhyung.png" width="120px;" alt=""/></a> | <a href="https://github.com/seongsoon1818"><img src="https://github.com/seongsoon1818.png" width="120px;" alt=""/></a> | <a href="https://github.com/DBSRYDL"><img src="https://github.com/DBSRYDL.png" width="120px;" alt=""/></a> | <a href="https://github.com/mzxxzysy"><img src="https://github.com/mzxxzysy.png" width="120px;" alt=""/></a> |
| :---: | :---: | :---: | :---: | :---: |
| [노진경](https://github.com/yeon-yeon1) | [안준형](https://github.com/an-junhyung) | [이성진](https://github.com/seongsoon1818) | [이윤교](https://github.com/DBSRYDL) | [정서영](https://github.com/mzxxzysy) |

<br>

## 📚 서비스 소개

**부글(Boogle)** 은 사용자가 배변 상태와 생활 패턴을 간편하게 기록하고, 누적된 데이터를 바탕으로 나만의 장 컨디션 패턴을 확인하며 생활 습관을 조정할 수 있도록 돕는 장 건강 관리 웹앱입니다.
<br>
브리스톨 변 척도, 질병관리청·NIDDK 등 의학적 근거에 기반한 룰 테이블로 개인의 배변·생활 패턴을 자동 감지하고, 진단이 아닌 생활 습관 개선 가이드를 제공하도록 설계되었습니다. 기본 기록 30초 완료를 목표로 하는 간편한 UX로 꾸준한 기록 습관 형성을 유도하며, 병원 방문 시 참고할 수 있는 PDF 리포트도 제공합니다.

## 💻 기술 스택

| **역할** | **종류** | **선정 이유** |
| --- | --- | --- |
| Framework | <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white"> | 모듈/DI 기반의 구조화된 아키텍처를 기본 제공해 협업 시 코드 일관성을 유지하기 쉽고, 확장에 유리 |
| Programming Language | <img src="https://img.shields.io/badge/typescript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/> | 정적 타입을 제공하여 코드의 안정성과 가독성을 높이고, 개발 중 오류를 사전에 방지할 수 있어 유지보수에 유리 |
| ORM | <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white"> | 스키마 기반 타입 안전성과 직관적인 마이그레이션 관리로 DB 작업 시 런타임 오류를 줄일 수 있음 |
| Database | <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white"> | 배변·생활 기록처럼 정형화된 관계형 데이터를 다루기에 적합하고, 검증된 오픈소스 생태계와 Prisma 지원으로 안정적으로 운영 가능 |
| Package Manager | <img src="https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white"> | 빠른 설치 속도와 디스크 공간을 절약하는 효율적인 의존성 관리로 프로젝트 환경 설정에 용이 |
| Formatting | <img src="https://img.shields.io/badge/eslint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white"> <img src="https://img.shields.io/badge/prettier-000000?style=for-the-badge&logo=prettier&logoColor=F7B93E"> | 코드 스타일을 통일하고 잠재적인 오류를 사전에 방지하여 협업 시 효율성을 높임 |
| Testing | <img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white"> | NestJS 공식 권장 테스트 러너로, 단위/E2E 테스트를 별도 설정 없이 바로 사용 가능 |

<br>

## 🎉 Git Convention

### 📌 Git Flow

```
main ← develop ← feature
```

- main branch : 배포 브랜치
- develop branch : 개발 브랜치 (feature 브랜치가 merge됨)
- feature branch : 페이지 / 기능 별 브랜치

### Gitmoji Download (once)

```bash
npm i -g gitmoji-cli
# or
brew install gitmoji
```

🔗 참고 https://inpa.tistory.com/entry/GIT-%E2%9A%A1%EF%B8%8F-Gitmoji-%EC%82%AC%EC%9A%A9%EB%B2%95-Gitmoji-cli

### 🔥 Commit Message Convention

- **커밋 유형**
  - 🎉 Init: 프로젝트 세팅
  - ✨ Feat: 새로운 기능 추가
  - 🐛 Fix : 버그 수정
  - 💄 Design : UI(CSS) 수정
  - ✏️ Typing Error : 오타 수정
  - 🚚 Mod : 폴더 구조 이동 및 파일 이름 수정
  - 💡 Add : 파일 추가 (ex- 이미지 추가)
  - 🔥 Del : 파일 삭제
  - ♻️ Refactor : 코드 리펙토링

- **형식**: `커밋유형: 상세설명 (#이슈번호)`
- **예시**: `✨ Feat: 메인페이지 개발 (#1)`

**커밋 메시지 작성 (with Issue)**

- git commit이 아닌 **아래 명령어** 사용

```bash
gitmoji -c
```

1. Choose a gitmoji : 위 commit style의 깃모지 사용
2. Enter the commit title : 커밋 메세지 - ex) `Feat: 메인 페이지 개발 (#이슈번호)`
   → 여기서 커밋 컨벤션 맞게 작성하면 됨
3. Enter the commit message : 커밋 메세지에 대한 설명, 없다면 그냥 enter

pre-commit 훅(Husky + lint-staged)이 staged된 `*.ts` 파일에 ESLint / Prettier를 자동으로 돌리므로, 커밋 전에 별도로 `pnpm run lint`를 실행하지 않아도 됩니다.

### 🌿 Branch Convention

- **이슈 생성 후** 브랜치 생성
- 브랜치 종류
  - `init` : 프로젝트 세팅
  - `feat` : 새로운 기능 추가
  - `fix` : 버그 수정
  - `refactor` : 코드 리팩토링
- **형식**: `브랜치종류/#이슈번호/상세기능`
- **예시**:
  - `init/#1/settings`
  - `feat/#3/mainPage`

### 📋 Issue Convention

**Issue Title 규칙**

- **형식**: [태그] 작업 요약
- **태그 목록**:
  - `Init`: 프로젝트 세팅
  - `Feat`: 새로운 기능 추가
  - `Fix` : 버그 수정
  - `Refactor` : 코드 리펙토링
- **예시**:
  - [Init] 프로젝트 초기 세팅
  - [Feat] 로그인 API 구현

<br>

## 🧩 Package Manager

- **Node.js 버전**
  - 24.14.0 (`package.json`의 `engines` 및 `.nvmrc`로 고정)
- **pnpm 버전**
  - 10.12.1 (`package.json`의 `packageManager` 필드로 고정)
- **pnpm 버전 변경 방법**

```
corepack use pnpm@버전 # 프로젝트 최상위 폴더 위치에서 명령어 입력
```

- **pnpm 명령어 예시**

```
pnpm install # 전체 설치
pnpm add 라이브러리 # 라이브러리 설치
pnpm run start:dev # 개발 서버 실행 (watch mode)
pnpm run build # 프로덕션 빌드
pnpm run lint # ESLint 검사
pnpm run format # Prettier 전체 포맷
pnpm test # Jest 단위 테스트 실행
pnpm run test:e2e # Jest E2E 테스트 실행
```

<br>

## 🗄️ Prisma / Database

- DB는 **MySQL**을 사용합니다.
- Prisma 7부터는 `PrismaClient`가 직접 DB에 붙지 않고 **driver adapter**(`@prisma/adapter-mariadb`)를 통해 연결합니다. 그래서 `prisma/schema.prisma`의 `datasource` 블록에는 `url`을 두지 않고, 연결 문자열은 `prisma.config.ts`(마이그레이션용)와 `PrismaService`(런타임용) 양쪽에서 `process.env.DATABASE_URL`로 읽습니다.

- **로컬 MySQL 준비 (최초 1회)**

```bash
brew install mysql
brew services start mysql

mysql -u root -e "CREATE USER IF NOT EXISTS 'boogle'@'localhost' IDENTIFIED BY 'boogle';"
mysql -u root -e "CREATE DATABASE IF NOT EXISTS boogle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -e "GRANT ALL PRIVILEGES ON \`boogle\`.* TO 'boogle'@'localhost';"
# prisma migrate dev가 shadow DB를 만들 수 있도록 권한 부여
mysql -u root -e "GRANT ALL PRIVILEGES ON \`prisma_migrate_shadow_db%\`.* TO 'boogle'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"
```

- `.env`의 `DATABASE_URL`이 위에서 만든 DB를 가리키는지 확인하세요 (`.env.example` 참고).

- **명령어**

```
npx prisma generate # 스키마 변경 후 Prisma Client 재생성
npx prisma migrate dev # 로컬 DB에 마이그레이션 적용 및 생성
npx prisma studio # DB GUI 실행
```

- 스키마는 `prisma/schema.prisma`에서 관리합니다.
- Prisma Client는 `src/generated/prisma`에 생성되며, git에는 포함되지 않습니다 (`pnpm install` 또는 스키마 변경 후 `npx prisma generate`로 생성).

<br>

## 📥 Import 경로

- 같은 폴더(형제 파일)끼리는 상대경로(`./`)를 그대로 씁니다. ex- `main.ts`에서 `./app.module`
- 상위 폴더로 거슬러 올라가야 하는 경우(`../`)는 `@/` alias(`tsconfig.json`의 `paths`, → `src/*`)를 씁니다. ex- `../generated/prisma/client` 대신 `@/generated/prisma/client`
- `nest build` / `nest start`는 별도 도구(tsc-alias 등) 없이 `@/` alias를 relative import로 그대로 컴파일해줍니다. 다만 Jest는 tsconfig의 `paths`를 안 읽으므로 `package.json`의 `jest.moduleNameMapper`, `test/jest-e2e.json`의 `moduleNameMapper`에 각각 `^@/(.*)$` 매핑이 되어 있어야 합니다. 새 alias를 추가하면 이 두 곳도 같이 맞춰주세요.

## 🧪 Prisma + Jest 관련 주의사항

- Prisma 7의 생성된 클라이언트는 내부적으로 `./enums.js`처럼 확장자를 붙인 ESM 스타일 상대경로 import를 씁니다. ts-jest가 이를 못 찾는 문제가 있어 두 Jest 설정 모두 `moduleNameMapper`에 `"^(\\.{1,2}/.*)\\.js$": "$1"` 매핑을 추가해 확장자를 벗겨줍니다.
- Prisma 7의 WASM 쿼리 컴파일러는 내부적으로 동적 `import()`를 사용하는데, Jest 기본 실행 환경에서는 지원되지 않아 실제 DB에 연결하는 테스트(e2e 등)를 돌리려면 `NODE_OPTIONS=--experimental-vm-modules` 플래그가 필요합니다. `test:e2e` 스크립트에 `cross-env`로 이미 적용되어 있습니다. `PrismaService`를 실제로 초기화(`$connect`)하는 테스트를 새로 추가한다면 같은 플래그가 필요할 수 있습니다.

<br>

## 🔐 환경변수

`.env.example`을 복사해 `.env`를 만들고 실제 값을 채워주세요. `.env.example`만 git에 커밋됩니다.

소셜 로그인은 서버 주도 Authorization Code 방식입니다. 배포 환경에서는 다음 값을 반드시 실제 도메인 기준으로 설정해야 합니다.

- `FRONTEND_OAUTH_CALLBACK_URL`: OAuth 처리 결과를 받을 프론트 화면 URL
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `KAKAO_CLIENT_ID`, `KAKAO_REDIRECT_URI`
- `KAKAO_CLIENT_SECRET`: Kakao 보안 설정에서 Client Secret을 활성화한 경우 필수
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: 서로 다른 충분히 긴 임의 문자열
- `AUTH_TEMPORARY_TOKEN_RETENTION`: 사용 완료·만료된 OAuth 임시 토큰의 보존 기간(기본 `7d`)
- `AUTH_TEMPORARY_TOKEN_CLEANUP_INTERVAL`: 임시 토큰 정리 주기(기본 `1h`)
- `ACCOUNT_LINK_TOKEN_EXPIRES_IN`: 동일 이메일 소셜 계정 연동 토큰의 만료 시간(기본 `5m`)

Google/Kakao 개발자 콘솔에 등록하는 Redirect URI는 각각 `GOOGLE_REDIRECT_URI`, `KAKAO_REDIRECT_URI`와 문자 단위로 같아야 합니다. 운영 DB에는 배포 전에 `npx prisma migrate deploy`를 실행해야 합니다.

- 로컬 프론트 기본 주소: `http://localhost:5173`
- 로컬 Google Redirect URI: `http://localhost:8080/api/v1/auth/oauth/google/callback`
- 로컬 Kakao Redirect URI: `http://localhost:8080/api/v1/auth/oauth/kakao/callback`
- 운영 백엔드 주소: `https://api.glgc.cloud`
- 운영 Google Redirect URI: `https://api.glgc.cloud/api/v1/auth/oauth/google/callback`
- 운영 Kakao Redirect URI: `https://api.glgc.cloud/api/v1/auth/oauth/kakao/callback`

운영 `FRONTEND_ORIGIN`과 `FRONTEND_OAUTH_CALLBACK_URL`에는 API 도메인이 아니라 실제 배포된 프론트엔드 도메인을 입력합니다. `FRONTEND_ORIGIN`은 쉼표로 여러 허용 Origin을 지정할 수 있습니다.

### 프로필 이미지 S3 저장

사용자가 업로드한 프로필 이미지는 EC2 로컬 디스크가 아닌 비공개 S3 버킷에 저장하며, DB에는 `profile-images/users/{userId}/{uuid}.{확장자}` 형식의 Object Key만 저장합니다. EC2에는 AWS Access Key를 넣지 않고 Instance IAM Role을 연결해 AWS SDK 기본 자격 증명 체인을 사용합니다.

- `AWS_REGION`: S3 버킷 리전
- `AWS_S3_BUCKET`: 비공개 프로필 이미지 버킷 이름
- `AWS_CLOUDFRONT_BASE_URL`: CloudFront를 사용하는 경우 배포 도메인, 사용하지 않으면 빈 값
- `AWS_S3_SIGNED_URL_EXPIRES_IN`: CloudFront 미사용 시 GET 서명 URL 만료 시간(초)

EC2 Instance IAM Role에는 실제 버킷 이름으로 치환한 다음 정책처럼 프로필 이미지 경로만 허용합니다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/profile-images/*"
    }
  ]
}
```

운영 배포 시 스키마 변경은 `pnpm exec prisma migrate deploy`로 적용하며 `prisma db push`를 사용하지 않습니다.

<br>

## ⌨️ Code Styling

- **camelCase**
  - 변수명, 함수명에 적용
  - 첫글자는 소문자로 시작, 띄어쓰기는 붙이고 뒷 단어의 시작을 대문자로
    - ex- handleDelete
  - 언더바 사용 X (클래스명은 허용)

<br>

## 🌐 공통 응답 / 에러코드 / API 문서

- API 공통 prefix는 `/api/v1`입니다 (`main.ts`의 `app.setGlobalPrefix('api/v1')`). 컨트롤러에는 `@Controller('home')`처럼 리소스 경로만 적으면 실제로는 `/api/v1/home`으로 노출됩니다. Swagger 문서(`/api-docs`)는 이 prefix의 영향을 받지 않습니다.
- 모든 응답은 전역 `ResponseInterceptor` / `HttpExceptionFilter`(`src/common`)를 거쳐 API 명세서의 공통 Response Format대로 내려갑니다.
  - 성공: `{ success: true, data, message }` (`message` 기본값: `"요청이 성공적으로 처리되었습니다."`)
  - 실패: `{ success: false, code, message }`
- **공통 에러코드**(`src/common/constants/common-error-code.enum.ts`): HTTP status에 따라 자동으로 매핑되는 기본 코드입니다. 별도 처리를 하지 않으면 아래 값이 그대로 내려갑니다.

  | Status | code | 기본 message |
  | --- | --- | --- |
  | 400 | `BAD_REQUEST` | 요청 값이 올바르지 않습니다. |
  | 401 | `UNAUTHORIZED` | 로그인이 필요합니다. |
  | 403 | `FORBIDDEN` | 해당 요청을 처리할 권한이 없습니다. |
  | 404 | `NOT_FOUND` | 요청한 데이터를 찾을 수 없습니다. |
  | 409 | `CONFLICT` | 이미 존재하는 데이터입니다. |
  | 500 | `INTERNAL_SERVER_ERROR` | 서버 내부 오류가 발생했습니다. |

- **도메인 에러코드**: 위 공통 코드로 표현이 안 되는 도메인 고유 에러(ex- 이미 가입된 소셜 계정)는 각 모듈의 `*-error-code.enum.ts`에 `도메인_번호`(ex- `AUTH_001`) 형식으로 추가하고, `BusinessException(errorCode, message, status)`(`src/common/exceptions`)을 던져서 사용합니다. `BusinessException`은 `HttpExceptionFilter`에서 공통 매핑보다 우선 적용됩니다.
- Swagger 문서는 서버 실행 후 `/api-docs`에서 확인할 수 있으며, Bearer 인증 스키마가 등록되어 있습니다.
- 현재 도메인 모듈들은 컨트롤러/서비스/에러코드 enum 등 뼈대만 생성된 상태이며, 실제 API 로직은 각 담당자가 채워나갑니다.

<br>

## 📂 프로젝트 구조

<!-- 기능이 추가되면서 폴더 구조는 계속 바뀔 수 있음 -->

```
📦boogle-server
 ┣ 📂prisma
 ┃ ┣ 📂migrations
 ┃ ┗ 📜schema.prisma
 ┣ 📂src
 ┃ ┣ 📂auth               (회원가입/로그인/온보딩 - A101~A103, 경로: /auth)
 ┃ ┣ 📂user                (로그아웃/회원탈퇴 - A104, 경로: /users)
 ┃ ┣ 📂home                 (홈 화면 - H, 경로: /home)
 ┃ ┣ 📂record                (부글 기록 - B, 경로: /records)
 ┃ ┣ 📂life-record            (생활 기록 - L, 경로: /life-records)
 ┃ ┣ 📂calendar                (캘린더 - C, 경로: /calendar)
 ┃ ┣ 📂report                   (리포트 - R, 경로: /reports)
 ┃ ┣ 📂guide                     (가이드 카드 - G, 경로: /guides)
 ┃ ┃  ┣ 📂dto
 ┃ ┃  ┣ 📜guide-error-code.enum.ts
 ┃ ┃  ┣ 📜guide.controller.ts
 ┃ ┃  ┣ 📜guide.controller.spec.ts
 ┃ ┃  ┣ 📜guide.module.ts
 ┃ ┃  ┣ 📜guide.service.ts
 ┃ ┃  ┗ 📜guide.service.spec.ts
 ┃ ┃    (auth/user/home/record/life-record/calendar/report 모두 위 guide와 동일한 구성)
 ┃ ┣ 📂common
 ┃ ┃ ┣ 📂dto
 ┃ ┃ ┃ ┗ 📜api-response.dto.ts       (성공/실패 응답 타입)
 ┃ ┃ ┣ 📂exceptions
 ┃ ┃ ┃ ┗ 📜business.exception.ts     (에러코드를 담는 커스텀 예외)
 ┃ ┃ ┣ 📂filters
 ┃ ┃ ┃ ┗ 📜http-exception.filter.ts  (전역 예외 필터)
 ┃ ┃ ┗ 📂interceptors
 ┃ ┃   ┗ 📜response.interceptor.ts   (전역 응답 래퍼)
 ┃ ┣ 📂generated         (Prisma Client 자동 생성 - git 미포함)
 ┃ ┣ 📂prisma
 ┃ ┃ ┣ 📜prisma.module.ts
 ┃ ┃ ┗ 📜prisma.service.ts
 ┃ ┣ 📜app.controller.ts
 ┃ ┣ 📜app.controller.spec.ts
 ┃ ┣ 📜app.module.ts
 ┃ ┣ 📜app.service.ts
 ┃ ┗ 📜main.ts
 ┣ 📂test
 ┃ ┣ 📜app.e2e-spec.ts
 ┃ ┗ 📜jest-e2e.json
 ┣ 📜.env.example
 ┣ 📜.gitignore
 ┣ 📜.husky           (pre-commit 훅)
 ┣ 📜.lintstagedrc.json
 ┣ 📜.prettierrc
 ┣ 📜eslint.config.mjs
 ┣ 📜nest-cli.json
 ┣ 📜package.json
 ┣ 📜pnpm-lock.yaml
 ┣ 📜prisma.config.ts
 ┣ 📜README.md
 ┣ 📜tsconfig.build.json
 ┗ 📜tsconfig.json
```

- prisma - `schema.prisma`에 DB 모델 정의, 마이그레이션 파일 관리
- src
  - auth / user / home / record / life-record / calendar / report / guide - 도메인별 모듈 (`nest g module/controller/service`로 생성, 각 `dto/` 폴더와 `*-error-code.enum.ts` 포함). 폴더/클래스명은 단수(ex- `RecordController`)이고 실제 API 경로는 API 명세서에 맞춰 복수형(ex- `/api/v1/records`)으로 노출됩니다. 아직 로직 구현 전 뼈대 상태
  - common - 전역 응답 래퍼(`interceptors`) / 예외 필터(`filters`) / 커스텀 예외(`exceptions`) / 응답 타입(`dto`)
  - generated/prisma - `prisma generate`로 자동 생성되는 Prisma Client (직접 수정 X)
  - prisma - 전역으로 주입되는 `PrismaService` / `PrismaModule`
  - (추후 기능이 늘어나면 도메인별 모듈 하위에 컨트롤러/서비스 로직과 dto를 채워나감)

<br>

## 🚀 배포 / 롤백

- **배포 파이프라인**: `develop` 브랜치에 push되면 `.github/workflows/deploy.yml`의 `build` 잡이 GitHub Actions 러너에서 Docker 이미지를 빌드해 GHCR(`ghcr.io/boogle-team/boogle-server`)에 push하고, 이어서 `deploy` 잡이 EC2에 SSH로 접속해 `git pull`(compose 파일 동기화) → **AWS SSM Parameter Store**(`/boogle/prod/*`)에서 값을 직접 조회해 `.env` 재생성 → GHCR 로그인 → `docker compose pull` → 일회성 컨테이너에서 `prisma migrate deploy` → `docker compose up -d` 순서로 재배포합니다. 애플리케이션 컨테이너 시작과 DB 마이그레이션을 분리해 여러 컨테이너가 동시에 마이그레이션을 실행하지 않도록 했습니다. **이미지 빌드는 EC2가 아니라 GitHub Actions에서 수행합니다** — t3.micro(RAM 1GB)에서 직접 빌드하면 메모리 부족으로 인스턴스 전체가 응답 불능 상태가 되는 문제가 반복돼서, 빌드를 러너로 옮기고 EC2는 완성된 이미지를 pull만 하도록 구조를 바꿨습니다. (2026-07-30 이전엔 `PROD_ENV_FILE` GitHub 시크릿을 base64로 디코드하는 방식이었는데, SSM Parameter Store 기반으로 교체했습니다.)
- **EC2 접속**: pem 키 SSH는 더 이상 안 됩니다 (보안그룹에서 22번 포트 제거함). **AWS Systems Manager Session Manager**로만 접속합니다.

  ```bash
  aws ssm start-session --target i-09994256d8b10d1f3
  ```

  (로컬에 `awscli` + `session-manager-plugin` 설치, `aws configure`로 `ssm:StartSession` 권한 있는 IAM 사용자 자격증명 설정 필요.)

- **운영 환경변수 변경**: EC2에 직접 들어가 `.env`를 수정하지 않습니다. 값을 SSM Parameter Store에서 바꾸면, 다음 배포 때 EC2가 알아서 최신 값으로 `.env`를 다시 만듭니다.

  - 값 하나만 바꿀 때:

    ```bash
    aws ssm put-parameter \
      --name "/boogle/prod/<KEY>" \
      --type SecureString \
      --value "<새값>" \
      --overwrite \
      --region ap-northeast-2
    ```

  - 로컬 `.env`를 통째로(여러 키) 반영할 때:

    ```bash
    ./scripts/migrate-ssm-params.sh
    ```

  - 값을 바꾼 뒤엔 코드 변경이 없어도 재배포를 트리거해야 반영됩니다:

    ```bash
    gh workflow run deploy.yml --ref develop
    ```

  - 현재 등록된 값 확인:

    ```bash
    aws ssm get-parameters-by-path --path "/boogle/prod" --with-decryption --region ap-northeast-2
    ```

### 배포 후 장애 발생 시 롤백 절차

1. `develop`에서 문제가 된 커밋(들)을 되돌립니다.

   ```bash
   git checkout develop
   git pull origin develop
   git revert <문제_커밋_SHA>   # 여러 개면 가장 최근 것부터 순서대로, 또는 -m 1로 머지 커밋 revert
   git push origin develop
   ```

2. push되면 Deploy 워크플로우가 자동으로 돌면서 되돌려진 상태로 재배포됩니다. 진행 상황은 `gh run list --workflow deploy.yml`, `gh run watch <run-id>`로 확인합니다.
3. 배포 완료 후 헬스체크로 정상화를 확인합니다.

   ```bash
   curl -s https://api.glgc.cloud/api/v1/health
   ```

4. 만약 CD 파이프라인 자체가 죽어 있거나(예: EC2 무응답) 위 방법으로 재배포가 안 되면, `aws ssm start-session --target i-09994256d8b10d1f3`로 EC2에 접속해(pem 키 SSH는 비활성화됨) 같은 순서를 수동으로 실행합니다. 이미지는 더 이상 EC2에서 빌드하지 않으므로 GHCR에서 pull해야 하고, 이때는 GitHub Actions의 임시 토큰을 쓸 수 없어 개인 PAT(classic, `read:packages` 권한, https://github.com/settings/tokens 에서 발급)로 직접 로그인해야 합니다.

   ```bash
   cd ~/boogle-server
   git fetch origin
   git checkout <되돌아갈_커밋_또는_브랜치>
   docker login ghcr.io -u <본인_github_아이디>   # 비밀번호 자리에 PAT 입력
   docker compose pull
   docker compose up -d
   ```

- 되돌리기 전에 먼저 `docker compose logs -f app`, `/api/v1/health` 상태를 확인해 정말 배포가 원인인지(vs DB, 인프라 문제) 먼저 판단하는 것을 권장합니다.
