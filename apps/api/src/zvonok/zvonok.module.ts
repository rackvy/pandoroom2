import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ZvonokService } from './zvonok.service';
import { ZvonokController } from './zvonok.controller';

@Module({
  imports: [IntegrationsModule],
  controllers: [ZvonokController],
  providers: [ZvonokService],
  exports: [ZvonokService],
})
export class ZvonokModule {}
