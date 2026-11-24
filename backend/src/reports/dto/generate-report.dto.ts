import { ReportType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType!: ReportType;

  @IsOptional() @IsString() @MaxLength(100)
  deviceId?: string;

  @IsDateString()
  periodFrom!: string;

  @IsDateString()
  periodTo!: string;
}