import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

describe('CalendarController', () => {
  let controller: CalendarController;
  let service: { getMonthlyCalendar: jest.Mock; getDailyRecords: jest.Mock };

  beforeEach(async () => {
    service = {
      getMonthlyCalendar: jest.fn(),
      getDailyRecords: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [{ provide: CalendarService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CalendarController>(CalendarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMonthlyCalendar는 로그인 사용자 id와 쿼리를 그대로 서비스에 전달한다', async () => {
    await controller.getMonthlyCalendar({ id: '1' }, { year: 2026, month: 6 });

    expect(service.getMonthlyCalendar).toHaveBeenCalledWith('1', 2026, 6);
  });

  it('getMonthlyCalendar는 서비스에서 발생한 예외를 그대로 전파한다', async () => {
    service.getMonthlyCalendar.mockRejectedValueOnce(new Error('boom'));

    await expect(
      controller.getMonthlyCalendar({ id: '1' }, { year: 2026, month: 6 }),
    ).rejects.toThrow('boom');
  });

  it('getDailyRecords는 로그인 사용자 id와 날짜를 그대로 서비스에 전달한다', async () => {
    await controller.getDailyRecords({ id: '1' }, { date: '2026-06-17' });

    expect(service.getDailyRecords).toHaveBeenCalledWith('1', '2026-06-17');
  });

  it('getDailyRecords는 서비스에서 발생한 예외를 그대로 전파한다', async () => {
    service.getDailyRecords.mockRejectedValueOnce(new Error('boom'));

    await expect(
      controller.getDailyRecords({ id: '1' }, { date: '2026-06-17' }),
    ).rejects.toThrow('boom');
  });
});
