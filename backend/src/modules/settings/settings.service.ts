import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { AppSetting } from "./app-setting.entity"

const LOW_STOCK_THRESHOLD_KEY = "lowStockThreshold"

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingsRepository: Repository<AppSetting>
  ) {}

  async onModuleInit() {
    const setting = await this.settingsRepository.findOne({
      where: { key: LOW_STOCK_THRESHOLD_KEY },
    })

    if (!setting) {
      await this.settingsRepository.save({
        key: LOW_STOCK_THRESHOLD_KEY,
        value: "5",
      })
    }
  }

  async getSettings() {
    return {
      lowStockThreshold: await this.getLowStockThreshold(),
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
}
