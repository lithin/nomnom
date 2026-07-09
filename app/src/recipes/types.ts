export interface Recipe {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  chatSessionId?: string | null;
  tags?: string[];
}
