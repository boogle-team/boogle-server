export interface RegisterPushTokenResponseDto {
  // 등록(또는 갱신)된 기기 토큰. 클라이언트가 자신이 보낸 토큰이 반영됐는지 확인용.
  token: string;
}

export interface DeletePushTokenResponseDto {
  // 실제로 삭제된 토큰이 있었는지. 이미 없던 토큰이면 false(멱등 — 로그아웃 재시도 안전).
  deleted: boolean;
}
