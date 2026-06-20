import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './modules/app.module.js';
import { PrismaService } from './modules/prisma/prisma.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const config = app.get(ConfigService);
  const prisma = app.get(PrismaService);
  const isDevelopment = (process.env.NODE_ENV ?? 'development') === 'development';
  const allowedOrigins = config.get<string[]>('appUrls') ?? [config.get<string>('appUrl') ?? 'http://localhost:5173'];

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: isDevelopment ? true : allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  const port = config.get<number>('port') ?? 4000;
  await prisma.enableShutdownHooks(app);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
