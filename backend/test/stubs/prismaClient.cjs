// Stub for prismock's `require("@prisma/client")`.
//
// With Prisma 7 the client is generated to src/generated/prisma (custom
// output), so the @prisma/client package itself is not requireable. prismock
// only touches Prisma.dmmf inside the PrismockClient constructor, which the
// tests never use - they build the in-memory client from the schema via
// generatePrismock() (see ../testDb.ts).
module.exports = { Prisma: {} };
