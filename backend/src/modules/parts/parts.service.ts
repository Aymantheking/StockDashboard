import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Part } from "./part.entity"

type PartInput = Omit<Part, "id" | "createdAt" | "updatedAt">

@Injectable()
export class PartsService implements OnModuleInit {
  constructor(
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>
  ) {}

  async onModuleInit() {
    const count = await this.partsRepository.count()

    if (count > 0) {
      return
    }

    await this.partsRepository.save([
      this.partsRepository.create({
        name: "STM32 Nucleo Board",
        category: "Microcontroller",
        reference: "NUCLEO-F446RE",
        quantity: 12,
        location: "Lab A - Shelf 1",
        status: "Available",
      }),
      this.partsRepository.create({
        name: "Ultrasonic Sensor",
        category: "Sensor",
        reference: "HC-SR04",
        quantity: 5,
        location: "Lab B - Box 3",
        status: "Low Stock",
      }),
      this.partsRepository.create({
        name: "Raspberry Pi 4",
        category: "Development Board",
        reference: "RPi-4B",
        quantity: 3,
        location: "Cabinet C2",
        status: "Borrowed",
      }),
    ])
  }

  findAll() {
    return this.partsRepository.find({ order: { id: "ASC" } })
  }

  async findOne(id: number) {
    const part = await this.partsRepository.findOne({ where: { id } })

    if (!part) {
      throw new NotFoundException(`Part with id ${id} not found`)
    }

    return part
  }

  async create(input: PartInput) {
    this.validatePartInput(input)

    const part = this.partsRepository.create(input)
    return this.partsRepository.save(part)
  }

  async update(id: number, input: Partial<PartInput>) {
    const part = await this.findOne(id)
    const updatedPart = { ...part, ...input }

    this.validatePartInput(updatedPart)

    return this.partsRepository.save(updatedPart)
  }

  async remove(id: number) {
    const part = await this.findOne(id)
    await this.partsRepository.remove(part)
    return { deleted: true }
  }

  private validatePartInput(input: Partial<PartInput>) {
    if (!input.name || typeof input.name !== "string") {
      throw new BadRequestException("name is required")
    }

    if (!input.category || typeof input.category !== "string") {
      throw new BadRequestException("category is required")
    }

    if (!input.reference || typeof input.reference !== "string") {
      throw new BadRequestException("reference is required")
    }

    if (typeof input.quantity !== "number" || input.quantity < 0) {
      throw new BadRequestException("quantity must be a number >= 0")
    }
  }
}
