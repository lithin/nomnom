// Global test setup: environment and the third-party kill switch.
//
// Integration tests must never reach the real database, Gemini, or any other
// external service. The database is replaced with an in-memory prismock
// client (see db.ts mock in each test via ./testDb), and as a hard guarantee
// every outbound HTTP request to a non-loopback host throws.
import http from "node:http";
import https from "node:https";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// prismock targets the Prisma <=6 package layout. Redirect its requires to
// Prisma 7's runtime (same exports, new path) and to a stub for the
// non-requireable @prisma/client package (client output lives in
// src/generated/prisma). Patched at the Node resolver level because vitest
// externalizes prismock, so vite-level aliases never see these requires.
const testRequire = createRequire(import.meta.url);
const PRISMA_REDIRECTS: Record<string, string> = {
  "@prisma/client/runtime/library": testRequire.resolve("@prisma/client/runtime/client.js"),
  "@prisma/client": fileURLToPath(new URL("./stubs/prismaClient.cjs", import.meta.url)),
};

const moduleInternals = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
};
const originalResolveFilename = moduleInternals._resolveFilename;
moduleInternals._resolveFilename = function (request: string, ...rest: unknown[]) {
  const redirect = PRISMA_REDIRECTS[request];
  if (redirect) {
    return redirect;
  }
  return originalResolveFilename.call(this, request, ...rest);
};

process.env.BACKEND_API_KEY = "test-api-key";
// Deliberately unset so any unmocked Gemini path fails loudly.
delete process.env.GEMINI_API_KEY;
delete process.env.DATABASE_URL;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

const hostOf = (input: unknown, options: unknown): string => {
  if (typeof input === "string") {
    try {
      return new URL(input).hostname;
    } catch {
      // fall through to options
    }
  }
  if (input instanceof URL) {
    return input.hostname;
  }
  const opts = (typeof input === "object" && input !== null ? input : options) as
    | { host?: string; hostname?: string }
    | undefined;
  return opts?.hostname ?? opts?.host?.replace(/:\d+$/, "") ?? "";
};

const forbid = (host: string) => {
  throw new Error(
    `Blocked outbound request to "${host}" during tests. ` +
      "Integration tests must not call external services - mock the module instead.",
  );
};

const guard = <T extends (...args: never[]) => unknown>(original: T): T =>
  ((...args: Parameters<T>) => {
    const host = hostOf(args[0], args[1]);
    if (host && !LOOPBACK_HOSTS.has(host)) {
      forbid(host);
    }
    return original(...args);
  }) as T;

http.request = guard(http.request.bind(http));
http.get = guard(http.get.bind(http));
https.request = guard(https.request.bind(https));
https.get = guard(https.get.bind(https));

const originalFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const host = new URL(input instanceof Request ? input.url : String(input), "http://localhost")
    .hostname;
  if (!LOOPBACK_HOSTS.has(host)) {
    forbid(host);
  }
  return originalFetch(input, init);
}) as typeof fetch;
