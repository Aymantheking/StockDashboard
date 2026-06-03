import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { MissingItemRequest } from "./missing-item-request.entity"
import { MissingItemRequestsController } from "./missing-item-requests.controller"
import { MissingItemRequestsService } from "./missing-item-requests.service"

@Module({
  imports: [TypeOrmModule.forFeature([MissingItemRequest, Collaborator])],
  controllers: [MissingItemRequestsController],
  providers: [MissingItemRequestsService],
})
export class MissingItemRequestsModule {}
