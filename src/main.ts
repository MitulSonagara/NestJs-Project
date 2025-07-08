import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  // Validating all the incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // only allow properties in the whitelist
      transform: true, // transform the incoming request to the class
      forbidNonWhitelisted: true, // forbid non whitelisted properties
      disableErrorMessages: false, // give error messages for every property
    }),
  );

  await app.listen(process.env.PORT ?? 1612);
}
bootstrap();
