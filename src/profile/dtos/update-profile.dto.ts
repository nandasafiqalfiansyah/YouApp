import { PartialType } from "@nestjs/mapped-types";
import { CreateProfileDto } from "./create-profile.dto";
import { IsOptional, IsArray, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  birthday?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  height?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  weight?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
}
