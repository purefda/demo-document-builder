import { drizzle } from "drizzle-orm/postgres-js";
import { desc, eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import { genSaltSync, hashSync } from "bcrypt-ts";
import { chat, chunk, user } from "@/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Create a more complete mock DB client
const mockDb = {
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => Promise.resolve([]),
      orderBy: () => Promise.resolve([])
    })
  }),
  insert: (table: any) => ({
    values: (data: any) => Promise.resolve({
      // For user registration, return a mock user
      email: data.email,
      password: data.password
    })
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => Promise.resolve(null)
    })
  }),
  delete: (table: any) => ({
    where: (condition: any) => Promise.resolve(null)
  })
};

// Check if Supabase DB URL is available
let client;
let db: any; // Using any to simplify types

try {
  // Use SUPABASE_DB_URL instead of POSTGRES_URL
  if (process.env.SUPABASE_DB_URL) {
    console.log("Connecting to Supabase database...");
    
    // Parse and properly encode the database URL
    const dbUrl = process.env.SUPABASE_DB_URL;
    
    // Extract parts of the URL to properly encode the password
    const urlMatch = dbUrl.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
    if (urlMatch) {
      const [_, prefix, password, suffix] = urlMatch;
      // Encode the password component
      const encodedPassword = encodeURIComponent(password);
      const encodedUrl = `${prefix}${encodedPassword}${suffix}`;
      console.log("Using encoded Supabase URL");
      client = postgres(encodedUrl);
    } else {
      console.log("Using original Supabase URL");
      client = postgres(dbUrl);
    }
    
    db = drizzle(client);
  } else {
    console.warn("SUPABASE_DB_URL is not defined. Using mock database.");
    db = mockDb;
  }
} catch (error) {
  console.error("Error connecting to database:", error);
  db = mockDb;
}

export async function getUser(email: string) {
  if (db === mockDb) {
    console.log("Using mock getUser for", email);
    // Return empty array for mockDb to allow registration
    return [];
  }
  return await db.select().from(user).where(eq(user.email, email));
}

export async function createUser(email: string, password: string) {
  let salt = genSaltSync(10);
  let hash = hashSync(password, salt);

  console.log("Creating user:", email);
  return await db.insert(user).values({ email, password: hash });
}

export async function createMessage({
  id,
  messages,
  author,
}: {
  id: string;
  messages: any;
  author: string;
}) {
  const selectedChats = await db.select().from(chat).where(eq(chat.id, id));

  if (selectedChats.length > 0) {
    return await db
      .update(chat)
      .set({
        messages: JSON.stringify(messages),
      })
      .where(eq(chat.id, id));
  }

  return await db.insert(chat).values({
    id,
    createdAt: new Date(),
    messages: JSON.stringify(messages),
    author,
  });
}

export async function getChatsByUser({ email }: { email: string }) {
  return await db
    .select()
    .from(chat)
    .where(eq(chat.author, email))
    .orderBy(desc(chat.createdAt));
}

export async function getChatById({ id }: { id: string }) {
  const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
  return selectedChat;
}

export async function insertChunks({ chunks }: { chunks: any[] }) {
  // Check if chunks array is empty
  if (!chunks || chunks.length === 0) {
    console.warn("No chunks provided to insertChunks");
    return;
  }

  // Handle mock database case
  if (db === mockDb) {
    console.log(`Mock insertChunks: would insert ${chunks.length} chunks`);
    return chunks;
  }

  try {
    return await db.insert(chunk).values(chunks);
  } catch (error) {
    console.error("Error inserting chunks:", error);
    throw error;
  }
}

export async function getChunksByFilePaths({
  filePaths,
}: {
  filePaths: Array<string>;
}) {
  return await db
    .select()
    .from(chunk)
    .where(inArray(chunk.filePath, filePaths));
}

export async function deleteChunksByFilePath({
  filePath,
}: {
  filePath: string;
}) {
  return await db.delete(chunk).where(eq(chunk.filePath, filePath));
}
