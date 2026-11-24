import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProtectionController } from './protection.controller';
import { ProtectionService } from './protection.service';

@Module({ imports: [AuthModule], controllers: [ProtectionController], providers: [ProtectionService] })
export class ProtectionModule {}