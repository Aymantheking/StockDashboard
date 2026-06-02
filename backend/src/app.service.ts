import { Injectable } from "@nestjs/common"

@Injectable()
export class AppService {
  getHealth() {
    return {
      message: "StockDashboard backend is running",
    }
  }
}
