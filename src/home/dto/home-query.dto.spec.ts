import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HomeQueryDto } from './home-query.dto';

describe('HomeQueryDto', () => {
  it('date가 없으면 통과한다', async () => {
    const dto = plainToInstance(HomeQueryDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('YYYY-MM-DD 형식이면 통과한다', async () => {
    const dto = plainToInstance(HomeQueryDto, { date: '2026-05-12' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('datetime 형식(ISO 8601 전체)은 거부한다', async () => {
    const dto = plainToInstance(HomeQueryDto, {
      date: '2026-05-12T00:00:00Z',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('날짜가 아닌 문자열은 거부한다', async () => {
    const dto = plainToInstance(HomeQueryDto, { date: 'not-a-date' });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
