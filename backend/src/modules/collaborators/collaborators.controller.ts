import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { CollaboratorsService } from "./collaborators.service"
import { CreateCollaboratorDto } from "./dto/create-collaborator.dto"
import { UpdateCollaboratorDto } from "./dto/update-collaborator.dto"

@ApiTags("collaborators")
@Controller("collaborators")
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Get()
  findAll() {
    return this.collaboratorsService.findAll()
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.collaboratorsService.findOne(id)
  }

  @Post()
  create(@Body() createCollaboratorDto: CreateCollaboratorDto) {
    return this.collaboratorsService.create(createCollaboratorDto)
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCollaboratorDto: UpdateCollaboratorDto
  ) {
    return this.collaboratorsService.update(id, updateCollaboratorDto)
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.collaboratorsService.remove(id)
  }
}
