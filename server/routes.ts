import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWritingSessionSchema, insertAiInteractionSchema } from "@shared/schema";
import { z } from "zod";
import { checkRestrictedPrompt, generateAiResponse } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get or create a default writing session
  app.get("/api/session", async (req, res) => {
    try {
      // For demo purposes, use a default user ID of 1
      const userId = 1;
      
      // Get existing sessions for user
      const sessions = await storage.getUserWritingSessions(userId);
      
      if (sessions.length > 0) {
        // Return the most recent session
        const session = sessions.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        res.json(session);
      } else {
        // Create a new session
        const newSession = await storage.createWritingSession({
          userId,
          title: "New Writing Session",
          content: "",
          wordCount: 0,
        });
        res.json(newSession);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get or create session" });
    }
  });

  // Update writing session content
  app.patch("/api/session/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Calculate word count if content is provided
      if (updateData.content) {
        const words = updateData.content.trim().split(/\s+/).filter((word: string) => word.length > 0);
        updateData.wordCount = words.length;
      }
      
      const updatedSession = await storage.updateWritingSession(sessionId, updateData);
      
      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // AI assistance endpoint
  app.post("/api/ai-help", async (req, res) => {
    try {
      const { sessionId, prompt } = req.body;
      
      if (!sessionId || !prompt) {
        return res.status(400).json({ message: "Session ID and prompt are required" });
      }

      // Check if prompt is restricted
      const isRestricted = checkRestrictedPrompt(prompt);
      
      let response: string;
      
      if (isRestricted) {
        response = "❌ Sorry! This type of AI help isn't allowed. Try asking for brainstorming, outlining, or feedback instead. I'm here to help you learn and improve your own writing skills, not to do the work for you.";
      } else {
        // Generate helpful AI response using OpenAI
        response = await generateAiResponse(prompt);
      }

      // Store the interaction
      const interaction = await storage.createAiInteraction({
        sessionId: parseInt(sessionId),
        prompt,
        response,
        isRestricted,
      });

      res.json({
        response,
        isRestricted,
        interaction,
      });
    } catch (error) {
      console.error("AI help error:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  // Get AI interaction history for a session
  app.get("/api/session/:id/interactions", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const interactions = await storage.getSessionInteractions(sessionId);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get interactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
