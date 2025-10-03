import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ProfileService } from "./profile.service";
import { CreateProfileDto } from "./dtos/create-profile.dto";
import { UpdateProfileDto } from "./dtos/update-profile.dto";

@Controller()
@UseGuards(AuthGuard("jwt"))
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get("getProfile")
  async getProfile(@Request() req) {
    return this.profileService.getProfile(req.user.id);
  }

  @Post("createProfile")
  async createProfile(
    @Request() req,
    @Body() createProfileDto: CreateProfileDto,
  ) {
    return this.profileService.createProfile(req.user.id, createProfileDto);
  }

  @Put("updateProfile")
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(req.user.id, updateProfileDto);
  }

  @Get("horoscope")
  async getHoroscope(@Request() req) {
    return this.profileService.getHoroscope(req.user.id);
  }
}
