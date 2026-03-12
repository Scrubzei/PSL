import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotzeiService } from './botzei.service';
import { BotzeiController } from './botzei.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [BotzeiController],
  providers: [BotzeiService],
  exports: [BotzeiService],
})
export class BotzeiModule {}
