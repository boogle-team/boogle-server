#!/usr/bin/env bash
# GitHub Actions가 aws ssm send-command(AWS-RunShellScript)로 EC2에서 실행하는
# 배포 스크립트. SSM Run Command는 기본적으로 root로 실행되므로, ec2-user
# 홈 디렉터리 기준 경로(git 저장소, docker compose)를 그대로 쓰기 위해
# ec2-user 로그인 셸로 재실행한다.
#
# __GHCR_ACTOR__ / __GHCR_TOKEN__ 는 워크플로에서 sed로 실제 값을 채워 넣는
# 플레이스홀더다 (GitHub Actions ${{ }} 치환은 이 파일엔 안 먹히므로).
set -e

sudo -iu ec2-user bash -s <<'DEPLOY_SCRIPT'
set -e
cd ~/boogle-server
git fetch origin
git checkout develop
git pull origin develop
aws ssm get-parameters-by-path --path "/boogle/prod" --with-decryption \
  --region ap-northeast-2 --query "Parameters[*].[Name,Value]" --output text \
  | awk -F'\t' '{ n=split($1,a,"/"); print a[n]"="$2 }' > .env.new
if [ ! -s .env.new ]; then
  echo "SSM Parameter Store fetch failed or empty, aborting" >&2
  rm -f .env.new
  exit 1
fi
mv .env.new .env
chmod 600 .env
echo '__GHCR_TOKEN__' | docker login ghcr.io -u __GHCR_ACTOR__ --password-stdin
docker compose pull
docker compose run --rm --no-deps app ./node_modules/.bin/prisma migrate deploy
docker compose run --rm --no-deps app npx prisma db seed
docker compose up -d
docker image prune -f
DEPLOY_SCRIPT
