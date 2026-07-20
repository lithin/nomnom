// In-memory database for integration tests, backed by prismock generated
// from prisma/schema.prisma. Import { testDb } and vi.mock shared/db like:
//
//   vi.mock("../src/shared/db", () => import("./testDb"));
//
// so every endpoint's getPrisma() resolves to the same in-memory client.
//
// prismock parses the schema with Prisma 5 tooling, which rejects a few
// Prisma 7 constructs, so the real schema is transformed into a compatible
// copy at runtime (no duplicate schema to keep in sync):
// - generator blocks removed (the prisma-client provider is unknown to v5)
// - datasource replaced (v5 requires a url; Prisma 7 moved it to config)
// - embedding Unsupported("vector") columns dropped (never read by endpoints;
//   they are written via $executeRaw, which prismock no-ops)
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generatePrismock } from "prismock";
import type { PrismaClient } from "../src/generated/prisma/client";

const realSchemaPath = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));

const testDatamodel = readFileSync(realSchemaPath, "utf8")
  .replace(/generator\s+\w+\s*\{[^}]*\}/g, "")
  .replace(
    /datasource\s+\w+\s*\{[^}]*\}/g,
    'datasource db {\n  provider = "postgresql"\n  url      = "postgresql://test:test@localhost:5432/test"\n}',
  )
  .replace(/^\s*embedding\s+Unsupported\([^\n]*$/gm, "");

const testSchemaPath = join(mkdtempSync(join(tmpdir(), "nomnom-test-schema-")), "schema.prisma");
writeFileSync(testSchemaPath, testDatamodel);

const prismock = await generatePrismock({ schemaPath: testSchemaPath });

export const testDb = prismock as unknown as PrismaClient;

export const resetTestDb = () => {
  prismock.setData({ recipe: [], tag: [], chatSession: [], chatMessage: [] });
};

export const getPrisma = (): PrismaClient => testDb;
