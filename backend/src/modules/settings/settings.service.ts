import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { AppSetting } from "./app-setting.entity"

const LOW_STOCK_THRESHOLD_KEY = "lowStockThreshold"
const LATE_RETURN_PENALTY_KEY = "lateReturnPenaltyStars"
const DAMAGED_ITEM_PENALTY_KEY = "damagedItemPenaltyStars"
const STOCK_LOCATIONS_KEY = "stockLocations"
const INVENTORY_CATEGORIES_KEY = "inventoryCategories"

const DEFAULT_STOCK_LOCATIONS = [
  "Office",
  "Laboratory",
  "Room 1",
  "Cabinet C1",
  "Cabinet C2",
  "Receiving Area",
]

const DEFAULT_INVENTORY_CATEGORIES = [
  "Microprocessors",
  "Microcontrollers",
  "PCBs",
  "Sensors",
  "Actuators",
  "Development Boards",
  "Communication Modules",
  "Connectors",
  "Cables",
  "Power Modules",
  "Test Equipment",
  "Tools",
  "Other",
]

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingsRepository: Repository<AppSetting>
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.ensureSetting(LOW_STOCK_THRESHOLD_KEY, "5"),
      this.ensureSetting(LATE_RETURN_PENALTY_KEY, "0.5"),
      this.ensureSetting(DAMAGED_ITEM_PENALTY_KEY, "1"),
      this.ensureSetting(STOCK_LOCATIONS_KEY, JSON.stringify(DEFAULT_STOCK_LOCATIONS)),
      this.ensureSetting(
        INVENTORY_CATEGORIES_KEY,
        JSON.stringify(DEFAULT_INVENTORY_CATEGORIES)
      ),
    ])
  }

  async getSettings() {
    return {
      lowStockThreshold: await this.getLowStockThreshold(),
      lateReturnPenaltyStars: await this.getNumberSetting(
        LATE_RETURN_PENALTY_KEY,
        0.5
      ),
      damagedItemPenaltyStars: await this.getNumberSetting(
        DAMAGED_ITEM_PENALTY_KEY,
        1
      ),
      stockLocations: await this.getStringListSetting(
        STOCK_LOCATIONS_KEY,
        DEFAULT_STOCK_LOCATIONS
      ),
      inventoryCategories: await this.getStringListSetting(
        INVENTORY_CATEGORIES_KEY,
        DEFAULT_INVENTORY_CATEGORIES
      ),
      appName: "Bertrandt Inventory System",
    }
  }

  async getLowStockThreshold() {
    const setting = await this.settingsRepository.findOne({
      where: { key: LOW_STOCK_THRESHOLD_KEY },
    })

    return Number(setting?.value || 5)
  }

  async updateLowStockThreshold(value: number) {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException("lowStockThreshold must be a number >= 0")
    }

    await this.settingsRepository.save({
      key: LOW_STOCK_THRESHOLD_KEY,
      value: String(value),
    })

    return this.getSettings()
  }

  async getRatingRules() {
    return {
      lateReturnPenaltyStars: await this.getNumberSetting(
        LATE_RETURN_PENALTY_KEY,
        0.5
      ),
      damagedItemPenaltyStars: await this.getNumberSetting(
        DAMAGED_ITEM_PENALTY_KEY,
        1
      ),
    }
  }

  async updateRatingRules(input: {
    lateReturnPenaltyStars: number
    damagedItemPenaltyStars: number
  }) {
    this.validatePenalty(input.lateReturnPenaltyStars, "lateReturnPenaltyStars")
    this.validatePenalty(
      input.damagedItemPenaltyStars,
      "damagedItemPenaltyStars"
    )

    await Promise.all([
      this.saveSetting(
        LATE_RETURN_PENALTY_KEY,
        String(input.lateReturnPenaltyStars)
      ),
      this.saveSetting(
        DAMAGED_ITEM_PENALTY_KEY,
        String(input.damagedItemPenaltyStars)
      ),
    ])

    return this.getSettings()
  }

  async updateStockLocations(locations: string[]) {
    await this.saveSetting(
      STOCK_LOCATIONS_KEY,
      JSON.stringify(this.normalizeStringList(locations, DEFAULT_STOCK_LOCATIONS))
    )
    return this.getSettings()
  }

  async updateInventoryCategories(categories: string[]) {
    await this.saveSetting(
      INVENTORY_CATEGORIES_KEY,
      JSON.stringify(
        this.normalizeStringList(categories, DEFAULT_INVENTORY_CATEGORIES)
      )
    )
    return this.getSettings()
  }

  private async ensureSetting(key: string, value: string) {
    const setting = await this.settingsRepository.findOne({ where: { key } })
    if (!setting) {
      await this.settingsRepository.save({ key, value })
    }
  }

  private async saveSetting(key: string, value: string) {
    await this.settingsRepository.save({ key, value })
  }

  private async getNumberSetting(key: string, fallback: number) {
    const setting = await this.settingsRepository.findOne({ where: { key } })
    const value = Number(setting?.value ?? fallback)
    return Number.isFinite(value) ? value : fallback
  }

  private async getStringListSetting(key: string, fallback: string[]) {
    const setting = await this.settingsRepository.findOne({ where: { key } })
    if (!setting?.value) {
      return fallback
    }

    try {
      const parsed = JSON.parse(setting.value)
      return this.normalizeStringList(Array.isArray(parsed) ? parsed : [], fallback)
    } catch {
      return fallback
    }
  }

  private normalizeStringList(values: unknown[], fallback: string[]) {
    const normalized = values
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
    const uniqueValues = [...new Set(normalized)]
    return uniqueValues.length > 0 ? uniqueValues : fallback
  }

  private validatePenalty(value: number, field: string) {
    if (!Number.isFinite(value) || value < 0 || value > 5) {
      throw new BadRequestException(`${field} must be between 0 and 5`)
    }
  }
}
