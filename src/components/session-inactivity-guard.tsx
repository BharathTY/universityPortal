"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const INACTIVITY_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"] as const;

export function SessionInactivityGuard() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    function clearTimer() {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    async function logoutForInactivity() {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      clearTimer();
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch {
        /* proceed to login even if logout request fails */
      }
      router.push("/login?reason=inactivity");
      router.refresh();
    }

    function resetTimer() {
      if (loggingOutRef.current) return;
      clearTimer();
      timerRef.current = setTimeout(() => {
        void logoutForInactivity();
      }, INACTIVITY_MS);
    }

    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimer();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}
