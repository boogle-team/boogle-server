/**
 * 유닛테스트 전용 PrismaService 대역.
 * 실제 PrismaService는 생성된 Prisma 클라이언트(WASM 포함)를 로드하는데,
 * Jest 유닛테스트 환경에서는 이를 읽지 못해 테스트가 깨진다.
 * package.json의 jest.moduleNameMapper로 유닛테스트에서만 이 파일로 치환된다.
 * (e2e 테스트는 실제 PrismaService를 그대로 사용한다)
 *
 * 각 서비스 스펙에서 `{ provide: PrismaService, useValue: 원하는_모킹_객체 }`로
 * 실제 동작을 오버라이드해서 쓰면 된다. 이 클래스 자체는 DI 토큰 역할만 한다.
 */
export class PrismaService {}
