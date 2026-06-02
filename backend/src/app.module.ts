import { Module } from "@nestjs/common"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { PartsModule } from "./modules/parts/parts.module"

@Module({
  imports: [PartsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
