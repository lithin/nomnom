import type { Request, Response, Router } from "express";
import { getPrisma } from "./db";

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
          createdAt: true,
          chatSessionId: true,
        },
      });
      res.status(200).json({ recipes });
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Failed to fetch recipes" });
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

  app.post("/recipes/:id/chat-session", async (req: Request, res: Response) => {
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
          chatSessionId: true,
        },
      });

      if (!recipe) {
        res.status(404).json({ error: "Recipe not found" });
        return;
      }

      if (recipe.chatSessionId) {
        res.status(200).json({ chatSessionId: recipe.chatSessionId });
        return;
      }

      const createdSession = await prisma.chatSession.create({
        data: {
          title: recipe.title || "New chat",
        },
        select: {
          id: true,
        },
      });

      const linkedRecipe = await prisma.recipe.update({
        where: { id: recipe.id },
        data: { chatSessionId: createdSession.id },
        select: { chatSessionId: true },
      });

      res.status(200).json({ chatSessionId: linkedRecipe.chatSessionId });
    } catch (error) {
      console.error("Error creating recipe chat session:", error);
      res.status(500).json({ error: "Failed to create recipe chat session" });
    }
  });
};
