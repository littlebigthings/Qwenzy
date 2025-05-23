import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from "wouter"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false),
})

type AuthFormProps = {
  mode: "login" | "register" | "reset"
  onSubmit: (data: { email: string; password: string }) => Promise<void>
  error?: string
}

export function AuthForm({ mode, onSubmit, error }: AuthFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    }
  })

  const onFormSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('[AuthForm] Form submission triggered with:', {
      email: values.email,
      hasPassword: !!values.password,
      timestamp: new Date().toISOString()
    })

    try {
      setLoading(true)
      await onSubmit({
        email: values.email,
        password: values.password,
      })
    } catch (error: any) {
      console.error('[AuthForm] Form submission error:', error)
      // Let the parent component handle the error display
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onFormSubmit)}
        className="space-y-6"
      >
        {error && (
          <div className="p-4 rounded-md bg-red-50 text-red-500 text-sm">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Email"
                  type="email"
                  autoComplete="email"
                  {...field}
                  className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]"
                />
              </FormControl>
              <FormMessage className="text-sm text-red-500" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  {...field}
                  className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]"
                />
              </FormControl>
              <FormMessage className="text-sm text-red-500" />
              {mode === "login" && (
                <div className="flex justify-end mt-1">
                  <Link 
                    href="/forgot-password"
                    className="text-sm text-[#407c87] hover:text-[#386d77]"
                  >
                    Forgot Password?
                  </Link>
                </div>
              )}
            </FormItem>
          )}
        />

        {mode === "login" && (
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <div className="flex items-center">
                <Checkbox
                  id="remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="border-gray-300 rounded"
                />
                <label
                  htmlFor="remember"
                  className="ml-2 text-sm text-gray-600"
                >
                  Remember Me
                </label>
              </div>
            )}
          />
        )}

        <Button
          type="submit"
          className="w-full h-12 bg-[#407c87] hover:bg-[#386d77] text-white font-medium rounded-md"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign in" : mode === "register" ? "Sign up" : "Reset password"}
        </Button>
      </form>
    </Form>
  )
}