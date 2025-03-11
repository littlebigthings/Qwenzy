import { Switch, Route } from "wouter"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "./lib/queryClient"
import { Toaster } from "@/components/ui/toaster"
import NotFound from "@/pages/not-found"
import Login from "@/pages/login"
import Register from "@/pages/register"
import ResetPassword from "@/pages/reset-password"
import Home from "@/pages/home"
import { Protected } from "@/layouts/protected"

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/">
        <Protected>
          <Home />
        </Protected>
      </Route>
      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
