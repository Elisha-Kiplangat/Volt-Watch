import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({ imports: [AuthModule, TelemetryModule, EventsModule], controllers: [DevicesController], providers: [DevicesService] })
export class DevicesModule {}