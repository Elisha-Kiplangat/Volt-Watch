import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MonitoringGateway } from './websocket.gateway';

@Module({ imports: [AuthModule], providers: [MonitoringGateway], exports: [MonitoringGateway] })
export class WebsocketModule {}