import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEventDto } from '../events/dto/create-event.dto';
import { EventsService } from '../events/events.service';
import { TelemetryDto } from '../telemetry/dto/telemetry.dto';
import { TelemetryService } from '../telemetry/telemetry.service';

@Injectable()
export class MqttMessageProcessor {
  constructor(private readonly telemetry: TelemetryService, private readonly events: EventsService) {}

  async processTelemetry(payload: unknown) {
    return this.telemetry.ingest(await this.validate(payload, TelemetryDto));
  }

  async processEvent(payload: unknown) {
    return this.events.create(await this.validate(payload, CreateEventDto));
  }

  private async validate<T extends object>(payload: unknown, dto: new () => T): Promise<T> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BadRequestException('Device message must be a JSON object.');
    const message = plainToInstance(dto, payload);
    const errors = await validate(message, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) throw new BadRequestException(errors.flatMap((error) => Object.values(error.constraints ?? {})));
    return message;
  }
}