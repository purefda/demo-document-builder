import { supabase } from '../utils/supabase'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import dotenv from 'dotenv'
import { user } from '../schema'
import path from 'path'

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local')
console.log('Loading environment variables from:', envPath)
const result = dotenv.config({
  path: envPath
})

if (result.error) {
  console.error('Error loading .env.local:', result.error)
  process.exit(1)
}

// Log environment variable presence (not their values for security)
console.log('\nEnvironment variables check:')
console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL)
console.log('SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY)
console.log('SUPABASE_DB_URL:', !!process.env.SUPABASE_DB_URL)

async function testConnections() {
  try {
    // Test Supabase client connection
    console.log('\nTesting Supabase client connection...')
    const { data: version } = await supabase.from('_prisma_migrations').select('*').limit(1)
    console.log('✅ Supabase client connection successful!')

    // Test direct database connection with Drizzle
    console.log('\nTesting Drizzle database connection...')
    let connectionString = process.env.SUPABASE_DB_URL
    if (!connectionString) {
      throw new Error('Missing SUPABASE_DB_URL')
    }

    // Parse and encode the connection string
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/
    const matches = connectionString.match(regex)
    if (matches) {
      const [_, user, pass, host, dbname] = matches
      connectionString = `postgresql://${user}:${encodeURIComponent(pass)}@${host}/${dbname}`
    }
    
    const client = postgres(connectionString)
    const db = drizzle(client)
    
    // Try to query the user table
    const users = await db.select().from(user).limit(1)
    console.log('✅ Drizzle database connection successful!')
    console.log('Sample query result:', users)

  } catch (error) {
    console.error('❌ Connection test failed:', error)
  }
}

testConnections() 