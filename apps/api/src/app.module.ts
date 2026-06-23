import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { ContentModule } from './content/content.module';
import { CatalogModule } from './catalog/catalog.module';
import { BookingModule } from './booking/booking.module';
import { ScheduleModule } from './schedule/schedule.module';
import { PublicModule } from './public/public.module';
import { MediaModule } from './media/media.module';
import { QuestScheduleModule } from './quest-schedule/quest-schedule.module';
import { ClientsModule } from './clients/clients.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VRScheduleModule } from './vr-schedule/vr-schedule.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { IikoModule } from './iiko/iiko.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    ContentModule,
    CatalogModule,
    BookingModule,
    ScheduleModule,
    PublicModule,
    MediaModule,
    QuestScheduleModule,
    ClientsModule,
    NotificationsModule,
    VRScheduleModule,
    GoogleCalendarModule,
    PaymentsModule,
    ReportsModule,
    IikoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
