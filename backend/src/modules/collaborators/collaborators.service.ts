import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { CreateCollaboratorDto } from "./dto/create-collaborator.dto"
import { UpdateCollaboratorDto } from "./dto/update-collaborator.dto"
import { Collaborator } from "./entities/collaborator.entity"

@Injectable()
export class CollaboratorsService {
  constructor(
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>
  ) {}

  findAll() {
    return this.collaboratorsRepository.find({ order: { id: "ASC" } })
  }

  async findOne(id: number) {
    const collaborator = await this.collaboratorsRepository.findOne({
      where: { id },
    })

    if (!collaborator) {
      throw new NotFoundException(`Collaborator ${id} not found`)
    }

    return collaborator
  }

  create(createCollaboratorDto: CreateCollaboratorDto) {
    const collaborator = this.collaboratorsRepository.create(createCollaboratorDto)
    return this.collaboratorsRepository.save(collaborator)
  }

  async update(id: number, updateCollaboratorDto: UpdateCollaboratorDto) {
    const collaborator = await this.findOne(id)
    Object.assign(collaborator, updateCollaboratorDto)
    return this.collaboratorsRepository.save(collaborator)
  }

  async remove(id: number) {
    const collaborator = await this.findOne(id)
    await this.collaboratorsRepository.remove(collaborator)
    return { deleted: true }
  }
}
