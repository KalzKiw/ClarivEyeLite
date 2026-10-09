import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  addOperario,
  bootstrapBusiness,
  changePassword as doChangePassword,
  currentUser,
  hydrateCloudSession,
  loadBusiness,
  loadUsers,
  login as doLogin,
  logout as doLogout,
  registerJoin,
  removeOperario,
  renameBusiness as doRenameBusiness,
  updateProfileName,
  type Business,
  type LiteUser,
} from "@/lib/auth";
import { hydrateCloudStore, invalidateStore } from "@/lib/store";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type AuthCtx = {
  user: LiteUser | null;
  business: Business | null;
  users: LiteUser[];
  ready: boolean;
  refresh: () => void;
  login: (email: string, password: string) => Promise<LiteUser | null>;
  register: (input: {
    businessName: string;
    ownerName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  joinTeam: (input: {
    businessId: string;
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  inviteOperario: (input: { name: string; email: string; pin: string }) => Promise<LiteUser | null>;
  kickOperario: (userId: string) => Promise<boolean>;
  renameBusiness: (name: string) => Promise<Business | null>;
  updateName: (name: string) => Promise<LiteUser | null>;
  changePassword: (
    current: string,
    next: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const Ctx = createContext<AuthCtx | null>(null);

let version = 0;
const listeners = new Set<() => void>();

function bump() {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getVersion() {
  return version;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setTick] = useState(0);
  const [ready, setReady] = useState(!supabaseConfigured);
  useSyncExternalStore(subscribe, getVersion, getVersion);

  const refresh = () => {
    invalidateStore();
    bump();
    setTick((t) => t + 1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabaseConfigured) {
        setReady(true);
        return;
      }
      await hydrateCloudSession();
      if (currentUser()) {
        try {
          await hydrateCloudStore();
        } catch (e) {
          console.error(e);
        }
      }
      if (!cancelled) {
        bump();
        setReady(true);
        setTick((t) => t + 1);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        invalidateStore();
        bump();
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await hydrateCloudSession();
        try {
          await hydrateCloudStore();
        } catch (e) {
          console.error(e);
        }
        bump();
        setTick((t) => t + 1);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user: currentUser(),
      business: loadBusiness(),
      users: loadUsers(),
      ready,
      refresh,
      login: async (email, password) => {
        const u = await doLogin(email, password);
        if (u) {
          try {
            await hydrateCloudStore();
          } catch (e) {
            console.error(e);
          }
        }
        refresh();
        return u;
      },
      register: async (input) => {
        await bootstrapBusiness(input);
        try {
          await hydrateCloudStore();
        } catch (e) {
          console.error(e);
        }
        refresh();
      },
      joinTeam: async (input) => {
        await registerJoin(input);
        try {
          await hydrateCloudStore();
        } catch (e) {
          console.error(e);
        }
        refresh();
      },
      logout: async () => {
        await doLogout();
        refresh();
      },
      inviteOperario: async (input) => {
        const u = await addOperario(input);
        refresh();
        return u;
      },
      kickOperario: async (userId) => {
        const ok = await removeOperario(userId);
        refresh();
        return ok;
      },
      renameBusiness: async (name) => {
        const b = await doRenameBusiness(name);
        refresh();
        return b;
      },
      updateName: async (name) => {
        const u = await updateProfileName(name);
        refresh();
        return u;
      },
      changePassword: async (current, next) => {
        const r = await doChangePassword(current, next);
        if (r.ok) refresh();
        return r;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
