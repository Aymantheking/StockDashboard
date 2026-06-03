import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common"
import { Part } from "./part.entity"
import { PartsService } from "./parts.service"

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
  create(@Body() part: Omit<Part, "id">) {
    return this.partsService.create(part)
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() part: Partial<Omit<Part, "id">>
  ) {
    return this.partsService.update(id, part)
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.partsService.remove(id)
  }
}
