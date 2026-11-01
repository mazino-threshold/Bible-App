/** How long an emailed login code works. */
export const CODE_TTL_MINUTES = 10;

/** Wrong guesses allowed before a code is locked. */
export const MAX_CODE_ATTEMPTS = 5;

/** Codes a user can request per hour (and at most one per minute). */
export const MAX_CODES_PER_HOUR = 5;

/** Sessions not used for this long are treated as signed out. */
export const SESSION_IDLE_DAYS = 90;
