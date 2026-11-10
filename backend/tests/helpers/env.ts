// Must be the first import of every API test file: it sets up the environment before the app reads it.
import { config } from 'dotenv';

config({ quiet: true });

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to run tests with NODE_ENV=production');
}

// Use a separate test database if one is set; otherwise the DATABASE_URL in .env.
// Tests only touch data in 2099 and delete it afterwards, but a separate database (e.g. a Neon branch) is safer.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

process.env.NODE_ENV = 'test';
// Never send real emails from tests: codes are printed to the logger instead, where the tests capture them
process.env.EMAIL_PROVIDER = 'console';
process.env.CRON_SECRET = 'test-cron-secret-1234567890';
// YouVersion is simulated by the harness; this key is never sent anywhere real
process.env.YOUVERSION_APP_KEY = 'test-youversion-key';
process.env.YOUVERSION_BIBLE_ID = '111';
