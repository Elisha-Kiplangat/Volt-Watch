import { MeasurementSource } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class TelemetryDto {
  @IsString()
  deviceId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(500)
  voltage!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1000)
  current?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1000)
  frequency?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100000)
  power?: number;

  @IsOptional()
  @IsEnum(MeasurementSource)
  source?: MeasurementSource;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}