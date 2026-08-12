import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthErrorCode } from '@/auth/auth-error-code.enum';
import { UserErrorCode } from '@/user/user-error-code.enum';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = readCsvEnv('FRONTEND_ORIGIN');

  app.enableCors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : process.env.NODE_ENV === 'production'
          ? false
          : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: createValidationException,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Boogle API')
    .setDescription(
      [
        'Boogle 서버 API 문서입니다.',
        '',
        '일반 성공 응답은 `{ success: true, data, message }`, 오류 응답은 `{ success: false, code, message, data? }` 형식입니다.',
        '인증이 필요한 API는 Authorize에 access token을 입력해 호출할 수 있습니다.',
      ].join('\n'),
    )
    .setVersion('0.0.1')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: '로그인 또는 토큰 재발급에서 받은 access token',
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    customSiteTitle: 'Boogle API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}

type DomainValidationErrorCode = AuthErrorCode | UserErrorCode;

const VALIDATION_ERROR_MESSAGE = new Map<DomainValidationErrorCode, string>([
  [
    AuthErrorCode.AUTH_INVALID_PROVIDER,
    '지원하지 않는 소셜 로그인 제공자입니다.',
  ],
  [
    AuthErrorCode.AUTH_OAUTH_RESULT_CODE_REQUIRED,
    'OAuth 로그인 결과 코드는 필수입니다.',
  ],
  [
    AuthErrorCode.AUTH_ACCOUNT_LINK_TOKEN_REQUIRED,
    'accountLinkToken은 필수입니다.',
  ],
  [AuthErrorCode.REFRESH_TOKEN_REQUIRED, 'refreshToken은 필수입니다.'],
  [UserErrorCode.NICKNAME_REQUIRED, 'nickname은 필수입니다.'],
  [
    UserErrorCode.NICKNAME_TOO_LONG,
    'nickname은 최대 10자까지 입력할 수 있습니다.',
  ],
  [UserErrorCode.NICKNAME_ALREADY_EXISTS, '이미 사용 중인 닉네임입니다.'],
  [UserErrorCode.INVALID_GENDER, 'gender 값이 올바르지 않습니다.'],
  [UserErrorCode.INVALID_AGE_GROUP, 'ageGroup 값이 올바르지 않습니다.'],
  [UserErrorCode.INVALID_BASELINE_TYPE, 'baselineType 값이 올바르지 않습니다.'],
  [
    UserErrorCode.SENSITIVE_INFO_AGREEMENT_INVALID,
    '민감정보 수집 동의 값이 올바르지 않습니다.',
  ],
  [UserErrorCode.POLICY_VERSION_REQUIRED, 'policyVersion은 필수입니다.'],
  [
    UserErrorCode.WITHDRAWAL_CONFIRMATION_INVALID,
    '탈퇴 확인 문구가 일치하지 않습니다.',
  ],
]);

function createValidationException(errors: ValidationError[]) {
  const errorCode = findDomainValidationErrorCode(errors);
  const message = errorCode
    ? VALIDATION_ERROR_MESSAGE.get(errorCode)
    : undefined;

  return errorCode && message
    ? new BusinessException(errorCode, message)
    : new BadRequestException();
}

function findDomainValidationErrorCode(
  errors: ValidationError[],
): DomainValidationErrorCode | null {
  for (const error of errors) {
    for (const constraintMessage of Object.values(error.constraints ?? {})) {
      if (
        VALIDATION_ERROR_MESSAGE.has(
          constraintMessage as DomainValidationErrorCode,
        )
      ) {
        return constraintMessage as DomainValidationErrorCode;
      }
    }

    const childErrorCode = findDomainValidationErrorCode(error.children ?? []);
    if (childErrorCode) {
      return childErrorCode;
    }
  }

  return null;
}

function readCsvEnv(key: string) {
  return (process.env[key] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

void bootstrap();
