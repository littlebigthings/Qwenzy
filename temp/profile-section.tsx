{currentStep === "profile" && (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-semibold">Add your profile information</h2>
      <p className="text-gray-500">Adding your name and profile photo helps your teammates to recognise and connect with you more easily.</p>
    </div>
    
    <Form {...profileForm}>
      <form
        onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={profileForm.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={profileForm.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={profileForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={profileForm.control}
          name="jobTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input placeholder="Software Developer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Your profile photo</FormLabel>
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 border border-dashed rounded flex items-center justify-center bg-gray-50">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-full w-full object-cover rounded"
                />
              ) : (
                <Upload className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex items-center justify-center bg-[#407c87] text-white px-4 py-2 rounded cursor-pointer hover:bg-[#386d77] transition-colors"
                >
                  Upload a photo
                  <input
                    id="avatar-upload"
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={(e) =>
                      handleAvatarUpload(e.target.files?.[0] as File)
                    }
                  />
                </label>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAvatarPreview(null);
                      setAvatarFile(null);
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Allowed JPG, GIF or PNG. Max size of 800K
              </p>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#407c87] hover:bg-[#386d77]"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </Form>
  </div>
)}