import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployeeRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MediaService } from './media.service';

@Controller('api/admin/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Get()
  findAll() {
    return this.mediaService.findAll();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: any,
    @Body('altText') altText?: string,
  ) {
    return this.mediaService.upload(file, altText);
  }

  @Patch(':id')
  updateMedia(
    @Param('id') id: string,
    @Body() body: { altText?: string },
  ) {
    return this.mediaService.update(id, body);
  }

  @Delete(':id')
  @Roles(EmployeeRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
