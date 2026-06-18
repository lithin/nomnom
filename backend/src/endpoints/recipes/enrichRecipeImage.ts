import { getPrisma } from "../../shared/db";
import { getErrorMessage } from "../../shared/utils";

const RECIPE_IMAGE_SEARCH_BASE_URL = "https://commons.wikimedia.org/w/api.php";

const buildImageSearchUrl = (title: string) => {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${title} dish food`,
    gsrnamespace: "6",
    gsrlimit: "10",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "1200",
  });

  return `${RECIPE_IMAGE_SEARCH_BASE_URL}?${params.toString()}`;
};

type WikimediaPage = {
  title?: string;
  imageinfo?: Array<{ url?: string; thumburl?: string }>;
};

const isSupportedImageTitle = (title: string) => /\.(jpg|jpeg|png|webp)$/i.test(title);

const searchRecipeImageUrl = async (title: string): Promise<string | null> => {
  const response = await fetch(buildImageSearchUrl(title));

  if (!response.ok) {
    throw new Error(`Image search failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    query?: {
      pages?: Record<string, WikimediaPage>;
    };
  };

  const pages = Object.values(payload.query?.pages ?? {});

  for (const page of pages) {
    const pageTitle = page.title ?? "";

    if (!isSupportedImageTitle(pageTitle)) {
      continue;
    }

    const imageInfo = page.imageinfo?.[0];
    const candidateUrl = imageInfo?.thumburl ?? imageInfo?.url;

    if (candidateUrl) {
      return candidateUrl;
    }
  }

  return null;
};

export const runRecipeImageEnrichment = async (recipeId: string) => {
  const prisma = getPrisma();

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: {
      id: true,
      title: true,
      imageUrl: true,
    },
  });

  if (!recipe || recipe.imageUrl) {
    return;
  }

  const imageUrl = await searchRecipeImageUrl(recipe.title);

  if (!imageUrl) {
    return;
  }

  await prisma.recipe.update({
    where: { id: recipe.id },
    data: { imageUrl },
  });
};

export const queueRecipeImageEnrichment = (recipeId: string) => {
  setImmediate(() => {
    void runRecipeImageEnrichment(recipeId).catch((error) => {
      console.error(`Failed to enrich image for recipe ${recipeId}: ${getErrorMessage(error)}`);
    });
  });
};
