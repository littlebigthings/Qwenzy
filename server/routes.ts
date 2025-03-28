import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, createWorkspace, getWorkspacesByOrganizationId } from "./storage";
import { insertWorkspaceSchema } from "@shared/schema";

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

  // Create workspace
  app.post('/api/workspaces', async (req, res) => {
    try {
      const workspaceData = insertWorkspaceSchema.parse(req.body);
      
      const newWorkspace = await createWorkspace(workspaceData);
      
      return res.status(201).json(newWorkspace);
    } catch (error) {
      console.error('Failed to create workspace:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid workspace data', details: error.errors });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get workspaces by organization ID
  app.get('/api/organizations/:id/workspaces', async (req, res) => {
    try {
      const organizationId = parseInt(req.params.id);
      
      if (!organizationId) {
        return res.status(400).json({ error: 'Missing organization ID' });
      }
      
      const workspaces = await getWorkspacesByOrganizationId(organizationId);
      
      return res.json(workspaces);
    } catch (error) {
      console.error('Failed to get workspaces:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
