import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common"
import { AuthenticatedRequest } from "../../common/authenticated-request"
import { AuthService } from "./auth.service"
import { JwtAuthGuard } from "./jwt-auth.guard"

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() body: Parameters<AuthService["register"]>[0]) {
    return this.authService.register(body)
  }

  @Post("login")
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password)
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  profile(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.id)
  }
}
