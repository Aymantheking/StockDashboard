import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { CreatePartDto } from "./dto/create-part.dto"
import { UpdatePartDto } from "./dto/update-part.dto"
import { Part } from "./entities/part.entity"

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>
  ) {}

  findAll() {
    return this.partsRepository.find({ order: { id: "ASC" } })
  }

  async findOne(id: number) {
    const part = await this.partsRepository.findOne({ where: { id } })

    if (!part) {
      throw new NotFoundException(`Part ${id} not found`)
    }

    return part
  }

  create(createPartDto: CreatePartDto) {
    const part = this.partsRepository.create(createPartDto)
    return this.partsRepository.save(part)
  }

  async update(id: number, updatePartDto: UpdatePartDto) {
    const part = await this.findOne(id)
    Object.assign(part, updatePartDto)
    return this.partsRepository.save(part)
  }

  async remove(id: number) {
    const part = await this.findOne(id)
    await this.partsRepository.remove(part)
    return { deleted: true }
  }
}
