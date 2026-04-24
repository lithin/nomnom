# Backend

Each endpoint should live in its own file. Shared and general logic should be separated out into their own files.

General functions that are re-used across various files should be extracted into their own files.

Ensure that all data saved in the DB has related Prisma schema. Always prefer Prisma helper queries over raw queries where practical.