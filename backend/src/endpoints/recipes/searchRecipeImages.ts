const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";

// Host of the URLs Unsplash returns for photos. We only ever persist image URLs
// served from here, so the PATCH endpoint can validate a chosen image against
// it (see updateRecipeImage.ts).
export const UNSPLASH_IMAGE_HOST = "images.unsplash.com";

export interface RecipeImageOption {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  alt: string | null;
  credit: string | null;
}

interface UnsplashPhoto {
  id?: string;
  alt_description?: string | null;
  urls?: { regular?: string; thumb?: string };
  user?: { name?: string | null };
}

// Shared Unsplash search used both by background enrichment (count 1, to pick a
// default image) and by the image picker (count 30, to offer alternatives).
export const searchRecipeImages = async (
  query: string,
  count: number,
): Promise<RecipeImageOption[]> => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY is not configured");
  }

  const params = new URLSearchParams({
    query,
    per_page: String(count),
    orientation: "landscape",
  });

  const response = await fetch(`${UNSPLASH_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash image search failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { results?: UnsplashPhoto[] };

  return (payload.results ?? []).flatMap((photo) => {
    const fullUrl = photo.urls?.regular;
    if (!fullUrl) {
      return [];
    }

    return [
      {
        id: photo.id ?? fullUrl,
        thumbUrl: photo.urls?.thumb ?? fullUrl,
        fullUrl,
        alt: photo.alt_description ?? null,
        credit: photo.user?.name ?? null,
      },
    ];
  });
};
