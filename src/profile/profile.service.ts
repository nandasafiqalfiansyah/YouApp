import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProfileDto } from "./dtos/create-profile.dto";
import { UpdateProfileDto } from "./dtos/update-profile.dto";
import { ZodiacUtil } from "../common/utils/zodiac.util";

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    // Calculate additional fields if not already stored
    let zodiacSign = profile.zodiacSign;
    let horoscope = profile.horoscope;
    const age = ZodiacUtil.calculateAge(profile.birthday);

    if (!zodiacSign) {
      zodiacSign = ZodiacUtil.getZodiacSign(profile.birthday);
      // Update profile with zodiac sign
      await this.prisma.profile.update({
        where: { userId },
        data: { zodiacSign },
      });
    }

    if (!horoscope) {
      horoscope = ZodiacUtil.getHoroscope(zodiacSign);
      // Update profile with horoscope
      await this.prisma.profile.update({
        where: { userId },
        data: { horoscope },
      });
    }

    return {
      ...profile,
      zodiacSign,
      horoscope,
      age,
      dailyHoroscope: ZodiacUtil.getDailyHoroscope(zodiacSign), // Add daily horoscope
    };
  }

  async createProfile(userId: string, createProfileDto: CreateProfileDto) {
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException("Profile already exists for this user");
    }

    // Calculate zodiac and horoscope
    const zodiacSign = ZodiacUtil.getZodiacSign(createProfileDto.birthday);
    const horoscope = ZodiacUtil.getHoroscope(zodiacSign);
    const age = ZodiacUtil.calculateAge(createProfileDto.birthday);

    const profile = await this.prisma.profile.create({
      data: {
        userId,
        ...createProfileDto,
        zodiacSign,
        horoscope,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return {
      ...profile,
      zodiacSign,
      horoscope,
      age,
      dailyHoroscope: ZodiacUtil.getDailyHoroscope(zodiacSign),
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    // Recalculate zodiac and horoscope if birthday is updated
    let zodiacSign = profile.zodiacSign;
    let horoscope = profile.horoscope;

    if (
      updateProfileDto.birthday &&
      updateProfileDto.birthday !== profile.birthday
    ) {
      zodiacSign = ZodiacUtil.getZodiacSign(updateProfileDto.birthday);
      horoscope = ZodiacUtil.getHoroscope(zodiacSign);
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...updateProfileDto,
        zodiacSign,
        horoscope,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    const age = ZodiacUtil.calculateAge(updatedProfile.birthday);

    return {
      ...updatedProfile,
      zodiacSign,
      horoscope,
      age,
      dailyHoroscope: ZodiacUtil.getDailyHoroscope(zodiacSign as string),
    };
  }

  async getHoroscope(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    const zodiacSign =
      profile.zodiacSign || ZodiacUtil.getZodiacSign(profile.birthday);
    const dailyHoroscope = ZodiacUtil.getDailyHoroscope(zodiacSign);
    const weeklyHoroscope = ZodiacUtil.getWeeklyHoroscope(zodiacSign);

    return {
      zodiacSign,
      dailyHoroscope,
      weeklyHoroscope,
      compatibility: ZodiacUtil.getCompatibility(zodiacSign),
    };
  }
}
