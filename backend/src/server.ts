import { app } from './app';
import { env } from './config/env';
import { logger } from './shared/logger';

// Express 5 passes a failed bind (e.g. port in use or reserved) to this callback instead of throwing
app.listen(env.PORT, (error?: Error) => {
  if (error) {
    logger.error(`Could not start API on port ${env.PORT}`, { error });
    process.exit(1);
  }
  logger.info(`API running on http://localhost:${env.PORT}`, { env: env.NODE_ENV, logLevel: logger.level });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { error: reason });
});
