import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { UserController } from '@/user/user.controller';
import { UserService } from '@/user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

interface SwaggerMediaType {
  schema?: unknown;
  examples?: unknown;
}

interface SwaggerResponse {
  content?: Record<string, SwaggerMediaType>;
}

interface SwaggerOperation {
  summary?: string;
  description?: string;
  responses?: Record<string, SwaggerResponse>;
}

describe('인증·계정 Swagger 문서', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, UserController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: UserService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('모든 인증·계정 API에 요약과 상세 설명이 있다', () => {
    for (const [path, pathItem] of Object.entries(document.paths)) {
      if (
        !path.startsWith('/api/v1/auth') &&
        !path.startsWith('/api/v1/users')
      ) {
        continue;
      }

      for (const operation of Object.values(pathItem ?? {})) {
        if (!isOperation(operation)) continue;
        expect(operation.summary).toBeTruthy();
        expect(operation.description).toBeTruthy();
      }
    }
  });

  it('OAuth 결과의 로그인·계정 연동 분기를 oneOf으로 구분한다', () => {
    const operation = document.paths['/api/v1/auth/oauth/exchange']
      ?.post as unknown as SwaggerOperation;
    const response = operation.responses?.['200'];
    expect(response).toBeDefined();
    const schema = response?.content?.['application/json']?.schema as {
      properties?: { data?: { oneOf?: unknown[]; discriminator?: unknown } };
    };

    expect(schema.properties?.data?.oneOf).toHaveLength(2);
    expect(schema.properties?.data?.discriminator).toBeDefined();
  });

  it('성공 응답에 실제 data 스키마를 제공한다', () => {
    const targets = [
      ['/api/v1/auth/oauth/link', 'post'],
      ['/api/v1/auth/refresh', 'post'],
      ['/api/v1/users/me/onboarding', 'post'],
      ['/api/v1/users/me/onboarding', 'get'],
      ['/api/v1/users/me', 'get'],
      ['/api/v1/users/me', 'patch'],
      ['/api/v1/users/me/notification-settings', 'get'],
      ['/api/v1/users/me/notification-settings', 'patch'],
      ['/api/v1/users/me/sensitive-info-consent', 'get'],
      ['/api/v1/users/me/sensitive-info-consent', 'patch'],
      ['/api/v1/users/me/profile-image', 'put'],
    ] as const;

    for (const [path, method] of targets) {
      const operation = document.paths[path]?.[
        method
      ] as unknown as SwaggerOperation;
      const response = operation.responses?.['200'];
      expect(response).toBeDefined();
      expect(response?.content?.['application/json']?.schema).toBeDefined();
    }
  });

  it('4xx·5xx 응답에 공통 오류 스키마와 코드별 예시를 제공한다', () => {
    for (const [path, pathItem] of Object.entries(document.paths)) {
      if (
        !path.startsWith('/api/v1/auth') &&
        !path.startsWith('/api/v1/users')
      ) {
        continue;
      }

      for (const operation of Object.values(pathItem ?? {})) {
        if (!isOperation(operation)) continue;

        for (const [status, responseValue] of Object.entries(
          operation.responses ?? {},
        )) {
          if (!/^[45]/.test(status)) continue;
          const response = responseValue;
          const json = response.content?.['application/json'];
          expect(json?.schema).toBeDefined();
          expect(json?.examples).toBeDefined();
        }
      }
    }
  });
});

function isOperation(value: unknown): value is SwaggerOperation {
  return typeof value === 'object' && value !== null && 'responses' in value;
}
