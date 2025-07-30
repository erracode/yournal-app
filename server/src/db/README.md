# Database Setup for Yournal App

This directory contains the complete database setup for the Yournal journal app.

## 📋 **What's Included**

### **Tables:**

- `profiles` - User profiles linked to Supabase Auth
- `entries` - Journal entries with Yoopta content and embeddings

### **Features:**

- ✅ **Row Level Security (RLS)** - Users can only access their own data
- ✅ **Automatic profile creation** - Trigger creates profile on user signup
- ✅ **Vector embeddings** - 768-dimensional embeddings for semantic search
- ✅ **Text extraction** - Plain text stored separately for search
- ✅ **Performance indexes** - Optimized for fast queries
- ✅ **Helper functions** - Utility functions for common operations

## 🚀 **Quick Setup**

1. **Copy the SQL script** from `complete_setup.sql`
2. **Run it in your Supabase SQL Editor**
3. **That's it!** All tables, functions, and policies are created

## 📊 **Database Schema**

### **profiles table:**

```sql
- user_id (UUID, PK) - Links to auth.users
- email (TEXT) - User's email
- full_name (TEXT) - User's display name
- created_at (TIMESTAMP) - When profile was created
```

### **entries table:**

```sql
- id (BIGINT, PK) - Auto-incrementing entry ID
- user_id (UUID, FK) - Links to profiles.user_id
- content (JSONB) - Yoopta editor content
- text_content (TEXT) - Plain text for embeddings
- embedding (vector(768)) - Vector embedding for search
- created_at (TIMESTAMP) - When entry was created
- updated_at (TIMESTAMP) - When entry was last updated
```

## 🔐 **Security Features**

### **Row Level Security (RLS):**

- Users can only see their own entries
- Users can only modify their own entries
- Automatic user isolation

### **Functions with Security:**

- All functions use `SECURITY DEFINER`
- Functions respect user context via `auth.uid()`

## 🔍 **Search Capabilities**

### **Current Implementation:**

- **Keyword search** - Uses `text_content` field
- **Fallback search** - When embeddings aren't available

### **Future Vector Search:**

- **Semantic search** - Using `match_entries()` function
- **Similarity scoring** - Cosine similarity between embeddings
- **Threshold filtering** - Configurable relevance thresholds

## 🛠 **Helper Functions**

### **Available Functions:**

- `get_user_entry_count()` - Get user's total entries
- `get_user_latest_entry()` - Get user's most recent entry
- `match_entries()` - Vector similarity search (future use)
- `update_entry_embedding()` - Update entry embeddings (future use)

## 📈 **Performance Optimizations**

### **Indexes:**

- `idx_entries_user_id` - Fast user-specific queries
- `idx_entries_created_at` - Fast chronological sorting
- `idx_entries_embedding` - Fast vector similarity search

### **Triggers:**

- **Auto profile creation** - When user signs up
- **Auto timestamp updates** - When entries are modified

## 🔧 **Maintenance**

### **To reset the database:**

```sql
-- Clear all data
TRUNCATE TABLE public.entries;
TRUNCATE TABLE public.profiles;

-- Reset sequences
ALTER SEQUENCE public.entries_id_seq RESTART WITH 1;
```

### **To check setup:**

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('profiles', 'entries');

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('profiles', 'entries');
```

## 🎯 **Current Status**

- ✅ **Basic CRUD operations** - Create, read, update, delete entries
- ✅ **Authentication** - Supabase Auth integration
- ✅ **Text search** - Keyword-based search working
- ✅ **Embeddings** - Generated and stored (768 dimensions)
- 🔄 **Vector search** - Ready for future implementation

## 📝 **Notes**

- The `embedding` column uses 768 dimensions (matching `nomic-embed-text` model)
- The `content` field stores full Yoopta editor structure as JSONB
- The `text_content` field stores clean plain text for search
- Vector search functions are included but not currently used (keyword search is used instead)
