export interface Recipe {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  chatSessionId?: string | null;
  tags?: string[];
}

export interface RecipeImageOption {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  alt: string | null;
  credit: string | null;
}
