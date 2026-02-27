import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EmployeeRole } from '@prisma/client';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/admin/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  // ==================== BRANCHES ====================
  @Get('branches')
  findAllBranches() {
    return this.catalogService.findAllBranches();
  }

  @Get('branches/:id')
  findOneBranch(@Param('id') id: string) {
    return this.catalogService.findOneBranch(id);
  }

  @Post('branches')
  @Roles(EmployeeRole.ADMIN)
  createBranch(@Body() data: any) {
    return this.catalogService.createBranch(data);
  }

  @Patch('branches/:id')
  @Roles(EmployeeRole.ADMIN)
  updateBranch(@Param('id') id: string, @Body() data: any) {
    return this.catalogService.updateBranch(id, data);
  }

  @Delete('branches/:id')
  @Roles(EmployeeRole.ADMIN)
  removeBranch(@Param('id') id: string) {
    return this.catalogService.removeBranch(id);
  }

  // ==================== QUESTS ====================
  @Get('quests')
  findAllQuests() {
    return this.catalogService.findAllQuests();
  }

  @Get('quests/:id')
  findOneQuest(@Param('id') id: string) {
    return this.catalogService.findOneQuest(id);
  }

  @Post('quests')
  @Roles(EmployeeRole.ADMIN)
  createQuest(@Body() data: any) {
    return this.catalogService.createQuest(data);
  }

  @Patch('quests/:id')
  @Roles(EmployeeRole.ADMIN)
  updateQuest(@Param('id') id: string, @Body() data: any) {
    return this.catalogService.updateQuest(id, data);
  }

  @Delete('quests/:id')
  @Roles(EmployeeRole.ADMIN)
  removeQuest(@Param('id') id: string) {
    return this.catalogService.removeQuest(id);
  }

  // ==================== SUPPLIERS ====================
  @Get('suppliers')
  findAllSuppliers() {
    return this.catalogService.findAllSuppliers();
  }

  @Get('suppliers/:id')
  findOneSupplier(@Param('id') id: string) {
    return this.catalogService.findOneSupplier(id);
  }

  @Post('suppliers')
  @Roles(EmployeeRole.ADMIN)
  createSupplier(@Body() data: any) {
    return this.catalogService.createSupplier(data);
  }

  @Patch('suppliers/:id')
  @Roles(EmployeeRole.ADMIN)
  updateSupplier(@Param('id') id: string, @Body() data: any) {
    return this.catalogService.updateSupplier(id, data);
  }

  @Delete('suppliers/:id')
  @Roles(EmployeeRole.ADMIN)
  removeSupplier(@Param('id') id: string) {
    return this.catalogService.removeSupplier(id);
  }

  // ==================== CAKES ====================
  @Get('cakes')
  findAllCakes() {
    return this.catalogService.findAllCakes();
  }

  @Get('cakes/:id')
  findOneCake(@Param('id') id: string) {
    return this.catalogService.findOneCake(id);
  }

  @Post('cakes')
  @Roles(EmployeeRole.ADMIN)
  createCake(@Body() data: any) {
    return this.catalogService.createCake(data);
  }

  @Patch('cakes/:id')
  @Roles(EmployeeRole.ADMIN)
  updateCake(@Param('id') id: string, @Body() data: any) {
    return this.catalogService.updateCake(id, data);
  }

  @Delete('cakes/:id')
  @Roles(EmployeeRole.ADMIN)
  removeCake(@Param('id') id: string) {
    return this.catalogService.removeCake(id);
  }

  // ==================== SHOW PROGRAMS ====================
  @Get('show-programs')
  findAllShowPrograms() {
    return this.catalogService.findAllShowPrograms();
  }

  @Get('show-programs/:id')
  findOneShowProgram(@Param('id') id: string) {
    return this.catalogService.findOneShowProgram(id);
  }

  @Post('show-programs')
  @Roles(EmployeeRole.ADMIN)
  createShowProgram(@Body() data: any) {
    return this.catalogService.createShowProgram(data);
  }

  @Patch('show-programs/:id')
  @Roles(EmployeeRole.ADMIN)
  updateShowProgram(@Param('id') id: string, @Body() data: any) {
    return this.catalogService.updateShowProgram(id, data);
  }

  @Delete('show-programs/:id')
  @Roles(EmployeeRole.ADMIN)
  removeShowProgram(@Param('id') id: string) {
    return this.catalogService.removeShowProgram(id);
  }

  // ==================== DECORATIONS ====================
  @Get('decorations')
  findAllDecorations() {
    return this.catalogService.findAllDecorations();
  }

  @Get('decorations/:id')
  findOneDecoration(@Param('id') id: string) {
    return this.catalogService.findOneDecoration(id);
  }

  @Post('decorations')
  @Roles(EmployeeRole.ADMIN)
  createDecoration(@Body() data: any) {
    return this.catalogService.createDecoration(data);
  }

  @Patch('decorations/:id')
  @Roles(EmployeeRole.ADMIN)
  updateDecoration(@Param('id') id: string, @Body() data: any) {
    return this.catalogService.updateDecoration(id, data);
  }

  @Delete('decorations/:id')
  @Roles(EmployeeRole.ADMIN)
  removeDecoration(@Param('id') id: string) {
    return this.catalogService.removeDecoration(id);
  }

  // ==================== TABLE ZONES ====================
  @Get('branches/:branchId/zones')
  findZonesByBranch(@Param('branchId') branchId: string) {
    return this.catalogService.findZonesByBranch(branchId);
  }

  @Post('zones')
  @Roles(EmployeeRole.ADMIN)
  createZone(@Body() data: any) {
    return this.catalogService.createZone(data);
  }

  @Patch('zones/:id')
  @Roles(EmployeeRole.ADMIN)
  updateZone(@Param('id') id: string, @Body() data: any) {
    return this.catalogService.updateZone(id, data);
  }

  @Delete('zones/:id')
  @Roles(EmployeeRole.ADMIN)
  removeZone(@Param('id') id: string) {
    return this.catalogService.removeZone(id);
  }

  // ==================== TABLES ====================
  @Get('branches/:branchId/tables')
  findTablesByBranch(@Param('branchId') branchId: string) {
    return this.catalogService.findTablesByBranch(branchId);
  }

  @Post('tables')
  @Roles(EmployeeRole.ADMIN)
  createTable(@Body() data: any) {
    return this.catalogService.createTable(data);
  }

  @Patch('tables/:id')
  @Roles(EmployeeRole.ADMIN)
  updateTable(@Param('id') id: string, @Body() data: any) {
    return this.catalogService.updateTable(id, data);
  }

  @Delete('tables/:id')
  @Roles(EmployeeRole.ADMIN)
  removeTable(@Param('id') id: string) {
    return this.catalogService.removeTable(id);
  }
}
