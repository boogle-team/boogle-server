import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { HomeModule } from './home/home.module';
import { RecordModule } from './record/record.module';
import { LifeRecordModule } from './life-record/life-record.module';
import { FoodModule } from './food/food.module';
import { MedicineModule } from './medicine/medicine.module';
import { CalendarModule } from './calendar/calendar.module';
import { ReportModule } from './report/report.module';
import { GuideModule } from './guide/guide.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    HomeModule,
    RecordModule,
    LifeRecordModule,
    FoodModule,
    MedicineModule,
    CalendarModule,
    ReportModule,
    GuideModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
