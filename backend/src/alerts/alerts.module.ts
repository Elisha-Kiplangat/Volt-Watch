import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({ imports: [AuthModule, WebsocketModule], controllers: [AlertsController], providers: [AlertsService] })
export class AlertsModule {}