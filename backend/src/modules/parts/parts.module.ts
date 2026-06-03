import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Part } from "./part.entity"
import { PartsController } from "./parts.controller"
import { PartsService } from "./parts.service"

@Module({
  imports: [TypeOrmModule.forFeature([Part])],
  controllers: [PartsController],
  providers: [PartsService],
})
export class PartsModule {}
