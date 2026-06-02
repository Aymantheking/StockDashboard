import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

export interface Part {
  id: number
  name: string
  category: string
  reference: string
  quantity: number
  location: string
  status: string
}

type PartInput = Omit<Part, "id">

@Injectable()
export class PartsService {
  private parts: Part[] = [
    {
      id: 1,
      name: "STM32 Nucleo Board",
      category: "Microcontroller",
      reference: "NUCLEO-F446RE",
      quantity: 12,
      location: "Lab A - Shelf 1",
      status: "Available",
    },
    {
      id: 2,
      name: "Ultrasonic Sensor",
      category: "Sensor",
      reference: "HC-SR04",
      quantity: 5,
      location: "Lab B - Box 3",
      status: "Low Stock",
    },
    {
      id: 3,
      name: "Raspberry Pi 4",
      category: "Development Board",
      reference: "RPi-4B",
      quantity: 3,
      location: "Cabinet C2",
      status: "Borrowed",
    },
  ]

  findAll() {
    return this.parts
  }

  findOne(id: number) {
    const part = this.parts.find((currentPart) => currentPart.id === id)

    if (!part) {
      throw new NotFoundException(`Part with id ${id} not found`)
    }

    return part
  }

  create(input: PartInput) {
    this.validatePartInput(input)

    const part: Part = {
      ...input,
      id: this.getNextId(),
    }

    this.parts.push(part)
    return part
  }

  update(id: number, input: Partial<PartInput>) {
    const part = this.findOne(id)
    const updatedPart = { ...part, ...input }

    this.validatePartInput(updatedPart)

    this.parts = this.parts.map((currentPart) =>
      currentPart.id === id ? updatedPart : currentPart
    )

    return updatedPart
  }

  remove(id: number) {
    this.findOne(id)
    this.parts = this.parts.filter((part) => part.id !== id)
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

  private getNextId() {
    return this.parts.length > 0
      ? Math.max(...this.parts.map((part) => part.id)) + 1
      : 1
  }
}
