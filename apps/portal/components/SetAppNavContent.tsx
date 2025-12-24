"use client";

import React, { useEffect } from "react";
import { useAppNav } from "@/contexts/AppNavContext";
import { AppIcon } from "@/components/icon-map";

export default function SetAppNavContent({ config, name } : { config: any; name: string }) {
  const { setContent } = useAppNav();

  useEffect(() => {
    setContent({
      title: name,
      description: config?.description || "",
      icon: <AppIcon icon={config?.icon} className="h-8 w-8" />,
      actions: null,
    });

    return () => setContent(null);
  }, [config, name, setContent]);

  return null;
}
