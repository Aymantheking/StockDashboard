import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Supplier, SupplierStatus } from "./supplier.entity"

type SupplierInput = {
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  website?: string
  country?: string
  notes?: string
  status?: SupplierStatus
}

@Injectable()
export class SuppliersService implements OnModuleInit {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>
  ) {}

  async onModuleInit() {
    const count = await this.suppliersRepository.count()

    if (count > 0) {
      return
    }

    await this.suppliersRepository.save([
      this.suppliersRepository.create({
        name: "Mouser Electronics",
        contactPerson: "Sales Support",
        email: "support@mouser.com",
        phone: "",
        website: "https://www.mouser.com",
        country: "United States",
        notes: "Electronic components distributor.",
        status: SupplierStatus.Active,
      }),
      this.suppliersRepository.create({
        name: "Digi-Key Electronics",
        contactPerson: "Sales Support",
        email: "support@digikey.com",
        phone: "",
        website: "https://www.digikey.com",
        country: "United States",
        notes: "Electronic components distributor.",
        status: SupplierStatus.Active,
      }),
    ])
  }

  findAll() {
    return this.suppliersRepository.find({ order: { id: "ASC" } })
  }

  async findOne(id: number) {
    const supplier = await this.suppliersRepository.findOne({ where: { id } })

    if (!supplier) {
      throw new NotFoundException(`Supplier with id ${id} not found`)
    }

    return supplier
  }

  async create(input: SupplierInput) {
    this.validateInput(input)
    const supplier = this.suppliersRepository.create(this.normalizeInput(input))
    return this.suppliersRepository.save(supplier)
  }

  async update(id: number, input: Partial<SupplierInput>) {
    const supplier = await this.findOne(id)
    const updatedSupplier = {
      ...supplier,
      ...this.normalizeInput(input),
    }

    this.validateInput(updatedSupplier)
    return this.suppliersRepository.save(updatedSupplier)
  }

  async remove(id: number) {
    const supplier = await this.findOne(id)
    await this.suppliersRepository.remove(supplier)
    return { deleted: true }
  }

  private validateInput(input: Partial<SupplierInput>) {
    if (!input.name?.trim()) {
      throw new BadRequestException("name is required")
    }

    if (
      input.status &&
      !Object.values(SupplierStatus).includes(input.status as SupplierStatus)
    ) {
      throw new BadRequestException("status is invalid")
    }
  }

  private normalizeInput(input: Partial<SupplierInput>) {
    return {
      name: input.name?.trim() || "",
      contactPerson: input.contactPerson?.trim() || "",
      email: input.email?.trim() || "",
      phone: input.phone?.trim() || "",
      website: input.website?.trim() || "",
      country: input.country?.trim() || "",
      notes: input.notes?.trim() || "",
      status: input.status || SupplierStatus.Active,
    }
  }
}
