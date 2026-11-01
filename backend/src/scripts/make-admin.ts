// Makes an existing user an admin. The person must register in the app first.
// Usage: npm run make-admin -- someone@example.com
import { pool } from '../db/pool';
import { makeAdmin } from '../modules/users/commands/make-admin.command';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run make-admin -- someone@example.com');
    process.exitCode = 1;
    return;
  }

  try {
    const user = await makeAdmin(email);
    console.log(`${user.name} (${user.email}) is now an admin.`);
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
