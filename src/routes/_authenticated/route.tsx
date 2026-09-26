import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // 1. Fast check from in-memory / local storage
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;

    // 2. In iframe preview environments (e.g. Lovable postMessage broker),
    // the initial token retrieval over postMessage is asynchronous.
    // Give a brief grace period if session is not yet populated on initial page load.
    if (!session && typeof window !== "undefined") {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const retry = await supabase.auth.getSession();
      session = retry.data.session;
    }

    if (!session?.user) {
      throw redirect({ to: "/auth" });
    }

    return { user: session.user };
  },
  component: () => <Outlet />,
});
