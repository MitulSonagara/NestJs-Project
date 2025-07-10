import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'debug', 'error', 'warn', 'verbose'],
  });

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

  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(process.env.PORT ?? 1612);
}
bootstrap();
