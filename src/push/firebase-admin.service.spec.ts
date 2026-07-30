import { FirebaseAdminService } from './firebase-admin.service';

// env 유무/유효성에 따른 graceful 초기화 동작을 검증한다.
// (유효한 서비스 계정으로 실제 initializeApp 되는 happy-path는 실제 크레덴셜이
//  필요해 유닛테스트 범위 밖 — 여기서는 "앱을 죽이지 않는다"는 안전성만 검증)
describe('FirebaseAdminService', () => {
  const ORIGINAL_ENV = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    } else {
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = ORIGINAL_ENV;
    }
  });

  it('초기화 전에는 비활성 상태다', () => {
    const service = new FirebaseAdminService();
    expect(service.isEnabled()).toBe(false);
  });

  it('env가 없으면 비활성으로 두고 에러를 던지지 않는다', () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const service = new FirebaseAdminService();

    expect(() => service.onModuleInit()).not.toThrow();
    expect(service.isEnabled()).toBe(false);
  });

  it('env 값이 유효하지 않으면(파싱 실패) 비활성으로 폴백한다', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 =
      Buffer.from('this-is-not-json').toString('base64');
    const service = new FirebaseAdminService();

    expect(() => service.onModuleInit()).not.toThrow();
    expect(service.isEnabled()).toBe(false);
  });
});
