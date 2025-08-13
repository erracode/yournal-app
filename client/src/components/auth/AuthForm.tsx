import { useState } from "react"
import { useSignIn, useSignUp } from "@/lib/auth-hooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const signUpMutation = useSignUp()
  const signInMutation = useSignIn()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    try {
      if (isSignUp) {
        await signUpMutation.mutateAsync({ email, password, fullName })
        setMessage(
          "Account created successfully! Please check your email to confirm your account."
        )
      } else {
        await signInMutation.mutateAsync({ email, password })
        setMessage("Signed in successfully!")
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "An error occurred")
    }
  }

  const isLoading = signUpMutation.isPending || signInMutation.isPending

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp
              ? "Start your journaling journey"
              : "Sign in to your journal"}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.includes("successfully")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full "
            variant="gradient"
            size={"sm"}
          >
            {isLoading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        {/* Toggle */}
        <div className="text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setMessage(null)
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
