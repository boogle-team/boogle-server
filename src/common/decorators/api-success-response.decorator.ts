import { applyDecorators, HttpStatus } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { ApiResponseNoStatusOptions } from '@nestjs/swagger';

type ApiResponseSchema = Extract<
  ApiResponseNoStatusOptions,
  { schema: unknown }
>['schema'];

interface ApiSuccessResponseOptions {
  type: Type<unknown>;
  description: string;
  message: string;
  status?: HttpStatus.OK | HttpStatus.CREATED;
}

interface ApiSuccessOneOfResponseOptions {
  types: Type<unknown>[];
  discriminatorProperty: string;
  discriminatorMapping: Record<string, Type<unknown>>;
  description: string;
  message: string;
}

function buildSuccessSchema(
  dataSchema: ApiResponseSchema,
  message: string,
): ApiResponseSchema {
  return {
    type: 'object',
    required: ['success', 'data', 'message'],
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: dataSchema,
      message: {
        type: 'string',
        example: message,
      },
    },
  };
}

export function ApiSuccessResponse(options: ApiSuccessResponseOptions) {
  const responseOptions: ApiResponseNoStatusOptions = {
    description: options.description,
    schema: buildSuccessSchema(
      {
        $ref: getSchemaPath(options.type),
      },
      options.message,
    ),
  };

  const responseDecorator =
    options.status === HttpStatus.CREATED
      ? ApiCreatedResponse(responseOptions)
      : ApiOkResponse(responseOptions);

  return applyDecorators(ApiExtraModels(options.type), responseDecorator);
}

export function ApiSuccessOneOfResponse(
  options: ApiSuccessOneOfResponseOptions,
) {
  const discriminatorMapping = Object.fromEntries(
    Object.entries(options.discriminatorMapping).map(([key, model]) => [
      key,
      getSchemaPath(model),
    ]),
  );

  return applyDecorators(
    ApiExtraModels(...options.types),
    ApiOkResponse({
      description: options.description,
      schema: buildSuccessSchema(
        {
          oneOf: options.types.map((model) => ({
            $ref: getSchemaPath(model),
          })),
          discriminator: {
            propertyName: options.discriminatorProperty,
            mapping: discriminatorMapping,
          },
        },
        options.message,
      ),
    }),
  );
}
