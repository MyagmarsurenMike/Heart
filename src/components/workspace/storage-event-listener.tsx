"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StorageEventListener() {
  const router = useRouter();
  useEffect(() => {
    const source = new EventSource("/api/events");
    const onChange = () => router.refresh();
    source.addEventListener("change", onChange);
    return () => {
      source.removeEventListener("change", onChange);
      source.close();
    };
  }, [router]);
  return null;
}
