import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { SettingsService } from "../settings/settings.service"
import { Part } from "./part.entity"

type PartInput = Partial<
  Omit<Part, "id" | "createdAt" | "updatedAt" | "reservations">
>

@Injectable()
export class PartsService implements OnModuleInit {
  constructor(
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>,
    private readonly settingsService: SettingsService
  ) {}

  async onModuleInit() {
    const count = await this.partsRepository.count()

    if (count === 0) {
      await this.partsRepository.save([
        this.partsRepository.create({
          name: "STM32 Nucleo Board",
          category: "Microcontrollers",
          manufacturer: "STMicroelectronics",
          reference: "NUCLEO-F446RE",
          totalQuantity: 12,
          availableQuantity: 12,
          reservedQuantity: 0,
          borrowedQuantity: 0,
          damagedQuantity: 0,
          quantity: 12,
          location: "Lab A - Shelf 1",
          description: "",
          stockAllocationNote: "",
          status: "Available",
        }),
        this.partsRepository.create({
          name: "Ultrasonic Sensor",
          category: "Sensors",
          manufacturer: "",
          reference: "HC-SR04",
          totalQuantity: 5,
          availableQuantity: 5,
          reservedQuantity: 0,
          borrowedQuantity: 0,
          damagedQuantity: 0,
          quantity: 5,
          location: "Lab B - Box 3",
          description: "",
          stockAllocationNote: "",
          status: "Low Stock",
        }),
        this.partsRepository.create({
          name: "Raspberry Pi 4",
          category: "Development Boards",
          manufacturer: "Raspberry Pi",
          reference: "RPi-4B",
          totalQuantity: 3,
          availableQuantity: 0,
          reservedQuantity: 0,
          borrowedQuantity: 3,
          damagedQuantity: 0,
          quantity: 0,
          location: "Cabinet C2",
          description: "",
          stockAllocationNote: "Seeded as borrowed stock.",
          status: "Borrowed",
        }),
      ])
      return
    }

    await this.migrateLegacyRows()
  }

  async findAll() {
    const parts = await this.partsRepository.find({ order: { name: "ASC" } })
    return this.withCalculatedStatuses(parts)
  }

  async findOne(id: number) {
    const part = await this.findStoredPart(id)
    return (await this.withCalculatedStatuses([part]))[0]
  }

  async create(input: PartInput) {
    const normalizedInput = await this.normalizePartInput(input)
    this.validatePartInput(normalizedInput, null)

    const part = this.partsRepository.create(normalizedInput)
    return this.withCalculatedStatus(await this.partsRepository.save(part))
  }

  async update(id: number, input: PartInput) {
    const part = await this.findStoredPart(id)
    const normalizedInput = await this.normalizePartInput({
      ...part,
      ...input,
    })
    this.validatePartInput(normalizedInput, part)

    Object.assign(part, normalizedInput)
    return this.withCalculatedStatus(await this.partsRepository.save(part))
  }

  async remove(id: number) {
    const part = await this.findStoredPart(id)
    await this.partsRepository.remove(part)
    return { deleted: true }
  }

  private async migrateLegacyRows() {
    const parts = await this.partsRepository.find()
    const migratedParts = parts
      .filter(
        (part) =>
          (part.totalQuantity === 0 && part.quantity > 0) ||
          this.isGeneratedPurchaseReference(part.reference)
      )
      .map((part) => {
        const legacyQuantity = Number(part.quantity || 0)
        const legacyStatus = part.status || "Available"

        if (part.totalQuantity === 0 && part.quantity > 0) {
          part.totalQuantity = legacyQuantity
          part.availableQuantity =
            legacyStatus === "Available" || legacyStatus === "Low Stock"
              ? legacyQuantity
              : 0
          part.reservedQuantity =
            legacyStatus === "Reserved" ? legacyQuantity : 0
          part.borrowedQuantity =
            legacyStatus === "Borrowed" ? legacyQuantity : 0
          part.damagedQuantity =
            legacyStatus === "Damaged" ? legacyQuantity : 0

          this.syncLegacyFields(part)
        }

        if (this.isGeneratedPurchaseReference(part.reference)) {
          part.reference = ""
        }

        return part
      })

    if (migratedParts.length > 0) {
      await this.partsRepository.save(migratedParts)
    }
  }

