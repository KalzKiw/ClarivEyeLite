import {
  createContext,
  useContext,
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
  loadBusiness,
  loadUsers,
  login as doLogin,
  logout as doLogout,
  removeOperario,
  renameBusiness as doRenameBusiness,
  type Business,
  type LiteUser,
} from "@/lib/auth";

type AuthCtx = {
  user: LiteUser | null;
  business: Business | null;
  users: LiteUser[];
  refresh: () => void;
  login: (email: string, password: string) => LiteUser | null;
  register: (input: {
    businessName: string;
    ownerName: string;
    email: string;
    password: string;
  }) => void;
  logout: () => void;
  inviteOperario: (input: { name: string; email: string; pin: string }) => LiteUser | null;
  kickOperario: (userId: string) => boolean;
  renameBusiness: (name: string) => Business | null;
  changePassword: (
    current: string,
    next: string,
  ) => { ok: true } | { ok: false; error: string };
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
  useSyncExternalStore(subscribe, getVersion, getVersion);

  const refresh = () => {
    bump();
    setTick((t) => t + 1);
  };

  const value = useMemo<AuthCtx>(
    () => ({
      user: currentUser(),
      business: loadBusiness(),
      users: loadUsers(),
      refresh,
      login: (email, password) => {
        const u = doLogin(email, password);
        refresh();
        return u;
      },
      register: (input) => {
        bootstrapBusiness(input);
        refresh();
      },
      logout: () => {
        doLogout();
        refresh();
      },
      inviteOperario: (input) => {
        const u = addOperario(input);
        refresh();
        return u;
      },
      kickOperario: (userId) => {
        const ok = removeOperario(userId);
        refresh();
        return ok;
      },
      renameBusiness: (name) => {
        const b = doRenameBusiness(name);
        refresh();
        return b;
      },
      changePassword: (current, next) => {
        const r = doChangePassword(current, next);
        if (r.ok) refresh();
        return r;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
