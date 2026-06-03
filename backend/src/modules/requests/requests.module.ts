import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { Part } from "../parts/part.entity"
import { PartRequest } from "./part-request.entity"
import { RequestsController } from "./requests.controller"
import { RequestsService } from "./requests.service"

@Module({
  imports: [TypeOrmModule.forFeature([PartRequest, Part, Collaborator])],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
