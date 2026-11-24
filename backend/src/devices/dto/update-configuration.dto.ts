import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateConfigurationDto {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(100) @Max(240) lowVoltageThreshold?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(80) @Max(220) criticalLowVoltageThreshold?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(220) @Max(300) highVoltageThreshold?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(240) @Max(320) criticalHighVoltageThreshold?: number;
  @IsOptional() @IsInt() @Min(1) @Max(3600) recoveryStableDuration?: number;
}