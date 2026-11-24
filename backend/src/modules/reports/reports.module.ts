import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AttemptsController } from './attempts.controller.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';
import { RunsReportController } from './runs-report.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [RunsReportController, AttemptsController],
  providers: [ReportsService, ReportsRepository],
  exports: [ReportsService],
})
export class ReportsModule {}
