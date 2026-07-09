"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";

export default function UserLoader() {
  const { fetchUser } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // Check if the persist middleware has rehydrated
  useEffect(() => {
    // Zustand persist provides a `hasHydrated()` method
    if (useAuthStore.persist?.hasHydrated()) {
      setHydrated(true);
      return;
    }

    // Subscribe to the finish of rehydration
    const unsub = useAuthStore.persist?.onFinishHydration(() => {
      setHydrated(true);
    });
    return () => unsub?.();
  }, []);

  // Once hydrated, fetch user if token exists but user is missing
  useEffect(() => {
    if (!hydrated) return;

    const { token, user, fetchUser } = useAuthStore.getState();
    if (token && !user) {
      fetchUser();
    }
  }, [hydrated, fetchUser]);

  return null;
}