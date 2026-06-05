import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Part } from "../parts/part.entity"
import { Purchase } from "./purchase.entity"
import { PurchasesController } from "./purchases.controller"
import { PurchasesService } from "./purchases.service"

@Module({
  imports: [TypeOrmModule.forFeature([Purchase, Part])],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
