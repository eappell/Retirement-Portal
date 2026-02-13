"use client";

import {useAuth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {useEffect, useState} from "react";

export default function Home() {
  const {user, loading} = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="animate-pulse">
          <div className="h-12 w-12 rounded-full bg-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (user) {
    redirect("/dashboard");
  }

  // Redirect to landing page for non-authenticated users
  redirect("/index.html");
}
