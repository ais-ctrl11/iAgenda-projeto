import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { StoreProvider } from "@/lib/store";
import { AddFlowProvider } from "@/components/app/add-flow";
import { AppShell } from "@/components/app/shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw redirect({ to: "/auth" });
  },
  component: () => (
    <StoreProvider>
      <AddFlowProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </AddFlowProvider>
    </StoreProvider>
  ),
});