  private async normalizePartInput(input: PartInput) {
    const availableQuantity =
      input.availableQuantity ?? input.quantity ?? input.totalQuantity ?? 0
    const reservedQuantity = input.reservedQuantity ?? 0
    const borrowedQuantity = input.borrowedQuantity ?? 0
    const damagedQuantity = input.damagedQuantity ?? 0
    const totalQuantity =
      Number(availableQuantity) +
      Number(reservedQuantity) +
      Number(borrowedQuantity) +
      Number(damagedQuantity)

    const normalizedPart = {
      ...input,
      totalQuantity: Number(totalQuantity),
      availableQuantity: Number(availableQuantity),
      reservedQuantity: Number(reservedQuantity),
      borrowedQuantity: Number(borrowedQuantity),
      damagedQuantity: Number(damagedQuantity),
      quantity: Number(availableQuantity),
      manufacturer: input.manufacturer || "",
      reference: input.reference?.trim() || "",
      description: input.description || "",
      imageData: input.imageData || "",
      stockAllocationNote: input.stockAllocationNote || "",
    } as Part

    normalizedPart.status = await this.calculateStatus(normalizedPart)
    return normalizedPart
  }

  private validatePartInput(input: PartInput, previousPart: Part | null) {
    if (!input.name || typeof input.name !== "string") {
      throw new BadRequestException("name is required")
    }

    if (!input.category || typeof input.category !== "string") {
      throw new BadRequestException("category is required")
    }

    const quantities = [
      input.totalQuantity,
      input.availableQuantity,
      input.reservedQuantity,
      input.borrowedQuantity,
      input.damagedQuantity,
    ]

    if (
      quantities.some(
        (quantity) =>
          typeof quantity !== "number" ||
          !Number.isInteger(quantity) ||
          quantity < 0
      )
    ) {
      throw new BadRequestException("all stock quantities must be numbers >= 0")
    }

    const stockSum =
      Number(input.availableQuantity) +
      Number(input.reservedQuantity) +
      Number(input.borrowedQuantity) +
      Number(input.damagedQuantity)

    if (Number(input.totalQuantity) !== stockSum) {
      throw new BadRequestException(
        "totalQuantity must equal available + reserved + borrowed + damaged"
      )
    }

    const damagedQuantityChanged =
      previousPart === null
        ? Number(input.damagedQuantity) > 0
        : Number(input.damagedQuantity) !== previousPart.damagedQuantity

    if (damagedQuantityChanged && !input.stockAllocationNote?.trim()) {
      throw new BadRequestException(
        "stockAllocationNote is required when damaged stock changes"
      )
    }
  }

  private async withCalculatedStatuses(parts: Part[]) {
    return Promise.all(parts.map((part) => this.withCalculatedStatus(part)))
  }

  private async withCalculatedStatus(part: Part) {
    const status = await this.calculateStatus(part)
    return {
      ...part,
      quantity: part.availableQuantity,
      status,
    }
  }

  private async calculateStatus(part: Part) {
    const threshold = await this.settingsService.getLowStockThreshold()

    if (part.totalQuantity === 0 || part.availableQuantity === 0) {
      return "Not Available"
    }

    if (part.availableQuantity <= threshold && part.availableQuantity > 0) {
      return "Low Stock"
    }

    return "Available"
  }

  private async findStoredPart(id: number) {
    const part = await this.partsRepository.findOne({ where: { id } })

    if (!part) {
      throw new NotFoundException(`Part with id ${id} not found`)
    }

    return part
  }

  private syncLegacyFields(part: Part) {
    part.quantity = part.availableQuantity
    part.status =
      part.totalQuantity === 0 || part.availableQuantity === 0
        ? "Not Available"
        : "Available"
  }

  private isGeneratedPurchaseReference(reference: string | null | undefined) {
    return /^(PUR|PURCHASE)-\d+$/i.test(reference?.trim() || "")
  }
}
