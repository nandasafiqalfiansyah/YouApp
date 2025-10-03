import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { MessageService } from "./message.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RabbitMQService } from "../rabbitmq/rabbitmq.service";
import { ZodiacUtil } from "../common/utils/zodiac.util";

interface AuthenticatedSocket extends Socket {
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private typingUsers: Map<string, NodeJS.Timeout> = new Map(); // userId -> timeout

  constructor(
    private jwtService: JwtService,
    private messageService: MessageService,
    private prisma: PrismaService,
    private rabbitMQService: RabbitMQService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      console.log("Client connecting...", client.handshake.auth);

      const token =
        client.handshake.auth.token || client.handshake.headers.token;

      if (!token) {
        console.log("No token provided");
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token.replace("Bearer ", ""));
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          profile: {
            select: {
              name: true,
              zodiacSign: true,
              horoscope: true,
              birthday: true,
            },
          },
        },
      });

      if (!user) {
        console.log("User not found");
        client.disconnect();
        return;
      }

      client.user = user;
      this.connectedUsers.set(user.id, client.id);

      // Setup RabbitMQ queue for user
      await this.rabbitMQService.setupUserQueue(user.id);

      // Subscribe to RabbitMQ messages
      await this.rabbitMQService.subscribeToQueue(user.id, (message) => {
        this.handleRabbitMQMessage(user.id, message);
      });

      // Join user to their personal room
      client.join(`user_${user.id}`);

      // Broadcast online status with zodiac info
      this.server.emit("user_online", {
        userId: user.id,
        username: user.username,
        zodiacSign: user.profile?.zodiacSign,
        horoscope: user.profile?.horoscope,
        profile: user.profile,
        socketId: client.id,
      });

      // Send current online users to the connected client
      const onlineUsers = Array.from(this.connectedUsers.entries()).map(
        ([userId, socketId]) => ({
          userId,
          socketId,
        }),
      );

      client.emit("online_users", onlineUsers);

      console.log(
        `User ${user.username} (${user.profile?.zodiacSign}) connected with socket ${client.id}`,
      );
    } catch (error) {
      console.error("Connection error:", error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.connectedUsers.delete(client.user.id);

      // Clear typing indicator if exists
      const typingTimeout = this.typingUsers.get(client.user.id);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        this.typingUsers.delete(client.user.id);
      }

      this.server.emit("user_offline", {
        userId: client.user.id,
        username: client.user.username,
        zodiacSign: client.user.profile?.zodiacSign,
      });

      console.log(`User ${client.user.username} disconnected`);
    }
  }

  private async handleRabbitMQMessage(userId: string, message: any) {
    const socketId = this.connectedUsers.get(userId);

    if (socketId) {
      console.log(`Processing RabbitMQ message for user ${userId}:`, message);

      if (message.type === "NOTIFICATION") {
        this.server.to(socketId).emit("rabbitmq_notification", message.data);

        // Also send via WebSocket for real-time updates
        if (message.data.type === "NEW_MESSAGE") {
          this.server.to(socketId).emit("new_message_notification", {
            ...message.data,
            via: "rabbitmq",
            timestamp: new Date().toISOString(),
          });

          // Show browser notification if supported
          this.server.to(socketId).emit("browser_notification", {
            title: `New message from ${message.data.message.sender.username}`,
            body: message.data.message.content,
            icon: "/favicon.ico",
            tag: `message_${message.data.message.id}`,
          });
        } else if (message.data.type === "MESSAGE_READ") {
          this.server.to(socketId).emit("message_read_notification", {
            ...message.data,
            via: "rabbitmq",
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      console.log(
        `User ${userId} is offline, storing notification for later delivery`,
      );
      // Here you could store the notification in database for when user comes online
    }
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    try {
      const { receiverId, content } = data;

      if (!receiverId || !content) {
        client.emit("message_error", {
          error: "Receiver ID and content are required",
        });
        return {
          success: false,
          error: "Receiver ID and content are required",
        };
      }

      // Save message to database with RabbitMQ notifications
      const message = await this.messageService.sendMessage(client.user.id, {
        receiverId,
        content,
      });

      // Get zodiac insight for the message
      const zodiacInsight = this.getZodiacInsight(
        client.user.profile?.zodiacSign,
      );
      const dailyHoroscope = client.user.profile?.zodiacSign
        ? ZodiacUtil.getDailyHoroscope(client.user.profile.zodiacSign)
        : null;

      // Emit to sender with enhanced data
      client.emit("message_sent", {
        ...message,
        zodiacInsight,
        dailyHoroscope,
        senderZodiac: client.user.profile?.zodiacSign,
        timestamp: new Date().toISOString(),
      });

      // Emit to receiver if online via WebSocket
      const receiverSocketId = this.connectedUsers.get(receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit("new_message", {
          ...message,
          zodiacInsight,
          dailyHoroscope,
          senderZodiac: client.user.profile?.zodiacSign,
          timestamp: new Date().toISOString(),
        });

        // Send browser notification
        this.server.to(receiverSocketId).emit("browser_notification", {
          title: `New message from ${client.user.username}`,
          body: content,
          icon: "/favicon.ico",
          tag: `message_${message.id}`,
          data: { messageId: message.id, senderId: client.user.id },
        });
      }

      // Emit to both users' conversation rooms
      const conversationRoom1 = `conversation_${client.user.id}_${receiverId}`;
      const conversationRoom2 = `conversation_${receiverId}_${client.user.id}`;

      this.server.to(conversationRoom1).emit("message_delivered", {
        ...message,
        zodiacInsight,
        timestamp: new Date().toISOString(),
      });
      this.server.to(conversationRoom2).emit("message_delivered", {
        ...message,
        zodiacInsight,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `Message sent from ${client.user.id} to ${receiverId}: ${content}`,
      );

      return {
        success: true,
        message: {
          ...message,
          zodiacInsight,
          dailyHoroscope,
        },
      };
    } catch (error) {
      console.error("Send message error:", error);
      client.emit("message_error", {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("join_conversation")
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { otherUserId: string },
  ) {
    try {
      const { otherUserId } = data;

      if (!otherUserId) {
        return { success: false, error: "Other user ID is required" };
      }

      // Verify other user exists
      const otherUser = await this.prisma.user.findUnique({
        where: { id: otherUserId },
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
      });

      if (!otherUser) {
        return { success: false, error: "User not found" };
      }

      // Join conversation room (bidirectional)
      const room1 = `conversation_${client.user.id}_${otherUserId}`;
      const room2 = `conversation_${otherUserId}_${client.user.id}`;

      client.join(room1);
      client.join(room2);

      // Get conversation history with zodiac compatibility
      const messages = await this.messageService.getMessages(
        client.user.id,
        otherUserId,
      );

      // Get zodiac compatibility
      const compatibility = await this.getZodiacCompatibility(
        client.user.id,
        otherUserId,
      );

      client.emit("conversation_joined", {
        otherUser,
        room: room1,
        compatibility,
        timestamp: new Date().toISOString(),
      });

      client.emit("conversation_history", {
        messages,
        compatibility,
        otherUserZodiac: otherUser.profile?.zodiacSign,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `User ${client.user.id} joined conversation with ${otherUserId}`,
      );

      return {
        success: true,
        room: room1,
        otherUser,
        compatibility,
      };
    } catch (error) {
      console.error("Join conversation error:", error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("leave_conversation")
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { otherUserId: string },
  ) {
    try {
      const { otherUserId } = data;

      if (!otherUserId) {
        return { success: false, error: "Other user ID is required" };
      }

      const room1 = `conversation_${client.user.id}_${otherUserId}`;
      const room2 = `conversation_${otherUserId}_${client.user.id}`;

      client.leave(room1);
      client.leave(room2);

      client.emit("conversation_left", {
        otherUserId,
        room: room1,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `User ${client.user.id} left conversation with ${otherUserId}`,
      );

      return { success: true, room: room1 };
    } catch (error) {
      console.error("Leave conversation error:", error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("typing_start")
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { receiverId: string; conversationId?: string },
  ) {
    try {
      const { receiverId, conversationId } = data;

      if (!receiverId) {
        return { success: false, error: "Receiver ID is required" };
      }

      // Clear existing timeout if any
      const existingTimeout = this.typingUsers.get(client.user.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout to automatically stop typing after 3 seconds
      const timeout = setTimeout(() => {
        this.handleTypingStop(client, { receiverId, conversationId });
        this.typingUsers.delete(client.user.id);
      }, 3000);

      this.typingUsers.set(client.user.id, timeout);

      const receiverSocketId = this.connectedUsers.get(receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit("user_typing", {
          userId: client.user.id,
          username: client.user.username,
          zodiacSign: client.user.profile?.zodiacSign,
          typing: true,
          conversationId,
          timestamp: new Date().toISOString(),
        });
      }

      // Also emit to conversation room
      if (conversationId) {
        this.server.to(conversationId).emit("user_typing", {
          userId: client.user.id,
          username: client.user.username,
          zodiacSign: client.user.profile?.zodiacSign,
          typing: true,
          conversationId,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Typing start error:", error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("typing_stop")
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { receiverId: string; conversationId?: string },
  ) {
    try {
      const { receiverId, conversationId } = data;

      if (!receiverId) {
        return { success: false, error: "Receiver ID is required" };
      }

      // Clear typing timeout
      const timeout = this.typingUsers.get(client.user.id);
      if (timeout) {
        clearTimeout(timeout);
        this.typingUsers.delete(client.user.id);
      }

      const receiverSocketId = this.connectedUsers.get(receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit("user_typing", {
          userId: client.user.id,
          username: client.user.username,
          zodiacSign: client.user.profile?.zodiacSign,
          typing: false,
          conversationId,
          timestamp: new Date().toISOString(),
        });
      }

      // Also emit to conversation room
      if (conversationId) {
        this.server.to(conversationId).emit("user_typing", {
          userId: client.user.id,
          username: client.user.username,
          zodiacSign: client.user.profile?.zodiacSign,
          typing: false,
          conversationId,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Typing stop error:", error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("mark_as_read")
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId?: string },
  ) {
    try {
      const { messageId, conversationId } = data;

      if (!messageId) {
        return { success: false, error: "Message ID is required" };
      }

      const message = await this.messageService.markAsRead(
        messageId,
        client.user.id,
      );

      // Notify sender that message was read
      const senderSocketId = this.connectedUsers.get(message.senderId);
      if (senderSocketId) {
        this.server.to(senderSocketId).emit("message_read", {
          messageId: message.id,
          readBy: client.user.id,
          readByUsername: client.user.username,
          readByZodiac: client.user.profile?.zodiacSign,
          readAt: new Date(),
          conversationId,
          timestamp: new Date().toISOString(),
        });
      }

      // Also notify in conversation room
      if (conversationId) {
        this.server.to(conversationId).emit("message_read", {
          messageId: message.id,
          readBy: client.user.id,
          readByUsername: client.user.username,
          readAt: new Date(),
          conversationId,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true, message };
    } catch (error) {
      console.error("Mark as read error:", error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("get_zodiac_compatibility")
  async handleGetZodiacCompatibility(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { otherUserId: string },
  ) {
    try {
      const { otherUserId } = data;

      if (!otherUserId) {
        return { success: false, error: "Other user ID is required" };
      }

      const compatibility = await this.getZodiacCompatibility(
        client.user.id,
        otherUserId,
      );

      return {
        success: true,
        ...compatibility,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Get zodiac compatibility error:", error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("get_online_users")
  async handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const onlineUsers: Array<{
        id: string;
        username: string;
        profile: {
          name: string;
          zodiacSign: string;
          horoscope: string;
        } | null;
        socketId: string;
        online: boolean;
      }> = [];

      for (const [userId, socketId] of this.connectedUsers.entries()) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                name: true,
                zodiacSign: true,
                horoscope: true,
              },
            },
          },
        });

        if (user) {
          onlineUsers.push({
            ...user,
            socketId,
            online: true,
            profile:
              user.profile &&
              user.profile.zodiacSign !== null &&
              user.profile.horoscope !== null
                ? {
                    name: user.profile.name,
                    zodiacSign: user.profile.zodiacSign,
                    horoscope: user.profile.horoscope,
                  }
                : null,
          });
        }
      }

      client.emit("online_users_list", {
        users: onlineUsers,
        count: onlineUsers.length,
        timestamp: new Date().toISOString(),
      });

      return { success: true, users: onlineUsers, count: onlineUsers.length };
    } catch (error) {
      console.error("Get online users error:", error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("get_user_profile")
  async handleGetUserProfile(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    try {
      const { userId } = data;

      if (!userId) {
        return { success: false, error: "User ID is required" };
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              name: true,
              birthday: true,
              height: true,
              weight: true,
              interests: true,
              zodiacSign: true,
              horoscope: true,
            },
          },
        },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Calculate age and additional zodiac info
      const age = user.profile?.birthday
        ? ZodiacUtil.calculateAge(user.profile.birthday)
        : null;
      const zodiacElement = user.profile?.zodiacSign
        ? ZodiacUtil.getZodiacElement(user.profile.zodiacSign)
        : null;
      const dailyHoroscope = user.profile?.zodiacSign
        ? ZodiacUtil.getDailyHoroscope(user.profile.zodiacSign)
        : null;

      return {
        success: true,
        user: {
          ...user,
          profile: user.profile
            ? {
                ...user.profile,
                age,
                zodiacElement,
                dailyHoroscope,
              }
            : null,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Get user profile error:", error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("ping")
  async handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    return {
      success: true,
      message: "pong",
      userId: client.user.id,
      timestamp: new Date().toISOString(),
    };
  }

  // Helper Methods
  private getZodiacInsight(zodiacSign?: string): string {
    if (!zodiacSign) return "";

    const insights = {
      Aries: "Your direct approach is appreciated! ♈",
      Taurus: "Your stable presence brings comfort. ♉",
      Gemini: "Your communication skills shine! ♊",
      Cancer: "Your emotional depth connects deeply. ♋",
      Leo: "Your confident energy is inspiring! ♌",
      Virgo: "Your attention to detail is noted. ♍",
      Libra: "Your balanced perspective is valuable. ♎",
      Scorpio: "Your intensity creates powerful bonds. ♏",
      Sagittarius: "Your adventurous spirit is contagious! ♐",
      Capricorn: "Your reliability builds strong foundations. ♑",
      Aquarius: "Your innovative thinking stands out! ♒",
      Pisces: "Your compassion makes a difference. ♓",
    };

    return insights[zodiacSign] || "Your unique perspective is valued! ✨";
  }

  private async getZodiacCompatibility(userId1: string, userId2: string) {
    try {
      const [user1, user2] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId1 },
          include: {
            profile: {
              select: {
                zodiacSign: true,
              },
            },
          },
        }),
        this.prisma.user.findUnique({
          where: { id: userId2 },
          include: {
            profile: {
              select: {
                zodiacSign: true,
              },
            },
          },
        }),
      ]);

      if (!user1?.profile?.zodiacSign || !user2?.profile?.zodiacSign) {
        return {
          compatible: false,
          message: "Zodiac information not available for both users",
          score: 0,
        };
      }

      const zodiac1 = user1.profile.zodiacSign;
      const zodiac2 = user2.profile.zodiacSign;

      const compatibility = this.calculateZodiacCompatibility(zodiac1, zodiac2);

      return {
        user1Zodiac: zodiac1,
        user2Zodiac: zodiac2,
        ...compatibility,
        elements: {
          user1: ZodiacUtil.getZodiacElement(zodiac1),
          user2: ZodiacUtil.getZodiacElement(zodiac2),
        },
      };
    } catch (error) {
      console.error("Error calculating zodiac compatibility:", error);
      return {
        compatible: false,
        message: "Error calculating compatibility",
        score: 0,
      };
    }
  }

  private calculateZodiacCompatibility(zodiac1: string, zodiac2: string) {
    const compatibilityMatrix: {
      [key: string]: { compatible: string[]; score: number };
    } = {
      Aries: {
        compatible: ["Leo", "Sagittarius", "Gemini", "Aquarius"],
        score: 85,
      },
      Taurus: {
        compatible: ["Virgo", "Capricorn", "Cancer", "Pisces"],
        score: 80,
      },
      Gemini: { compatible: ["Libra", "Aquarius", "Aries", "Leo"], score: 90 },
      Cancer: {
        compatible: ["Scorpio", "Pisces", "Taurus", "Virgo"],
        score: 75,
      },
      Leo: {
        compatible: ["Aries", "Sagittarius", "Gemini", "Libra"],
        score: 88,
      },
      Virgo: {
        compatible: ["Taurus", "Capricorn", "Cancer", "Scorpio"],
        score: 82,
      },
      Libra: {
        compatible: ["Gemini", "Aquarius", "Leo", "Sagittarius"],
        score: 87,
      },
      Scorpio: {
        compatible: ["Cancer", "Pisces", "Virgo", "Capricorn"],
        score: 78,
      },
      Sagittarius: {
        compatible: ["Aries", "Leo", "Libra", "Aquarius"],
        score: 92,
      },
      Capricorn: {
        compatible: ["Taurus", "Virgo", "Scorpio", "Pisces"],
        score: 79,
      },
      Aquarius: {
        compatible: ["Gemini", "Libra", "Aries", "Sagittarius"],
        score: 89,
      },
      Pisces: {
        compatible: ["Cancer", "Scorpio", "Taurus", "Capricorn"],
        score: 76,
      },
    };

    const isCompatible =
      compatibilityMatrix[zodiac1]?.compatible.includes(zodiac2);
    const baseScore = isCompatible ? compatibilityMatrix[zodiac1].score : 45;

    // Adjust score based on element compatibility
    const element1 = ZodiacUtil.getZodiacElement(zodiac1);
    const element2 = ZodiacUtil.getZodiacElement(zodiac2);

    let elementBonus = 0;
    if (element1 === element2) {
      elementBonus = 10; // Same element
    } else if (
      (element1 === "Fire" && element2 === "Air") ||
      (element1 === "Air" && element2 === "Fire") ||
      (element1 === "Water" && element2 === "Earth") ||
      (element1 === "Earth" && element2 === "Water")
    ) {
      elementBonus = 5; // Compatible elements
    }

    const finalScore = Math.min(baseScore + elementBonus, 100);

    const messages = {
      high: [
        "Excellent match! ✨",
        "Great compatibility! 🌟",
        "Perfect connection! 💫",
      ],
      medium: [
        "Good potential! 🌈",
        "Nice connection! 💖",
        "Promising match! 🌺",
      ],
      low: [
        "Interesting combination! 🔮",
        "Unique connection! 🌌",
        "Learning opportunity! 📚",
      ],
    };

    let messageArray;
    if (finalScore >= 80) messageArray = messages.high;
    else if (finalScore >= 60) messageArray = messages.medium;
    else messageArray = messages.low;

    const randomMessage =
      messageArray[Math.floor(Math.random() * messageArray.length)];

    return {
      compatible: isCompatible,
      score: finalScore,
      message: `${zodiac1} & ${zodiac2}: ${randomMessage} (${finalScore}%)`,
      description: this.getCompatibilityDescription(finalScore),
    };
  }

  private getCompatibilityDescription(score: number): string {
    if (score >= 90)
      return "Exceptional compatibility! You two are meant to connect on a deep level.";
    if (score >= 80)
      return "Great compatibility! Your energies harmonize well together.";
    if (score >= 70)
      return "Good compatibility! You have solid potential for a meaningful connection.";
    if (score >= 60)
      return "Moderate compatibility! There are good aspects to build upon.";
    if (score >= 50)
      return "Fair compatibility! With understanding, this can grow into something special.";
    return "Challenging compatibility! This connection offers opportunities for growth and learning.";
  }
}
