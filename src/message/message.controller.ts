import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { MessageService } from "./message.service";
import { SendMessageDto } from "./dtos/send-message.dto";

@Controller()
@UseGuards(AuthGuard("jwt"))
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Post("sendMessage")
  async sendMessage(@Request() req, @Body() sendMessageDto: SendMessageDto) {
    return this.messageService.sendMessage(req.user.id, sendMessageDto);
  }

  @Get("viewMessages")
  async viewMessages(@Request() req, @Query("userId") otherUserId?: string) {
    if (otherUserId) {
      return this.messageService.getMessages(req.user.id, otherUserId);
    } else {
      return this.messageService.getConversations(req.user.id);
    }
  }

  @Get("messages")
  async getMessages(@Request() req, @Query("userId") otherUserId?: string) {
    return this.messageService.getMessages(req.user.id, otherUserId);
  }

  @Get("conversations")
  async getConversations(@Request() req) {
    return this.messageService.getConversations(req.user.id);
  }
}
