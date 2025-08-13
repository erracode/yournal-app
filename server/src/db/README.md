# Database Setup and Migration

## Overview

This directory contains the database setup scripts for the Yournal app, including the migration from Ollama to Requesty embeddings.

## Files

### `complete_setup.sql`

- Complete database setup for new installations
- Creates tables, indexes, triggers, and RLS policies
- Uses 768-dimensional embeddings (nomic-embed-text compatible)

## Current Setup

- **Embeddings**: Uses Requesty with `nomic-embed-text` model (768 dimensions)
- **AI Chat**: Uses Requesty with OpenAI models (GPT-4o, etc.)
- **Benefit**: Consistent 768-dimensional embeddings with good quality

## Troubleshooting

If you encounter issues:

1. **Check your Supabase vector extension:**

   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

2. **Verify embedding column type:**

   ```sql
   SELECT column_name, data_type, udt_name
   FROM information_schema.columns
   WHERE table_name = 'entries' AND column_name = 'embedding';
   ```

3. **Check for existing embeddings:**
   ```sql
   SELECT COUNT(*) as total,
          COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings
   FROM entries;
   ```
