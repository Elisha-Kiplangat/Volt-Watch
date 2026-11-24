import { EventType, Severity } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateEventDto {
  @IsString() deviceId!: string;
  @IsEnum(EventType) eventType!: EventType;
  @IsEnum(Severity) severity!: Severity;
  @IsString() @MaxLength(1000) description!: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(500) voltage?: number;
  @IsOptional() @IsString() @MaxLength(128) externalId?: string;
  @IsOptional() @IsString() @MaxLength(128) deduplicationKey?: string;
  @IsOptional() @IsDateString() eventTimestamp?: string;
}