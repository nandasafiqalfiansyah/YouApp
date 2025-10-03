import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RabbitMQService } from "../rabbitmq/rabbitmq.service";

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private rabbitMQService: RabbitMQService,
  ) {}

  async sendMessage(
    senderId: string,
    sendMessageDto: { receiverId: string; content: string },
  ) {
    const { receiverId, content } = sendMessageDto;

    // Check if receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      include: {
        profile: {
          select: {
            name: true,
            zodiacSign: true,
          },
        },
      },
    });

    if (!receiver) {
      throw new NotFoundException("Receiver not found");
    }

    // Get sender info with zodiac
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: {
        profile: {
          select: {
            name: true,
            zodiacSign: true,
          },
        },
      },
    });

    // Create message
    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                name: true,
                zodiacSign: true,
              },
            },
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                name: true,
                zodiacSign: true,
              },
            },
          },
        },
      },
    });

    // Send RabbitMQ notification to receiver
    await this.rabbitMQService.sendMessageNotification(receiverId, {
      ...message,
      zodiacCompatibility: this.getZodiacCompatibility(
        sender?.profile?.zodiacSign ?? undefined,
        receiver.profile?.zodiacSign ?? undefined,
      ),
    });

    return {
      ...message,
      zodiacCompatibility: this.getZodiacCompatibility(
        sender?.profile?.zodiacSign ?? undefined,
        receiver.profile?.zodiacSign ?? undefined,
      ),
    };
  }

  private getZodiacCompatibility(
    senderZodiac?: string,
    receiverZodiac?: string,
  ): string {
    if (!senderZodiac || !receiverZodiac) {
      return "Unknown compatibility";
    }

    const compatibleSigns = {
      Aries: ["Leo", "Sagittarius", "Gemini", "Aquarius"],
      Taurus: ["Virgo", "Capricorn", "Cancer", "Pisces"],
      Gemini: ["Libra", "Aquarius", "Aries", "Leo"],
      Cancer: ["Scorpio", "Pisces", "Taurus", "Virgo"],
      Leo: ["Aries", "Sagittarius", "Gemini", "Libra"],
      Virgo: ["Taurus", "Capricorn", "Cancer", "Scorpio"],
      Libra: ["Gemini", "Aquarius", "Leo", "Sagittarius"],
      Scorpio: ["Cancer", "Pisces", "Virgo", "Capricorn"],
      Sagittarius: ["Aries", "Leo", "Libra", "Aquarius"],
      Capricorn: ["Taurus", "Virgo", "Scorpio", "Pisces"],
      Aquarius: ["Gemini", "Libra", "Aries", "Sagittarius"],
      Pisces: ["Cancer", "Scorpio", "Taurus", "Capricorn"],
    };

    const isCompatible =
      compatibleSigns[senderZodiac]?.includes(receiverZodiac);

    if (isCompatible) {
      return `Great compatibility between ${senderZodiac} and ${receiverZodiac}!`;
    } else {
      return `Interesting connection between ${senderZodiac} and ${receiverZodiac}.`;
    }
  }

  async getMessages(userId: string, otherUserId?: string) {
    let whereCondition: any;

    if (otherUserId) {
      whereCondition = {
        OR: [
          {
            senderId: userId,
            receiverId: otherUserId,
          },
          {
            senderId: otherUserId,
            receiverId: userId,
          },
        ],
      };
    } else {
      whereCondition = {
        OR: [{ senderId: userId }, { receiverId: userId }],
      };
    }

    const messages = await this.prisma.message.findMany({
      where: whereCondition,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                name: true,
                zodiacSign: true,
              },
            },
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                name: true,
                zodiacSign: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Add zodiac compatibility to each message
    return messages.map((message) => ({
      ...message,
      zodiacCompatibility: this.getZodiacCompatibility(
        message.sender.profile?.zodiacSign ?? undefined,
        message.receiver.profile?.zodiacSign ?? undefined,
      ),
    }));
  }

  async getConversations(userId: string) {
    const sentMessages = await this.prisma.message.findMany({
      where: { senderId: userId },
      distinct: ["receiverId"],
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                name: true,
                zodiacSign: true,
                horoscope: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const receivedMessages = await this.prisma.message.findMany({
      where: { receiverId: userId },
      distinct: ["senderId"],
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                name: true,
                zodiacSign: true,
                horoscope: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const conversations = new Map();

    sentMessages.forEach((msg) => {
      conversations.set(msg.receiverId, {
        user: msg.receiver,
        lastMessage: msg.content,
        lastMessageTime: msg.createdAt,
        unreadCount: 0,
        zodiacSign: msg.receiver.profile?.zodiacSign,
        compatibility: this.getZodiacCompatibility(
          undefined, // Current user's zodiac would be added in controller
          msg.receiver.profile?.zodiacSign ?? undefined,
        ),
      });
    });

    receivedMessages.forEach((msg) => {
      const existing = conversations.get(msg.senderId);
      if (
        !existing ||
        new Date(msg.createdAt) > new Date(existing.lastMessageTime)
      ) {
        conversations.set(msg.senderId, {
          user: msg.sender,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: 1,
          zodiacSign: msg.sender.profile?.zodiacSign,
          compatibility: this.getZodiacCompatibility(
            undefined, // Current user's zodiac would be added in controller
            msg.sender.profile?.zodiacSign ?? undefined,
          ),
        });
      }
    });

    return Array.from(conversations.values()).sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime(),
    );
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                name: true,
                zodiacSign: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.receiverId !== userId) {
      throw new ForbiddenException(
        "You can only mark your own messages as read",
      );
    }

    // Send read notification to sender via RabbitMQ
    await this.rabbitMQService.sendMessageReadNotification(message.senderId, {
      id: message.id,
      readBy: userId,
      readAt: new Date(),
      senderZodiac: message.sender.profile?.zodiacSign,
    });

    return message;
  }
}
