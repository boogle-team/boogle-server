export interface RegisterPushTokenResponseDto {
  // 등록(또는 갱신)된 기기 토큰. 클라이언트가 자신이 보낸 토큰이 반영됐는지 확인용.
  token: string;
}
