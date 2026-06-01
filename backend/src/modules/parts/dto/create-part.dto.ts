import { ApiProperty } from "@nestjs/swagger"
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator"

export class CreatePartDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reference: string

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  quantity: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  status: string
}
