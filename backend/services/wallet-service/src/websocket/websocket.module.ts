import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

/**
 * WebSocket Module
 * 提供实时事件推送功能
 */
@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class WebSocketModule {}

