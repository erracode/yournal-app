# Yournal - A Simple Journal App

A minimalistic journal-taking app built with React, Vite, Tailwind CSS, and Supabase.

## Features

- 🔐 User authentication with Supabase Auth
- ✍️ Create, edit, and delete journal entries
- 📱 Responsive design with Tailwind CSS
- 🎨 Clean and minimalistic UI with shadcn/ui components
- 🔄 Real-time updates

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Database, Auth, Row Level Security)
- **Package Manager**: Bun
- **Monorepo**: Turbo

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd yournal-app
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project settings and copy your project URL and service role key
3. Create environment files:

**Server environment variables** (`server/.env`):

```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

**Client environment variables** (`client/.env`):

```env
VITE_API_URL=http://localhost:3000
```

### 4. Set up the database

Run the following SQL in your Supabase SQL editor:

```sql
-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create entries table
CREATE TABLE public.entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(user_id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster joins and queries
CREATE INDEX idx_entries_user_id ON public.entries(user_id);

-- Trigger function to automatically create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy for profiles
CREATE POLICY "Users can manage their own profile" ON public.profiles
    FOR ALL USING ((auth.uid()) = user_id)
    WITH CHECK ((auth.uid()) = user_id);

-- RLS Policy for entries
CREATE POLICY "Users can view their own entries" ON public.entries
    FOR SELECT USING ((auth.uid()) = user_id);

CREATE POLICY "Users can insert their own entries" ON public.entries
    FOR INSERT WITH CHECK ((auth.uid()) = user_id);

CREATE POLICY "Users can update their own entries" ON public.entries
    FOR UPDATE USING ((auth.uid()) = user_id)
    WITH CHECK ((auth.uid()) = user_id);

CREATE POLICY "Users can delete their own entries" ON public.entries
    FOR DELETE USING ((auth.uid()) = user_id);
```

### 5. Run the development server

```bash
# Run both client and server
bun dev

# Run only client
bun dev:client

# Run only server
bun dev:server
```

The app will be available at `http://localhost:5173`

## Environment Variables

### Server Environment Variables

Create a `.env` file in the `server/` directory:

```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Client Environment Variables

Create a `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:3000
```

**Important**:

- The server uses the Supabase service role key for backend operations
- The client only needs the API URL to communicate with the backend
- All client-side environment variables must be prefixed with `VITE_` to be accessible in the browser

## Project Structure

```
yournal-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/      # Authentication components
│   │   │   ├── journal/   # Journal components
│   │   │   └── ui/        # shadcn/ui components
│   │   ├── lib/
│   │   │   └── supabase.ts # Supabase client
│   │   └── App.tsx        # Main app component
│   └── .env               # Client environment variables
├── server/                 # Hono backend (if needed)
├── shared/                 # Shared types and utilities
└── turbo.json             # Turbo monorepo configuration
```

## Available Scripts

- `bun dev` - Start development servers for all packages
- `bun dev:client` - Start only the client development server
- `bun dev:server` - Start only the server development server
- `bun build` - Build all packages
- `bun lint` - Run linting
- `bun type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
