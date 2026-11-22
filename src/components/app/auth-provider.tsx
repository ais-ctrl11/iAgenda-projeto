import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setState({ user: session?.user ?? null, loading: false });
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) void router.invalidate();
    });
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setState({ user: data.user, loading: false });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [router]);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
