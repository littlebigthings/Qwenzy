// Initialize form with organization data if it exists
const orgForm = useForm<z.infer<typeof organizationSchema>>({
  resolver: zodResolver(organizationSchema),
  defaultValues: {
    name: organization?.name || "",
    domain: organization?.domain || "",
  },
});