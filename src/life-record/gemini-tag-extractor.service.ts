import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai';
import { BusinessException } from '@/common/exceptions/business.exception';
import { LifeRecordErrorCode } from './life-record-error-code.enum';

export interface ExtractedTag {
  name: string;
  confidence: number;
}

const GEMINI_QUOTA_EXCEEDED_STATUS = 429;
const GEMINI_REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class GeminiTagExtractorService {
  private readonly logger = new Logger(GeminiTagExtractorService.name);
  private readonly apiKeys: string[];
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKeys = [
      this.configService.get<string>('GEMINI_API_KEY'),
      this.configService.get<string>('GEMINI_API_KEY2'),
      this.configService.get<string>('GEMINI_API_KEY3'),
    ].filter((key): key is string => Boolean(key));
    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  }

  async extractTags(
    text: string,
    existingTagNames: string[] = [],
  ): Promise<ExtractedTag[]> {
    if (this.apiKeys.length === 0) {
      this.logger.error('GEMINI_API_KEY가 설정되어 있지 않습니다.');
      throw new BusinessException(
        LifeRecordErrorCode.TAG_EXTRACTION_FAILED,
        '태그 추출 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let lastError: unknown;

    for (const [index, apiKey] of this.apiKeys.entries()) {
      try {
        return await this.requestExtraction(apiKey, text, existingTagNames);
      } catch (error) {
        lastError = error;

        if (!this.isQuotaExceeded(error)) {
          break;
        }

        this.logger.warn(
          `Gemini API 키 #${index + 1} 사용량 초과, 다음 키로 전환합니다.`,
        );
      }
    }

    this.logger.error('Gemini 태그 추출 실패', lastError as Error);
    throw new BusinessException(
      LifeRecordErrorCode.TAG_EXTRACTION_FAILED,
      '태그 추출 중 오류가 발생했습니다.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private isQuotaExceeded(error: unknown): boolean {
    return (
      error instanceof GoogleGenerativeAIFetchError &&
      error.status === GEMINI_QUOTA_EXCEEDED_STATUS
    );
  }

  private async requestExtraction(
    apiKey: string,
    text: string,
    existingTagNames: string[],
  ): Promise<ExtractedTag[]> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
      {
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      },
      { timeout: GEMINI_REQUEST_TIMEOUT_MS },
    );

    const prompt = [
      '아래 문장은 사용자가 작성한 하루 생활 메모야.',
      '문장에서 건강/생활 습관과 관련된 핵심 키워드를 한국어 태그로 추출해줘.',
      '태그는 최대 5개까지, 각 태그마다 0과 1 사이의 신뢰도(confidence)를 함께 응답해.',
      existingTagNames.length > 0
        ? [
            '아래는 서비스에서 이미 사용 중인 기존 태그 목록이야.',
            '문장 의미와 맞는 기존 태그가 있으면 새로 만들지 말고 반드시 그 태그명을 그대로 재사용해줘.',
            '기존 태그 중 맞는 게 없을 때만 새로운 태그명을 만들어줘.',
            `기존 태그 목록: ${existingTagNames.join(', ')}`,
          ].join('\n')
        : '',
      '다른 설명 없이 아래 JSON 스키마 형식으로만 응답해:',
      '[{"name": string, "confidence": number}]',
      '',
      `문장: "${text}"`,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await model.generateContent(prompt);
    return this.parseTags(result.response.text());
  }

  private parseTags(raw: string): ExtractedTag[] {
    try {
      const jsonText = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonText) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error('Gemini 응답이 배열 형식이 아닙니다.');
      }

      return parsed.map((item) => {
        const tag = item as { name?: unknown; confidence?: unknown };
        if (
          typeof tag.name !== 'string' ||
          typeof tag.confidence !== 'number'
        ) {
          throw new Error('Gemini 응답 태그 형식이 올바르지 않습니다.');
        }
        return { name: tag.name, confidence: tag.confidence };
      });
    } catch (error) {
      this.logger.error('Gemini 응답 파싱 실패', error as Error);
      throw new BusinessException(
        LifeRecordErrorCode.TAG_EXTRACTION_FAILED,
        '태그 추출 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
