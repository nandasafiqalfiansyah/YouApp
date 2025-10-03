import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqplib";

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly exchange = "chat_exchange";
  private readonly queuePrefix = "user_queue";

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.connection?.close();
  }

  private async connect() {
    try {
      const rabbitmqUrl = this.configService.get<string>("RABBITMQ_URL");
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(this.exchange, "direct", {
        durable: true,
      });

      console.log("Connected to RabbitMQ successfully");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  async publishMessage(routingKey: string, message: any) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      await this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      console.log(`Message published to ${routingKey}:`, message);
    } catch (error) {
      console.error("Failed to publish message:", error);
      throw error;
    }
  }

  async subscribeToQueue(userId: string, callback: (message: any) => void) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const queueName = `${this.queuePrefix}_${userId}`;

      // Assert queue
      await this.channel.assertQueue(queueName, { durable: true });

      // Bind queue to exchange with user ID as routing key
      await this.channel.bindQueue(queueName, this.exchange, userId);

      console.log(`Subscribed to queue: ${queueName}`);

      await this.channel.consume(queueName, (msg) => {
        if (msg !== null) {
          try {
            const content = JSON.parse(msg.content.toString());
            callback(content);
            this.channel.ack(msg);
          } catch (error) {
            console.error("Error processing message:", error);
            this.channel.nack(msg);
          }
        }
      });
    } catch (error) {
      console.error("Failed to subscribe to queue:", error);
      throw error;
    }
  }

  async setupUserQueue(userId: string) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const queueName = `${this.queuePrefix}_${userId}`;
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.bindQueue(queueName, this.exchange, userId);

      console.log(`User queue setup: ${queueName}`);
    } catch (error) {
      console.error("Failed to setup user queue:", error);
      throw error;
    }
  }

  async sendNotification(userId: string, notification: any) {
    await this.publishMessage(userId, {
      type: "NOTIFICATION",
      data: notification,
      timestamp: new Date().toISOString(),
    });
  }

  async sendMessageNotification(receiverId: string, messageData: any) {
    const notification = {
      type: "NEW_MESSAGE",
      message: {
        id: messageData.id,
        content: messageData.content,
        sender: messageData.sender,
        createdAt: messageData.createdAt,
      },
      alert: `New message from ${messageData.sender.username}`,
    };

    await this.sendNotification(receiverId, notification);
  }

  async sendMessageReadNotification(senderId: string, messageData: any) {
    const notification = {
      type: "MESSAGE_READ",
      message: {
        id: messageData.id,
        readBy: messageData.readBy,
        readAt: messageData.readAt,
      },
      alert: "Your message was read",
    };

    await this.sendNotification(senderId, notification);
  }
}
