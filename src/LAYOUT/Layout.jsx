
import { Separator } from "@/components/ui/separator";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Navigate, Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import Navbar from "./Navbar";
import Assistant from "./Assistant";
import { useAuth } from "@/PROVIDERS/AuthProvider";
import { useEffect, useState } from "react";


export default function MainLayout() {
  const { currentUser, loading } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  
  console.log("loading", loading);  

  useEffect(() => {
    if (!loading && !currentUser) {
      const timeout = setTimeout(() => {
        setShouldRedirect(true);
      }, 2000); 

      return () => clearTimeout(timeout);
    } else {
      setShouldRedirect(false);
    }
  }, [loading, currentUser]);

  if (loading) {
    return (
      <div
        className="h-screen w-screen bg-cover"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1518091043644-c1d4457512c6?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZmlmYSUyMHdvcmxkJTIwY3VwfGVufDB8fDB8fHww')",
        }}
      ></div>
    );
  }


 if (shouldRedirect) {
   console.log("Redirecting to signin");
   return <Navigate to="/signin" replace />;
 }

  return (
    <SidebarProvider>
      <Sidebar />
      <main className="w-full relative">
        <Navbar />
        <Separator />

        <div className="">
          <Outlet />
        </div>

        {/* Floating AI Assistant Button */}
        <Assistant />
      </main>
    </SidebarProvider>
  );
}
