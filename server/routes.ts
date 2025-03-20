import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Organization membership check
  app.get('/api/organizations/:id/check-membership', async (req, res) => {
    try {
      const organizationId = parseInt(req.params.id);
      const userId = req.query.userId as string;
      
      if (!organizationId || !userId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const profile = await storage.getProfileByUserIdAndOrgId(parseInt(userId), organizationId);
      return res.json({ isMember: !!profile });
    } catch (error) {
      console.error('Failed to check organization membership:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
