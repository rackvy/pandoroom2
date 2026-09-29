import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@Controller('api')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('admin/payments/create-link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @UsePipes(new ValidationPipe({ transform: true }))
  createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
    return this.paymentsService.createPaymentLink(dto.bookingId, dto.amount);
  }

  @Get('admin/payments/:bookingId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  getPaymentStatus(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getPaymentStatus(bookingId);
  }

  @Post('payments/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    try {
      await this.paymentsService.handleWebhook(body);
      return 'OK';
    } catch (err) {
      // Не «OK» → Т-Банк повторит доставку и статус в базе не останется расходящимся
      this.logger.error(`TBank webhook error: ${err instanceof Error ? err.message : err}`);
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return 'ERROR';
    }
  }
}
