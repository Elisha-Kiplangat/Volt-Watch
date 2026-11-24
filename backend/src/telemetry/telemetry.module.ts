import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

@Module({ imports: [AuthModule, WebsocketModule], controllers: [TelemetryController], providers: [TelemetryService], exports: [TelemetryService] })
export class TelemetryModule {}