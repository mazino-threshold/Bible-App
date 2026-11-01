import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId: string;
  userId?: string;
}

// Holds the current request's id and user for everything that runs during that request,
// so every log line can include them without passing them through every function.
const storage = new AsyncLocalStorage<RequestContext>();

/** Runs fn with a fresh context. Called once per request by the request logger. */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** The current request's context, or undefined outside a request (e.g. startup, scripts). */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Records who is signed in for the rest of this request. Called by requireAuth. */
export function setContextUser(userId: string): void {
  const context = storage.getStore();
  if (context) context.userId = userId;
}
