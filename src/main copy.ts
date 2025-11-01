import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

import * as cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ CORS PRIMERO - antes de cualquier otra configuración
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  });
  
  // Luego el resto de configuraciones
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.setGlobalPrefix('api');
    // Configurar cookie parser
  app.use(cookieParser());
  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('PORT') || 3000;
  
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Auth service listening on port ${port}`);
  console.log(`✅ CORS enabled for: http://localhost:5173`);
}
bootstrap();