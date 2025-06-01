import type { Express } from "express";
import { emailService } from "./email-service";

export function setupEmailPreview(app: Express) {
  // Email preview endpoint for development/testing
  app.get("/api/email/preview/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      
      // Generate sample email content
      const emailResult = await emailService.sendWelcomeEmail({
        firstName: "Alexander",
        lastName: "Menjivar", 
        email: email,
        username: "alexander.menjivar",
        role: "student"
      });
      
      if (emailResult.emailContent) {
        res.setHeader('Content-Type', 'text/html');
        res.send(emailResult.emailContent);
      } else {
        res.status(500).json({ message: "Failed to generate email preview" });
      }
    } catch (error) {
      console.error("Email preview error:", error);
      res.status(500).json({ message: "Failed to generate email preview" });
    }
  });
}