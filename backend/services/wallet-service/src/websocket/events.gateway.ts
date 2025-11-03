import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket Gateway
 * 负责实时推送事件到前端
 * 
 * 需要安装依赖:
 * pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
 */
@WebSocketGateway({
  cors: {
    origin: '*', // 生产环境应该设置具体的域名
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly addressSubscriptions = new Map<string, Set<string>>(); // address -> Set<socketId>

  /**
   * Gateway 初始化
   */
  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway 已初始化');
  }

  /**
   * 客户端连接
   */
  handleConnection(client: Socket) {
    this.logger.log(`客户端连接: ${client.id}`);
  }

  /**
   * 客户端断开连接
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`客户端断开: ${client.id}`);
    
    // 清理订阅
    this.addressSubscriptions.forEach((sockets, address) => {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        this.logger.debug(`移除订阅: ${address} <- ${client.id}`);
      }
    });
  }

  /**
   * 订阅地址事件
   */
  @SubscribeMessage('subscribe:address')
  handleSubscribeAddress(
    client: Socket,
    payload: { address: string },
  ): { event: string; data: any } {
    const { address } = payload;
    
    if (!address) {
      return {
        event: 'error',
        data: { message: '地址不能为空' },
      };
    }

    const normalizedAddress = address.toLowerCase();

    // 添加订阅
    if (!this.addressSubscriptions.has(normalizedAddress)) {
      this.addressSubscriptions.set(normalizedAddress, new Set());
    }
    this.addressSubscriptions.get(normalizedAddress)!.add(client.id);

    this.logger.log(
      `订阅地址: ${normalizedAddress} <- ${client.id}`,
    );

    return {
      event: 'subscribed',
      data: {
        address: normalizedAddress,
        message: `已订阅地址 ${normalizedAddress}`,
      },
    };
  }

  /**
   * 取消订阅地址事件
   */
  @SubscribeMessage('unsubscribe:address')
  handleUnsubscribeAddress(
    client: Socket,
    payload: { address: string },
  ): { event: string; data: any } {
    const { address } = payload;
    const normalizedAddress = address.toLowerCase();

    const sockets = this.addressSubscriptions.get(normalizedAddress);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.addressSubscriptions.delete(normalizedAddress);
      }
    }

    this.logger.log(
      `取消订阅: ${normalizedAddress} <- ${client.id}`,
    );

    return {
      event: 'unsubscribed',
      data: {
        address: normalizedAddress,
        message: `已取消订阅地址 ${normalizedAddress}`,
      },
    };
  }

  /**
   * 推送新交易事件
   */
  emitNewTransaction(transaction: {
    hash: string;
    from: string;
    to: string;
    value: string;
    blockNumber: string;
    timestamp: string;
  }) {
    const affectedAddresses = [transaction.from, transaction.to].filter(Boolean);

    affectedAddresses.forEach((address) => {
      const sockets = this.addressSubscriptions.get(address.toLowerCase());
      if (sockets && sockets.size > 0) {
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('transaction:new', {
            address,
            transaction,
            timestamp: Date.now(),
          });
        });

        this.logger.debug(
          `推送新交易: ${transaction.hash} -> ${address} (${sockets.size} 个客户端)`,
        );
      }
    });
  }

  /**
   * 推送余额变化事件
   */
  emitBalanceUpdate(data: {
    address: string;
    tokenAddress: string;
    balance: string;
    change: string;
  }) {
    const sockets = this.addressSubscriptions.get(data.address.toLowerCase());
    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('balance:updated', {
          ...data,
          timestamp: Date.now(),
        });
      });

      this.logger.debug(
        `推送余额变化: ${data.address} (${sockets.size} 个客户端)`,
      );
    }
  }

  /**
   * 推送新区块事件
   */
  emitNewBlock(block: {
    number: string;
    hash: string;
    timestamp: string;
    transactionCount: number;
  }) {
    // 广播给所有连接的客户端
    this.server.emit('block:new', {
      ...block,
      timestamp: Date.now(),
    });

    this.logger.debug(`推送新区块: #${block.number}`);
  }

  /**
   * 推送交易确认事件
   */
  emitTransactionConfirmed(data: {
    hash: string;
    blockNumber: string;
    confirmations: number;
  }) {
    // 广播给所有连接的客户端
    this.server.emit('transaction:confirmed', {
      ...data,
      timestamp: Date.now(),
    });

    this.logger.debug(
      `推送交易确认: ${data.hash} (${data.confirmations} 确认)`,
    );
  }

  /**
   * 获取订阅统计
   */
  getStats() {
    const subscriptions = Array.from(this.addressSubscriptions.entries()).map(
      ([address, sockets]) => ({
        address,
        subscribers: sockets.size,
      }),
    );

    return {
      totalAddresses: this.addressSubscriptions.size,
      totalConnections: this.server.sockets.sockets.size,
      subscriptions,
    };
  }
}

