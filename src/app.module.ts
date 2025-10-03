/* eslint-disable prettier/prettier */
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { MessageModule } from "./message/message.module";
import { RabbitMQModule } from "./rabbitmq/rabbitmq.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("DATABASE_URL"),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ProfileModule,
    MessageModule,
    RabbitMQModule,
  ],
})
export class AppModule {}
