import { Hono } from 'hono'
import { supabase } from '../lib/supabase'

const auth = new Hono()

// Sign up
auth.post('/signup', async (c) => {
    try {
        const { email, password, full_name } = await c.req.json()

        if (!email || !password) {
            return c.json({ error: 'Email and password are required' }, 400)
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                },
            },
        })

        if (error) {
            return c.json({ error: error.message }, 400)
        }

        return c.json({
            message: 'User created successfully',
            user: data.user
        })
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Sign in
auth.post('/signin', async (c) => {
    try {
        const { email, password } = await c.req.json()

        if (!email || !password) {
            return c.json({ error: 'Email and password are required' }, 400)
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return c.json({ error: error.message }, 400)
        }

        return c.json({
            message: 'Signed in successfully',
            user: data.user,
            session: data.session
        })
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Sign out
auth.post('/signout', async (c) => {
    try {
        const { error } = await supabase.auth.signOut()

        if (error) {
            return c.json({ error: error.message }, 400)
        }

        return c.json({ message: 'Signed out successfully' })
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Get current session
auth.get('/session', async (c) => {
    try {
        const authHeader = c.req.header('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'No token provided' }, 401)
        }

        const token = authHeader.split(' ')[1]

        const { data: { user }, error } = await supabase.auth.getUser(token)

        if (error || !user) {
            return c.json({ error: 'Invalid token' }, 401)
        }

        return c.json({ user })
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default auth 