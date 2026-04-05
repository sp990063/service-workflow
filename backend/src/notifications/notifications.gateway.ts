/**
 * Notifications Gateway
 * 
 * WebSocket gateway for real-time notifications
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict to specific origins
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || 
                    client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;

      if (!userId) {
        this.logger.warn(`Client ${client.id} has invalid token`);
        client.disconnect();
        return;
      }

      // Store user info on socket
      (client as any).userId = userId;

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected as user ${userId}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    this.logger.log(`Client ${client.id} (user: ${userId}) disconnected`);
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`Sent ${event} to user ${userId}`);
  }

  /**
   * Send new notification
   */
  sendNotification(userId: string, notification: any) {
    this.sendToUser(userId, 'notification:new', notification);
  }

  /**
   * Send workflow status update
   */
  sendWorkflowUpdate(userId: string, update: any) {
    this.sendToUser(userId, 'workflow:status', update);
  }

  /**
   * Send approval completed event
   */
  sendApprovalCompleted(userId: string, approval: any) {
    this.sendToUser(userId, 'approval:completed', approval);
  }

  /**
   * Handle client authentication
   */
  @SubscribeMessage('authenticate')
  handleAuth(@MessageBody() data: { token: string }, @ConnectedSocket() client: Socket) {
    try {
      const payload = this.jwtService.verify(data.token);
      const userId = payload.sub || payload.id;

      if (userId) {
        (client as any).userId = userId;
        client.join(`user:${userId}`);
        return { success: true, userId };
      }

      return { success: false, error: 'Invalid token' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle join room request
   */
  @SubscribeMessage('join')
  handleJoin(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    client.join(data.room);
    return { success: true, room: data.room };
  }

  /**
   * Handle leave room request
   */
  @SubscribeMessage('leave')
  handleLeave(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    client.leave(data.room);
    return { success: true, room: data.room };
  }

  /**
   * Ping-pong for connection health check
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', timestamp: Date.now() };
  }
}
