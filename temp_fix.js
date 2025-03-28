const handleCreateOrganization = () => {
    console.log("Navigating to organization setup");
    console.log("Current location before navigation:", window.location.pathname);
    navigate("/organization-setup");
    // Force a reload if navigation isn't working
    setTimeout(() => {
      console.log("Current location after navigation attempt:", window.location.pathname);
      if (window.location.pathname !== "/organization-setup") {
        console.log("Navigation failed, forcing redirect");
        window.location.href = "/organization-setup";
      }
    }, 100);
  };
