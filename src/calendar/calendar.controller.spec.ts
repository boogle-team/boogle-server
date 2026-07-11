import { Test, TestingModule } from '@nestjs/testing';
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
    }).compile();

    controller = module.get<CalendarController>(CalendarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMonthlyCalendar는 로그인 사용자 id와 쿼리를 그대로 서비스에 전달한다', async () => {
    await controller.getMonthlyCalendar({ id: 1n }, { year: 2026, month: 6 });

    expect(service.getMonthlyCalendar).toHaveBeenCalledWith(1n, 2026, 6);
  });

  it('getDailyRecords는 로그인 사용자 id와 날짜를 그대로 서비스에 전달한다', async () => {
    await controller.getDailyRecords({ id: 1n }, { date: '2026-06-17' });

    expect(service.getDailyRecords).toHaveBeenCalledWith(1n, '2026-06-17');
  });
});
