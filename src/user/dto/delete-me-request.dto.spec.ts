import { validate } from 'class-validator';
import { DeleteMeRequestDto } from './delete-me-request.dto';

describe('DeleteMeRequestDto', () => {
  it.each([undefined, 'OTHER'] as const)(
    'accepts the optional withdrawal reason %s without a detail',
    async (reason) => {
      const dto = new DeleteMeRequestDto();
      dto.confirmation = '탈퇴합니다';
      dto.reason = reason;

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );
});
