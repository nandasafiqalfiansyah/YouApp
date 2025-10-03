import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateProfileDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "1990-01-01" })
  @IsString()
  @IsNotEmpty()
  birthday: string;

  @ApiProperty({ example: 175 })
  @IsNumber()
  @Min(100)
  @Max(250)
  height: number;

  @ApiProperty({ example: 70 })
  @IsNumber()
  @Min(30)
  @Max(200)
  weight: number;

  @ApiProperty({ example: ["reading", "gaming", "coding"] })
  @IsArray()
  @IsString({ each: true })
  interests: string[];
}
