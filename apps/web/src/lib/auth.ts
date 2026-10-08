/**
 * Multi-tenant local (MVP): varios negocios en el mismo navegador.
 * Cada usuario pertenece a un businessId; pedidos van scoped por negocio.
 */

export type UserRole = "owner" | "operario";

export type LiteUser = {
  id: string;
  businessId: string;
  email: string;
  name: string;
  role: UserRole;
  /** Contraseña/PIN en claro solo en MVP local — sustituir por hash/Supabase */
  pin?: string;
};

export type Business = {
  id: string;
  name: string;
  createdAt: string;
};

export type Session = {
  userId: string;
  businessId: string;
};

const TENANTS_KEY = "clariveye-lite.tenants.v2";
const SESSION_KEY = "clariveye-lite.session.v1";
/** Legacy single-tenant keys */
const LEGACY_BIZ = "clariveye-lite.business.v1";
const LEGACY_USERS = "clariveye-lite.users.v1";

type TenantDb = {
  businesses: Business[];
  users: LiteUser[];
};

function id() {
  return crypto.randomUUID();
}

function emptyDb(): TenantDb {
  return { businesses: [], users: [] };
}

function migrateLegacy(): TenantDb | null {
  try {
    const bizRaw = localStorage.getItem(LEGACY_BIZ);
    const usersRaw = localStorage.getItem(LEGACY_USERS);
    if (!bizRaw) return null;
    const biz = JSON.parse(bizRaw) as Business;
    const users = (JSON.parse(usersRaw ?? "[]") as Array<LiteUser & { businessId?: string }>).map(
      (u) => ({ ...u, businessId: u.businessId || biz.id }),
    );
    const db: TenantDb = { businesses: [biz], users };
    localStorage.setItem(TENANTS_KEY, JSON.stringify(db));
    return db;
  } catch {
    return null;
  }
}

function loadDb(): TenantDb {
  try {
    const raw = localStorage.getItem(TENANTS_KEY);
    if (raw) return JSON.parse(raw) as TenantDb;
  } catch {
    /* fall through */
  }
  const migrated = migrateLegacy();
  return migrated ?? emptyDb();
}

function saveDb(db: TenantDb) {
  localStorage.setItem(TENANTS_KEY, JSON.stringify(db));
}

export function listBusinesses(): Business[] {
  return loadDb().businesses;
}

export function loadBusiness(): Business | null {
  const session = loadSession();
  if (!session) return null;
  return loadDb().businesses.find((b) => b.id === session.businessId) ?? null;
}

export function loadUsers(): LiteUser[] {
  const session = loadSession();
  if (!session) return [];
  return loadDb().users.filter((u) => u.businessId === session.businessId);
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    const db = loadDb();
    const user = db.users.find((u) => u.id === session.userId);
    if (!user || user.businessId !== session.businessId) {
      saveSession(null);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function emailTaken(email: string): boolean {
  const e = email.trim().toLowerCase();
  return loadDb().users.some((u) => u.email === e);
}

export function bootstrapBusiness(input: {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
}): { business: Business; user: LiteUser } {
  const email = input.email.trim().toLowerCase();
  if (emailTaken(email)) {
    throw new Error("Ese email ya tiene cuenta. Usa Entrar.");
  }
  const db = loadDb();
  const business: Business = {
    id: id(),
    name: input.businessName.trim(),
    createdAt: new Date().toISOString(),
  };
  const user: LiteUser = {
    id: id(),
    businessId: business.id,
    email,
    name: input.ownerName.trim(),
    role: "owner",
    pin: input.password,
  };
  db.businesses.push(business);
  db.users.push(user);
  saveDb(db);
  saveSession({ userId: user.id, businessId: business.id });
  return { business, user };
}

export function login(email: string, password: string): LiteUser | null {
  const db = loadDb();
  const user = db.users.find(
    (u) => u.email === email.trim().toLowerCase() && (u.pin ?? "") === password,
  );
  if (!user) return null;
  if (!db.businesses.some((b) => b.id === user.businessId)) return null;
  saveSession({ userId: user.id, businessId: user.businessId });
  return user;
}

export function logout() {
  saveSession(null);
}

export function currentUser(): LiteUser | null {
  const session = loadSession();
  if (!session) return null;
  return loadDb().users.find((u) => u.id === session.userId) ?? null;
}

export function currentBusinessId(): string | null {
  return loadSession()?.businessId ?? null;
}

export function addOperario(input: { name: string; email: string; pin: string }): LiteUser | null {
  const me = currentUser();
  if (!me || me.role !== "owner") return null;
  const email = input.email.trim().toLowerCase();
  if (emailTaken(email)) return null;
  const db = loadDb();
  const user: LiteUser = {
    id: id(),
    businessId: me.businessId,
    email,
    name: input.name.trim(),
    role: "operario",
    pin: input.pin,
  };
  db.users.push(user);
  saveDb(db);
  return user;
}

export function removeOperario(userId: string): boolean {
  const me = currentUser();
  if (!me || me.role !== "owner") return false;
  const db = loadDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target || target.businessId !== me.businessId || target.role !== "operario") return false;
  db.users = db.users.filter((u) => u.id !== userId);
  saveDb(db);
  return true;
}

export function hasAnyAccount(): boolean {
  return loadDb().users.length > 0;
}
