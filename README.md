<div align="center">

# 부글 (Boogle)

내 장 상태를 기록하고 패턴을 확인하며 맞춤 생활 습관을 가이드하는 장 건강 관리 앱

</div>

<br/>

## 🙋🏻‍♀️ Boogle의 BE Developer를 소개합니다!

| <a href="https://github.com/yeon-yeon1"><img src="https://github.com/yeon-yeon1.png" width="120px;" alt=""/></a> | <a href="https://github.com/an-junhyung"><img src="https://github.com/an-junhyung.png" width="120px;" alt=""/></a> | <a href="https://github.com/seongsoon1818"><img src="https://github.com/seongsoon1818.png" width="120px;" alt=""/></a> | <a href="https://github.com/mzxxzysy"><img src="https://github.com/mzxxzysy.png" width="120px;" alt=""/></a> | <a href="https://github.com/DBSRYDL"><img src="https://github.com/DBSRYDL.png" width="120px;" alt=""/></a> |
| :---: | :---: | :---: | :---: | :---: |
| [노진경](https://github.com/yeon-yeon1) | [안준형](https://github.com/an-junhyung) | [이성진](https://github.com/seongsoon1818) | [정서영](https://github.com/mzxxzysy) | [이윤교](https://github.com/DBSRYDL) |

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

> 소셜 로그인(카카오/구글 OAuth), AI 문장화·태그추출(Claude API), PDF 생성(Puppeteer) 등은 기획 단계에서 정한 방향이며, 실제 도입 시 이 표에 추가합니다.

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

<br>

## ⌨️ Code Styling

- **camelCase**
  - 변수명, 함수명에 적용
  - 첫글자는 소문자로 시작, 띄어쓰기는 붙이고 뒷 단어의 시작을 대문자로
    - ex- handleDelete
  - 언더바 사용 X (클래스명은 허용)

<br>

## 📂 프로젝트 구조

<!-- 기능이 추가되면서 폴더 구조는 계속 바뀔 수 있음 -->

```
📦boogle-server
 ┣ 📂prisma
 ┃ ┣ 📂migrations
 ┃ ┗ 📜schema.prisma
 ┣ 📂src
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
  - generated/prisma - `prisma generate`로 자동 생성되는 Prisma Client (직접 수정 X)
  - prisma - 전역으로 주입되는 `PrismaService` / `PrismaModule`
  - (추후 기능이 늘어나면 도메인별로 `.module.ts` / `.controller.ts` / `.service.ts`를 `src` 하위에 추가)
