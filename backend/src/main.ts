import { createApp } from './app.setup';

async function bootstrap() {
  const app = await createApp();

  // CRITICAL: This is required for Terminus to work perfectly
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
