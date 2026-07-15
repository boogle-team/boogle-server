import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai';
import { GeminiTagExtractorService } from './gemini-tag-extractor.service';
import { LifeRecordErrorCode } from './life-record-error-code.enum';

jest.mock('@google/generative-ai', () => {
  const actual = jest.requireActual<typeof import('@google/generative-ai')>(
    '@google/generative-ai',
  );
  return { ...actual, GoogleGenerativeAI: jest.fn() };
});

describe('GeminiTagExtractorService', () => {
  let service: GeminiTagExtractorService;
  let generateContent: jest.Mock;
  let config: Record<string, string>;

  beforeEach(async () => {
    generateContent = jest.fn();
    (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: () => ({ generateContent }),
    }));

    config = {
      GEMINI_API_KEY: 'key-1',
      GEMINI_API_KEY2: 'key-2',
      GEMINI_API_KEY3: 'key-3',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiTagExtractorService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile();

    service = module.get<GeminiTagExtractorService>(GeminiTagExtractorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('정상 응답을 태그 배열로 파싱해 반환한다', async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify([{ name: '수면 부족', confidence: 0.94 }]),
      },
    });

    const result = await service.extractTags('어제 잠을 못 잤다.');

    expect(result).toEqual([{ name: '수면 부족', confidence: 0.94 }]);
  });

  it('첫 키가 사용량 초과(429)면 다음 키로 재시도한다', async () => {
    generateContent
      .mockRejectedValueOnce(
        new GoogleGenerativeAIFetchError('quota exceeded', 429),
      )
      .mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify([{ name: '카페인', confidence: 0.9 }]),
        },
      });

    const result = await service.extractTags('커피를 마셨다.');

    expect(result).toEqual([{ name: '카페인', confidence: 0.9 }]);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('모든 키가 실패하면 TAG_EXTRACTION_FAILED를 던진다', async () => {
    generateContent.mockRejectedValue(
      new GoogleGenerativeAIFetchError('quota exceeded', 429),
    );

    await expect(service.extractTags('문장')).rejects.toMatchObject({
      errorCode: LifeRecordErrorCode.TAG_EXTRACTION_FAILED,
    });
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it('응답이 JSON 배열이 아니면 TAG_EXTRACTION_FAILED를 던진다', async () => {
    generateContent.mockResolvedValue({
      response: { text: () => '이건 JSON이 아닙니다' },
    });

    await expect(service.extractTags('문장')).rejects.toMatchObject({
      errorCode: LifeRecordErrorCode.TAG_EXTRACTION_FAILED,
    });
  });

  it('배열 항목의 name/confidence 형식이 어긋나면 TAG_EXTRACTION_FAILED를 던진다', async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify([{ name: '수면 부족', confidence: '높음' }]),
      },
    });

    await expect(service.extractTags('문장')).rejects.toMatchObject({
      errorCode: LifeRecordErrorCode.TAG_EXTRACTION_FAILED,
    });
  });
});
