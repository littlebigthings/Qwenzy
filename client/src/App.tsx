import { Switch, Route } from "wouter"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "./lib/queryClient"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/providers/auth-provider"
import NotFound from "@/pages/not-found"
import Login from "@/pages/login"
import Register from "@/pages/register"
import ResetPassword from "@/pages/reset-password"
import Home from "@/pages/home"
import ProfileSetup from "@/pages/profile-setup"
import { Protected } from "@/layouts/protected"

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Protected routes */}
      <Route path="/">
        <Protected>
          <Home />
        </Protected>
      </Route>

      <Route path="/profile-setup">
        <Protected>
          <ProfileSetup />
        </Protected>
      </Route>

      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App