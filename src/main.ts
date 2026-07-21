import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.useGlobalPipes(new ZodValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS PG API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );
  app.use('/docs', apiReference({ content: swaggerDocument }));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`Application is running on: http://localhost:${port}`);
  Logger.log(`API docs available at: http://localhost:${port}/docs`);
}
bootstrap().catch((err) => {
  Logger.error('Error during bootstrap', err);
  process.exit(1);
});
