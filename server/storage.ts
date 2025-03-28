import { users, type User, type InsertUser, workspaces, type Workspace, type InsertWorkspace } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { profiles } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  getWorkspacesByOrganizationId(organizationId: number): Promise<Workspace[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    // This will actually be handled by the database, not the MemStorage
    // But we define it here to satisfy the interface
    return {} as Workspace;
  }
  
  async getWorkspacesByOrganizationId(organizationId: number): Promise<Workspace[]> {
    // This will actually be handled by the database, not the MemStorage
    // But we define it here to satisfy the interface
    return [];
  }
}

export const storage = new MemStorage();

// Database operations for profiles
export async function getProfileByUserIdAndOrgId(userId: number, organizationId: number) {
  return await db.query.profiles.findFirst({
    where: and(
      eq(profiles.userId, userId),
      eq(profiles.organizationId, organizationId)
    ),
  });
}

// Database operations for workspaces
export async function createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
  const [newWorkspace] = await db.insert(workspaces).values(workspace).returning();
  return newWorkspace;
}

export async function getWorkspacesByOrganizationId(organizationId: number): Promise<Workspace[]> {
  return await db.query.workspaces.findMany({
    where: eq(workspaces.organizationId, organizationId),
  });
}
