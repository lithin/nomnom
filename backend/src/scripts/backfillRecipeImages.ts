import { execSync } from "node:child_process";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { runRecipeImageEnrichment } from "../endpoints/recipes/enrichRecipeImage";
import { getPrisma } from "../shared/db";

const PROJECT_ID = "nomnom452";

const TARGET = process.argv[2];

if (TARGET !== "dev" && TARGET !== "prod") {
  console.error("Usage: npm run backfill-images -- dev|prod");
  process.exit(1);
}

const loadEnv = () => {
  if (TARGET === "dev") {
    dotenv.config({ path: resolve(__dirname, "../../.env") });
    return;
  }

  process.env.DATABASE_URL = execSync(
    `gcloud secrets versions access latest --secret=nomnom-database-url-prod --project ${PROJECT_ID}`,
  )
    .toString()
    .trim();

  process.env.UNSPLASH_ACCESS_KEY = execSync(
    `gcloud secrets versions access latest --secret=nomnom-unsplash-access-key --project ${PROJECT_ID}`,
  )
    .toString()
    .trim();
};

const main = async () => {
  loadEnv();

  const prisma = getPrisma();

  const recipes = await prisma.recipe.findMany({
    where: { imageUrl: null },
    select: { id: true, title: true },
  });

  console.log(`Found ${recipes.length} recipes without images (targeting ${TARGET} db)`);

  for (const recipe of recipes) {
    console.log(`Enriching: ${recipe.title}`);
    await runRecipeImageEnrichment(recipe.id);
  }

  console.log("Done.");
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
