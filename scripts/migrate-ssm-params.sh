#!/usr/bin/env bash
# 로컬 .env 파일의 모든 값을 SSM Parameter Store(/boogle/prod/*)로 올린다(overwrite).
# 값 하나만 바꿀 땐 이 스크립트 대신 aws ssm put-parameter를 직접 쓴다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-${SCRIPT_DIR}/../.env}"
SSM_PATH="/boogle/prod"
REGION="ap-northeast-2"

while IFS='=' read -r key value; do
  # skip blanks and comments
  [[ -z "$key" ]] && continue
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ ! "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] && continue

  # strip surrounding quotes from value
  value="${value%\"}"
  value="${value#\"}"

  [[ -z "$value" ]] && continue

  echo "putting ${key}..."
  aws ssm put-parameter \
    --name "${SSM_PATH}/${key}" \
    --type "SecureString" \
    --value "${value}" \
    --overwrite \
    --region "${REGION}" \
    --output text >/dev/null
done < "$ENV_FILE"

echo "done"
