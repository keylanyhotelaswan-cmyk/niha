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

  /** Niha Desktop serves the UI from a random 127.0.0.1 port inside Electron. */
  function isDesktopLocalOrigin(origin: string) {
    return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin);
  }

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: isDevelopment
      ? true
      : (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          if (/^https:\/\/[\w-]+(-[\w-]+)*\.vercel\.app$/i.test(origin)) {
            callback(null, true);
            return;
          }
          if (isDesktopLocalOrigin(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error('Not allowed by CORS'), false);
        },
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
