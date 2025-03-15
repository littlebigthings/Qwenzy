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

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false),
  confirmPassword: z.string().optional(),
  acceptTerms: z.boolean().optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined) {
    return data.password === data.confirmPassword
  }
  return true
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.acceptTerms !== undefined) {
    return data.acceptTerms === true
  }
  return true
}, {
  message: "You must accept the terms",
  path: ["acceptTerms"],
});

type AuthFormProps = {
  mode: "login" | "register" | "reset"
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>
}

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
      confirmPassword: "",
      acceptTerms: false
    }
  })

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setLoading(true)
    try {
      await onSubmit(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  placeholder="Email" 
                  {...field}
                  className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]" 
                />
              </FormControl>
              <FormMessage className="mt-2 text-sm text-[#dc6571] bg-[#fef2f2] p-2 rounded" />
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
                  placeholder="Enter password" 
                  {...field}
                  className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]" 
                />
              </FormControl>
              <FormMessage className="mt-2 text-sm text-[#dc6571] bg-[#fef2f2] p-2 rounded" />
            </FormItem>
          )}
        />

        {mode === "register" && (
          <>
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Confirm Password" 
                      {...field}
                      className="h-12 px-4 rounded-md border-gray-200 focus:border-[#407c87] focus:ring-[#407c87]" 
                    />
                  </FormControl>
                  <FormMessage className="mt-2 text-sm text-[#dc6571] bg-[#fef2f2] p-2 rounded" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <div className="flex items-center">
                  <Checkbox
                    id="terms"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="border-gray-300 rounded"
                  />
                  <label
                    htmlFor="terms"
                    className="ml-2 text-sm text-gray-600"
                  >
                    I agree to{" "}
                    <a href="/privacy" className="text-[#407c87] hover:text-[#386d77]">
                      privacy policy
                    </a>
                    {" & "}
                    <a href="/terms" className="text-[#407c87] hover:text-[#386d77]">
                      terms
                    </a>
                  </label>
                </div>
              )}
            />
          </>
        )}

        {mode === "login" && (
          <>
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
          </>
        )}

        <Button 
          type="submit" 
          className="w-full h-12 bg-[#407c87] hover:bg-[#386d77] text-white font-medium rounded-md"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign in" : "Sign up"}
        </Button>
      </form>
    </Form>
  )
}