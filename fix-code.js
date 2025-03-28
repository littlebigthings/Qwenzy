if (isInvitation) {
          // For invited users, go directly to home page after profile setup
          await saveProgress("completed", newCompleted);
          
          // Ensure hasOrganization is set to true for invited users
          setHasOrganization(true);
          
          toast({
            title: "Success",
            description: "Profile setup complete! Taking you to the dashboard.",
          });
          
          console.log("Redirecting invited user to home page");
          // Navigate directly to home page - use timeout to ensure state updates first
          console.log("hasOrganization set to:", true);
          setTimeout(() => {
            setLocation("/");
          }, 100);
          return; // Early return to prevent further processing
