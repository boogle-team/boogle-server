# boogle-server

## Git Flow

```
main ← develop ← feature
```

- main branch : 배포 브랜치
- develop branch : 개발 브랜치 (feature 브랜치가 merge됨)
- feature: 페이지 / 기능 별 브랜치

## Gitmoji Download (once)

```bash
npm i -g gitmoji-cli
# or
brew install gitmoji
```

🔗 참고 https://inpa.tistory.com/entry/GIT-%E2%9A%A1%EF%B8%8F-Gitmoji-%EC%82%AC%EC%9A%A9%EB%B2%95-Gitmoji-cli

## Commit Style

- ✨ Feat: 새로운 기능 추가
- 🐛 Fix : 버그 수정
- 💄 Design : UI(CSS) 수정
- ✏️ Typing Error : 오타 수정
- 🚚 Mod : 폴더 구조 이동 및 파일 이름 수정
- 💡 Add : 파일 추가 (ex- 이미지 추가)
- 🔥 Del : 파일 삭제
- ♻️ Refactor : 코드 리펙토링
- 🎉 Init: 프로젝트 세팅

## Commit Convention

- 형식: `커밋유형: 상세설명 (#이슈번호)`
- ex) `✨ Feat: 메인페이지 개발 (#1)`

## Commit Message (with Issue)

- git commit이 아닌 **아래 명령어** 사용

```bash
gitmoji -c
```

1. Choose a gitmoji : 위 commit style의 깃모지 사용
2. Enter the commit title : 커밋 메세지 - ex) `Feat: 메인 페이지 개발 (#이슈번호)`
   → 여기서 커밋 컨벤션 맞게 작성하면 됨
3. Enter the commit message : 커밋 메세지에 대한 설명, 없다면 그냥 enter

pre-commit 훅(Husky + lint-staged)이 staged된 `*.ts` 파일에 ESLint / Prettier를 자동으로 돌리므로, 커밋 전에 별도로 `pnpm run lint`를 실행하지 않아도 됩니다.

## Branch Convention

- **이슈 생성 후** 브랜치 생성
- 브랜치 종류
  - `init` : 프로젝트 세팅
  - `feat` : 새로운 기능 추가
  - `fix` : 버그 수정
  - `refactor` : 코드 리팩토링
- 형식
  - `브랜치종류/#이슈번호/상세기능`
- 예시
  - `init/#1/settings`
  - `feat/#3/mainPage`

## Issue Convention

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

## 🔐 환경변수

`.env.example`을 복사해 `.env`를 만들고 실제 값을 채워주세요. `.env.example`만 git에 커밋됩니다.

## ⌨️ Code Styling

- **camelCase**
  - 변수명, 함수명에 적용
  - 첫글자는 소문자로 시작, 띄어쓰기는 붙이고 뒷 단어의 시작을 대문자로
    - ex- handleDelete
  - 언더바 사용 X (클래스명은 허용)

## 📥 Import 경로

- 같은 폴더(형제 파일)끼리는 상대경로(`./`)를 그대로 씁니다. ex- `main.ts`에서 `./app.module`
- 상위 폴더로 거슬러 올라가야 하는 경우(`../`)는 `@/` alias(`tsconfig.json`의 `paths`, → `src/*`)를 씁니다. ex- `../generated/prisma/client` 대신 `@/generated/prisma/client`
- `nest build` / `nest start`는 별도 도구(tsc-alias 등) 없이 `@/` alias를 relative import로 그대로 컴파일해줍니다. 다만 Jest는 tsconfig의 `paths`를 안 읽으므로 `package.json`의 `jest.moduleNameMapper`, `test/jest-e2e.json`의 `moduleNameMapper`에 각각 `^@/(.*)$` 매핑이 되어 있어야 합니다. 새 alias를 추가하면 이 두 곳도 같이 맞춰주세요.

## 🧪 Prisma + Jest 관련 주의사항

- Prisma 7의 생성된 클라이언트는 내부적으로 `./enums.js`처럼 확장자를 붙인 ESM 스타일 상대경로 import를 씁니다. ts-jest가 이를 못 찾는 문제가 있어 두 Jest 설정 모두 `moduleNameMapper`에 `"^(\\.{1,2}/.*)\\.js$": "$1"` 매핑을 추가해 확장자를 벗겨줍니다.
- Prisma 7의 WASM 쿼리 컴파일러는 내부적으로 동적 `import()`를 사용하는데, Jest 기본 실행 환경에서는 지원되지 않아 실제 DB에 연결하는 테스트(e2e 등)를 돌리려면 `NODE_OPTIONS=--experimental-vm-modules` 플래그가 필요합니다. `test:e2e` 스크립트에 `cross-env`로 이미 적용되어 있습니다. `PrismaService`를 실제로 초기화(`$connect`)하는 테스트를 새로 추가한다면 같은 플래그가 필요할 수 있습니다.

## 📂 프로젝트 구조

수정 예정

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
