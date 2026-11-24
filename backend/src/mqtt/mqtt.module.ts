import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { MqttMessageProcessor } from './mqtt-message-processor';

@Module({ imports: [EventsModule, TelemetryModule], providers: [MqttMessageProcessor], exports: [MqttMessageProcessor] })
export class MqttModule {}