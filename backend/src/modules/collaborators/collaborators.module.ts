import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CollaboratorsController } from "./collaborators.controller"
import { CollaboratorsService } from "./collaborators.service"
import { Collaborator } from "./entities/collaborator.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Collaborator])],
  controllers: [CollaboratorsController],
  providers: [CollaboratorsService],
  exports: [CollaboratorsService],
})
export class CollaboratorsModule {}
