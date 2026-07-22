import type { Request, Response, Router } from "express";
import { getPrisma } from "../../shared/db";
import { appendChatMessages } from "../chat/chatHistory";

export const buildRecipeChatSeedMessages = (recipe: { title: string; content: string }) => [
  {
    role: "user" as const,
    text: `I want to update the recipe "${recipe.title}". Let's start with what we have. Please provide the current recipe and I will tell you what to change.`,
  },
  {
    role: "assistant" as const,
    text: `Sure. Here is the current recipe for "${recipe.title}":\n\n${recipe.content}\n\nWhat would you like me to update?`,
  },
];

// Recipes created through chat are linked to their originating session at
// creation time (see createRecipe.ts). This backfills the rare recipe without
// one (legacy data, or its session was deleted) so that retrieval always
// returns a chatSessionId. The new session is seeded with intro messages so
// the edit chat opens with the recipe context instead of empty.
const createAndLinkChatSession = async (recipe: { id: string; title: string; content: string }) => {
  const prisma = getPrisma();

  const createdSession = await prisma.chatSession.create({
    data: {
      title: recipe.title || "New chat",
    },
    select: {
      id: true,
    },
  });

  // Explicit createdAt offsets keep the user/assistant order stable.
  const seededAt = Date.now();
  await appendChatMessages(
    buildRecipeChatSeedMessages(recipe).map((message, index) => ({
      ...message,
      chatId: createdSession.id,
      createdAt: new Date(seededAt + index),
    })),
  );

  await prisma.recipe.update({
    where: { id: recipe.id },
    data: { chatSessionId: createdSession.id },
  });

  return createdSession.id;
};

export const setupRecipesEndpoint = (app: Router) => {
  app.get("/recipes", async (_req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      const recipes = await prisma.recipe.findMany({
        orderBy: {
          title: "asc",
        },
        select: {
          id: true,
          title: true,
          content: true,
          imageUrl: true,
          createdAt: true,
          chatSessionId: true,
          tags: { select: { name: true } },
        },
      });
      const mapped = await Promise.all(
        recipes.map(async ({ tags, ...r }) => ({
          ...r,
          chatSessionId: r.chatSessionId ?? (await createAndLinkChatSession(r)),
          tags: tags.map((t) => t.name),
        })),
      );
      res.status(200).json({ recipes: mapped, source: "local" });
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  app.get("/recipes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (typeof id !== "string") {
        res.status(400).json({ error: "Invalid ID" });
        return;
      }

      const prisma = getPrisma();
      const recipe = await prisma.recipe.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          content: true,
          imageUrl: true,
          createdAt: true,
          chatSessionId: true,
          tags: { select: { name: true } },
        },
      });

      if (!recipe) {
        res.status(404).json({ error: "Recipe not found" });
        return;
      }

      const { tags, ...rest } = recipe;
      res.status(200).json({
        ...rest,
        chatSessionId: rest.chatSessionId ?? (await createAndLinkChatSession(rest)),
        tags: tags.map((t) => t.name),
      });
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ error: "Failed to fetch recipe" });
    }
  });

  app.delete("/recipes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (typeof id !== "string") {
        res.status(400).json({ error: "Invalid ID" });
        return;
      }

      const prisma = getPrisma();

      await prisma.recipe.delete({
        where: { id },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ error: "Failed to delete recipe" });
    }
  });
};
