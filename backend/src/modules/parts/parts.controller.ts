import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { CreatePartDto } from "./dto/create-part.dto"
import { UpdatePartDto } from "./dto/update-part.dto"
import { PartsService } from "./parts.service"

@ApiTags("parts")
@Controller("parts")
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Get()
  findAll() {
    return this.partsService.findAll()
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.partsService.findOne(id)
  }

  @Post()
  create(@Body() createPartDto: CreatePartDto) {
    return this.partsService.create(createPartDto)
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updatePartDto: UpdatePartDto
  ) {
    return this.partsService.update(id, updatePartDto)
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.partsService.remove(id)
  }
}
