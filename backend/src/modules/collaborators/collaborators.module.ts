import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "./collaborator.entity"
import { CollaboratorsController } from "./collaborators.controller"
import { CollaboratorsService } from "./collaborators.service"
import { RatingHistory } from "./rating-history.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Collaborator, RatingHistory])],
  controllers: [CollaboratorsController],
  providers: [CollaboratorsService],
})
export class CollaboratorsModule {}
