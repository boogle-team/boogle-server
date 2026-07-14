import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthErrorCode } from '@/auth/auth-error-code.enum';

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
    .setDescription('Boogle server API documentation')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}

const AUTH_VALIDATION_ERROR_MESSAGE: Partial<Record<AuthErrorCode, string>> = {
  [AuthErrorCode.AUTH_INVALID_PROVIDER]:
    '지원하지 않는 소셜 로그인 제공자입니다.',
  [AuthErrorCode.AUTH_SOCIAL_TOKEN_REQUIRED]: '소셜 로그인 토큰은 필수입니다.',
  [AuthErrorCode.PRIVACY_POLICY_AGREEMENT_REQUIRED]:
    '개인정보 수집 동의가 필요합니다.',
};

function createValidationException(errors: ValidationError[]) {
  const errorCode = findDomainValidationErrorCode(errors);
  const message = errorCode ? AUTH_VALIDATION_ERROR_MESSAGE[errorCode] : null;

  return errorCode && message
    ? new BusinessException(errorCode, message)
    : new BadRequestException();
}

function findDomainValidationErrorCode(
  errors: ValidationError[],
): AuthErrorCode | null {
  for (const error of errors) {
    for (const constraintMessage of Object.values(error.constraints ?? {})) {
      if (constraintMessage in AUTH_VALIDATION_ERROR_MESSAGE) {
        return constraintMessage as AuthErrorCode;
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
