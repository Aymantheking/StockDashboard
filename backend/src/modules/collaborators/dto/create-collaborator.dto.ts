import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator"
import {
  CollaboratorGroup,
  Division,
} from "../entities/collaborator.entity"

export class CreateCollaboratorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty({ enum: Division })
  @IsEnum(Division)
  division: Division

  @ApiProperty({ enum: CollaboratorGroup })
  @IsEnum(CollaboratorGroup)
  group: CollaboratorGroup

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  role: string
}
