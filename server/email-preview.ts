import type { Express } from "express";
import { emailService } from "./email-service";

export function setupEmailPreview(app: Express) {
  // Email preview endpoint for development/testing
  app.get("/api/email/preview/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      
      // Generate sample welcome email content
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

  // Password recovery email preview endpoint
  app.get("/api/email/preview-recovery/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      
      // Generate sample password recovery email content
      const emailResult = await emailService.sendPasswordResetEmail({
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
        res.status(500).json({ message: "Failed to generate recovery email preview" });
      }
    } catch (error) {
      console.error("Recovery email preview error:", error);
      res.status(500).json({ message: "Failed to generate recovery email preview" });
    }
  });
}