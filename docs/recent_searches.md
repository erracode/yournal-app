# Recent Searches — Minimal design

Purpose and scope

- Minimal table storing user_id, query_text, created_at for recent searches used by the RAG chat.
- Keep the schema small and privacy-friendly for now.

References

- DB setup: [`server/src/db/complete_setup.sql`](server/src/db/complete_setup.sql:1)
- Supabase client: [`server/src/lib/supabase.ts`](server/src/lib/supabase.ts:1)
- Suggested route: [`server/src/routes/history.ts`](server/src/routes/history.ts:1)

SQL (add to DB)

```sql
-- Recent searches table (minimal)
CREATE TABLE IF NOT EXISTS public.recent_searches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recent_searches_user_created ON public.recent_searches(user_id, created_at DESC);

-- RLS
ALTER TABLE public.recent_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own recent searches" ON public.recent_searches;
CREATE POLICY "Users can view their own recent searches" ON public.recent_searches
    FOR SELECT USING ((auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own recent searches" ON public.recent_searches;
CREATE POLICY "Users can insert their own recent searches" ON public.recent_searches
    FOR INSERT WITH CHECK ((auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own recent searches" ON public.recent_searches;
CREATE POLICY "Users can delete their own recent searches" ON public.recent_searches
    FOR DELETE USING ((auth.uid()) = user_id);
```

API endpoints (server)

- POST /chat/recent-searches

  - Body: { query_text: string }
  - Auth: Bearer token (use existing auth middleware)
  - Implementation: insert row with user_id from auth

- GET /chat/recent-searches?limit=10

  - Returns last N searches for the user ordered by created_at desc

- DELETE /chat/recent-searches (optional)
  - Deletes all recent searches for user (or implement per-id delete)

Example Hono handler (paste into [`server/src/routes/history.ts`](server/src/routes/history.ts:1)):

```ts
import { Hono } from "hono"
import { supabase } from "../lib/supabase"

const history = new Hono()

async function authMiddleware(c, next) {
  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer "))
    return c.json({ error: "Unauthorized" }, 401)
  const token = authHeader.split(" ")[1]
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error || !user) return c.json({ error: "Invalid token" }, 401)
  c.set("user", user)
  await next()
}

history.post("/chat/recent-searches", authMiddleware, async (c) => {
  const { query_text } = await c.req.json()
  const user = c.get("user")
  const { data, error } = await supabase
    .from("recent_searches")
    .insert([{ user_id: user.id, query_text }])
  if (error) return c.json({ error: "Insert failed" }, 500)
  return c.json({ success: true, id: data[0].id })
})

history.get("/chat/recent-searches", authMiddleware, async (c) => {
  const user = c.get("user")
  const { data, error } = await supabase
    .from("recent_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) return c.json({ error: "Fetch failed" }, 500)
  return c.json({ searches: data })
})

export default history
```

Retention & defaults

- Default retention: 30 days (implement later via scheduled job or cron)
- For now keep table simple; implement cleanup when ready.

Next steps I can take

- (A) Create migration SQL patch and open a PR (needs code-mode)
- (B) Implement the Hono route in [`server/src/routes/history.ts`](server/src/routes/history.ts:1) and wire into server's router (needs code-mode)

If you want me to add the SQL to [`server/src/db/complete_setup.sql`](server/src/db/complete_setup.sql:1) or implement the route now, tell me and I'll switch to code mode and apply the changes.
