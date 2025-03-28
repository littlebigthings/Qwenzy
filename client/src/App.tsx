import { Switch, Route } from "wouter"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "./lib/queryClient"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/providers/auth-provider"
import NotFound from "@/pages/not-found"
import Login from "@/pages/login"
import Register from "@/pages/register"
import ResetPassword from "@/pages/reset-password"
import VerifyEmail from "@/pages/verify-email"
import ForgotPassword from "@/pages/forgot-password"
import Home from "@/pages/home"
import OrganizationSetup from "@/pages/organization-setup"
import ProfileSetup from "@/pages/profile-setup"
import OrganizationSelection from "@/pages/organization-selection"
import { Protected } from "@/layouts/protected"

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />

      {/* Protected routes */}
      <Route path="/organization-selection">
        <Protected>
          <OrganizationSelection />
        </Protected>
      </Route>

      <Route path="/organization-setup">
        <Protected>
          <OrganizationSetup />
        </Protected>
      </Route>

      <Route path="/profile-setup">
        <Protected>
          <ProfileSetup />
        </Protected>
      </Route>

      <Route path="/">
        <Protected>
          <Home />
        </Protected>
      </Route>

      {/* 404 route */}
      <Route path="*" component={NotFound} />
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
