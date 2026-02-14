import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotzeiService } from './botzei.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [BotzeiService],
  exports: [BotzeiService],
})
export class BotzeiModule {}
