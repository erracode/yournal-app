import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Entry = {
    id: number
    user_id: string
    content: object
    created_at: string
    updated_at: string
}

export type Profile = {
    user_id: string
    email: string
    full_name: string | null
    created_at: string
} 