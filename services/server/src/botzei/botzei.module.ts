import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotzeiService } from './botzei.service';
import { BotzeiController } from './botzei.controller';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [BotzeiController],
  providers: [BotzeiService],
  exports: [BotzeiService],
})
export class BotzeiModule {}
