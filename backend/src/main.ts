import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors()
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  const config = new DocumentBuilder()
    .setTitle("StockDashboard API")
    .setDescription("Inventory, collaborators, reservations, and analytics API")
    .setVersion("0.1.0")
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api/docs", app, document)

  const port = Number(process.env.PORT || 3000)
  await app.listen(port)
}

bootstrap()
