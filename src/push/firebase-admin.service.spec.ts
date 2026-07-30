// firebase-admin SDK는 mock한다(실제 초기화·네트워크 없이 동작 검증).
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  cert: jest.fn((serviceAccount: unknown) => serviceAccount),
  getApps: jest.fn(() => []),
}));
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(),
}));

import { initializeApp } from 'firebase-admin/app';
import { FirebaseAdminService } from './firebase-admin.service';

describe('FirebaseAdminService', () => {
  const ORIGINAL_ENV = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('유효한 서비스 계정 env면 초기화하고 활성화된다', () => {
    const serviceAccount = {
      project_id: 'boogle',
      client_email: 'svc@boogle.iam.gserviceaccount.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n',
    };
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(
      JSON.stringify(serviceAccount),
    ).toString('base64');
    const service = new FirebaseAdminService();

    service.onModuleInit();

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(service.isEnabled()).toBe(true);
  });

  it('env가 없으면 비활성으로 두고 에러를 던지지 않는다', () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const service = new FirebaseAdminService();

    expect(() => service.onModuleInit()).not.toThrow();
    expect(service.isEnabled()).toBe(false);
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('env 값이 유효하지 않으면(파싱 실패) 비활성으로 폴백한다', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 =
      Buffer.from('this-is-not-json').toString('base64');
    const service = new FirebaseAdminService();

    expect(() => service.onModuleInit()).not.toThrow();
    expect(service.isEnabled()).toBe(false);
    expect(initializeApp).not.toHaveBeenCalled();
  });
});
