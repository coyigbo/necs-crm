import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

type OrgContextValue = {
  organizationId: string | null;
  role: "admin" | "member" | "viewer" | null;
  loading: boolean;
};

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "member" | "viewer" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchOrg() {
      if (!user?.id) {
        setOrganizationId(null);
        setRole(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("user_organizations")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        setOrganizationId(null);
        setRole(null);
      } else {
        setOrganizationId((data as any)?.organization_id ?? null);
        setRole(((data as any)?.role as any) ?? null);
      }
      setLoading(false);
    }
    fetchOrg();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const value = useMemo<OrgContextValue>(
    () => ({ organizationId, role, loading }),
    [organizationId, role, loading]
  );
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
