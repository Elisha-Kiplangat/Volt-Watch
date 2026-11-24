import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({ imports: [AuthModule, WebsocketModule], controllers: [EventsController], providers: [EventsService], exports: [EventsService] })
export class EventsModule {}