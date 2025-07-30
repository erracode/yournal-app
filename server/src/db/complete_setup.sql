-- =====================================================
-- Yournal App - Complete Database Setup Script
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- PROFILES TABLE
-- =====================================================

-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ENTRIES TABLE
-- =====================================================

-- Create entries table
CREATE TABLE IF NOT EXISTS public.entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    content JSONB NOT NULL, -- Yoopta editor content
    text_content TEXT, -- Plain text for embeddings and search
    embedding vector(768), -- Vector embeddings for semantic search
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON public.entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON public.entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_embedding ON public.entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger function to automatically create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for entries table
DROP TRIGGER IF EXISTS on_entries_updated ON public.entries;
CREATE TRIGGER on_entries_updated
    BEFORE UPDATE ON public.entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy for profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
CREATE POLICY "Users can manage their own profile" ON public.profiles
    FOR ALL USING ((auth.uid()) = user_id)
    WITH CHECK ((auth.uid()) = user_id);

-- RLS Policy for entries
DROP POLICY IF EXISTS "Users can view their own entries" ON public.entries;
CREATE POLICY "Users can view their own entries" ON public.entries
    FOR SELECT USING ((auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own entries" ON public.entries;
CREATE POLICY "Users can insert their own entries" ON public.entries
    FOR INSERT WITH CHECK ((auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own entries" ON public.entries;
CREATE POLICY "Users can update their own entries" ON public.entries
    FOR UPDATE USING ((auth.uid()) = user_id)
    WITH CHECK ((auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own entries" ON public.entries;
CREATE POLICY "Users can delete their own entries" ON public.entries
    FOR DELETE USING ((auth.uid()) = user_id);

-- =====================================================
-- VECTOR SEARCH FUNCTIONS (Optional - for future use)
-- =====================================================

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_entries(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    id bigint,
    content jsonb,
    text_content text,
    created_at timestamp with time zone,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        entries.id,
        entries.content,
        entries.text_content,
        entries.created_at,
        1 - (entries.embedding <=> query_embedding) AS similarity
    FROM public.entries
    WHERE 
        entries.user_id = p_user_id
        AND entries.embedding IS NOT NULL
        AND 1 - (entries.embedding <=> query_embedding) > match_threshold
    ORDER BY entries.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to update embeddings
CREATE OR REPLACE FUNCTION public.update_entry_embedding(
    entry_id bigint,
    embedding_vector vector(768)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.entries 
    SET embedding = embedding_vector
    WHERE id = entry_id AND user_id = auth.uid();
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.match_entries TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_entry_embedding TO authenticated;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's entry count
CREATE OR REPLACE FUNCTION public.get_user_entry_count(p_user_id UUID DEFAULT auth.uid())
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM public.entries 
        WHERE user_id = p_user_id
    );
END;
$$;

-- Function to get user's latest entry
CREATE OR REPLACE FUNCTION public.get_user_latest_entry(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    id bigint,
    content jsonb,
    text_content text,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        entries.id,
        entries.content,
        entries.text_content,
        entries.created_at
    FROM public.entries
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
END;
$$;

-- Grant permissions for helper functions
GRANT EXECUTE ON FUNCTION public.get_user_entry_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_latest_entry TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users';
COMMENT ON TABLE public.entries IS 'Journal entries with Yoopta content and embeddings';
COMMENT ON COLUMN public.entries.content IS 'Yoopta editor content as JSONB';
COMMENT ON COLUMN public.entries.text_content IS 'Plain text extracted from Yoopta content for embeddings';
COMMENT ON COLUMN public.entries.embedding IS '768-dimensional vector embedding for semantic search';

-- =====================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- =====================================================

-- Uncomment these to test the setup:
/*
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('profiles', 'entries');

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'entries');

-- Check if policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'entries');

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'handle_updated_at', 'match_entries', 'update_entry_embedding');
*/ 