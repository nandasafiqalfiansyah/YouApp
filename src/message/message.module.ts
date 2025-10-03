import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MessageService } from "./message.service";
import { MessageController } from "./message.controller";
import { ChatGateway } from "./chat.gateway";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "supersecret",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [MessageController],
  providers: [MessageService, ChatGateway],
  exports: [MessageService],
})
export class MessageModule {}
