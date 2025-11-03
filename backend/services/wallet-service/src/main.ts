import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 获取配置服务
  const configService = app.get(ConfigService);
  const port = configService.get('app.port');
  const apiPrefix = configService.get('app.apiPrefix');

  // 设置全局前缀
  app.setGlobalPrefix(apiPrefix);

  // 启用 CORS
  app.enableCors({
    origin: true, // 开发环境允许所有来源
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动删除非白名单属性
      forbidNonWhitelisted: false, // 暂时关闭严格验证
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger 文档配置
  const config = new DocumentBuilder()
    .setTitle('DEX Wallet Service API')
    .setDescription('钱包服务 API 文档')
    .setVersion('1.0')
    .addTag('Address', '地址管理')
    .addTag('Balance', '余额查询')
    .addTag('Transaction', '交易监控')
    .addTag('Token', '代币信息')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  console.log(`
    🚀 Wallet Service 启动成功！
    
    📝 Swagger 文档: http://localhost:${port}/api/docs
    🌐 API 地址: http://localhost:${port}/${apiPrefix}
    🔧 环境: ${configService.get('app.nodeEnv')}
  `);
}

bootstrap();

