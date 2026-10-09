/**
 * Auth ClarivPack: Supabase Auth + profiles/businesses (RLS).
 * Fallback local solo si no hay VITE_SUPABASE_* (dev sin cloud).
 */
import { supabase, supabaseConfigured, type DbBusiness, type DbProfile } from "@/lib/supabase";

export type UserRole = "owner" | "operario";

export type LiteUser = {
  id: string;
  businessId: string;
  email: string;
  name: string;
  role: UserRole;
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
const PENDING_BOOTSTRAP_KEY = "clariveye-lite.pending-bootstrap.v1";
const LEGACY_BIZ = "clariveye-lite.business.v1";
const LEGACY_USERS = "clariveye-lite.users.v1";

type PendingBootstrap = {
  email: string;
  businessName: string;
  ownerName: string;
};

function savePendingBootstrap(pending: PendingBootstrap) {
  localStorage.setItem(PENDING_BOOTSTRAP_KEY, JSON.stringify(pending));
}

function loadPendingBootstrap(email: string): PendingBootstrap | null {
  try {
    const raw = localStorage.getItem(PENDING_BOOTSTRAP_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingBootstrap;
    if (pending.email !== email.trim().toLowerCase()) return null;
    return pending;
  } catch {
    return null;
  }
}

function clearPendingBootstrap() {
  localStorage.removeItem(PENDING_BOOTSTRAP_KEY);
}

type TenantDb = {
  businesses: Business[];
  users: LiteUser[];
};

let cloudCache: {
  user: LiteUser | null;
  business: Business | null;
  users: LiteUser[];
} = { user: null, business: null, users: [] };

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

function saveSession(session: Session | null) {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSessionLocal(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function profileToUser(p: DbProfile): LiteUser {
  return {
    id: p.id,
    businessId: p.business_id,
    email: p.email,
    name: p.name,
    role: p.role,
  };
}

function bizToBusiness(b: DbBusiness): Business {
  return { id: b.id, name: b.name, createdAt: b.created_at };
}

export async function hydrateCloudSession(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session?.user) {
    cloudCache = { user: null, business: null, users: [] };
    saveSession(null);
    return false;
  }
  const uid = sess.session.user.id;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();
  if (error || !profile) {
    cloudCache = { user: null, business: null, users: [] };
    return false;
  }
  const p = profile as DbProfile;
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", p.business_id)
    .maybeSingle();
  const { data: team } = await supabase
    .from("profiles")
    .select("*")
    .eq("business_id", p.business_id);

  cloudCache = {
    user: profileToUser(p),
    business: business ? bizToBusiness(business as DbBusiness) : null,
    users: ((team as DbProfile[]) ?? []).map(profileToUser),
  };
  saveSession({ userId: p.id, businessId: p.business_id });
  return true;
}

export function loadBusiness(): Business | null {
  if (supabaseConfigured) return cloudCache.business;
  const session = loadSessionLocal();
  if (!session) return null;
  return loadDb().businesses.find((b) => b.id === session.businessId) ?? null;
}

export function loadUsers(): LiteUser[] {
  if (supabaseConfigured) return cloudCache.users;
  const session = loadSessionLocal();
  if (!session) return [];
  return loadDb().users.filter((u) => u.businessId === session.businessId);
}

export function currentUser(): LiteUser | null {
  if (supabaseConfigured) return cloudCache.user;
  const session = loadSessionLocal();
  if (!session) return null;
  return loadDb().users.find((u) => u.id === session.userId) ?? null;
}

export function currentBusinessId(): string | null {
  if (supabaseConfigured) return cloudCache.user?.businessId ?? null;
  return loadSessionLocal()?.businessId ?? null;
}

export function emailTaken(email: string): boolean {
  if (supabaseConfigured) return false;
  const e = email.trim().toLowerCase();
  return loadDb().users.some((u) => u.email === e);
}

function mapAuthError(message: string, code?: string): string {
  const m = message.toLowerCase();
  if (code === "invalid_credentials" || m.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos";
  }
  if (m.includes("email not confirmed")) {
    return "Confirma tu email antes de entrar (revisa la bandeja de entrada).";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Ese email ya tiene cuenta. Usa Entrar.";
  }
  if (m.includes("password") && (m.includes("least") || m.includes("weak") || m.includes("short"))) {
    return "La contraseña no cumple los requisitos de seguridad.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  }
  return message || "Error de autenticación";
}

function findLocalUser(email: string, password: string): LiteUser | null {
  const db = loadDb();
  const user = db.users.find(
    (u) => u.email === email.trim().toLowerCase() && (u.pin ?? "") === password,
  );
  if (!user) return null;
  if (!db.businesses.some((b) => b.id === user.businessId)) return null;
  return user;
}

async function ensureSessionAfterSignUp(
  email: string,
  password: string,
  session: { access_token: string } | null,
): Promise<void> {
  if (session) return;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      "Cuenta creada, pero falta confirmar el email antes de entrar. Revisa tu bandeja o desactiva «Confirm email» en Supabase Auth.",
    );
  }
}

async function runBootstrap(businessName: string, ownerName: string): Promise<void> {
  const { error: bootErr } = await supabase.rpc("bootstrap_business", {
    p_business_name: businessName,
    p_owner_name: ownerName,
  });
  if (bootErr) throw new Error(bootErr.message);
}

export async function bootstrapBusiness(input: {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
}): Promise<{ business: Business; user: LiteUser }> {
  const email = input.email.trim().toLowerCase();
  if (supabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { name: input.ownerName.trim() } },
    });
    if (error) throw new Error(mapAuthError(error.message, error.code));
    if (!data.user) throw new Error("No se pudo crear la cuenta");

    const businessName = input.businessName.trim();
    const ownerName = input.ownerName.trim();
    savePendingBootstrap({ email, businessName, ownerName });

    try {
      await ensureSessionAfterSignUp(email, input.password, data.session);
      await runBootstrap(businessName, ownerName);
    } catch (err) {
      // Keep pending so a later login can finish bootstrap after email confirm.
      throw err;
    }

    clearPendingBootstrap();
    await hydrateCloudSession();
    const user = currentUser();
    const business = loadBusiness();
    if (!user || !business) throw new Error("Sesión incompleta tras registro");
    return { business, user };
  }

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

export async function login(email: string, password: string): Promise<LiteUser | null> {
  const normalized = email.trim().toLowerCase();
  if (supabaseConfigured) {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    if (error) {
      const local = findLocalUser(normalized, password);
      if (local) {
        throw new Error(
          "Esa cuenta solo existe en este dispositivo (versión anterior). Usa «Crear cuenta» para darte de alta en la nube con el mismo email.",
        );
      }
      throw new Error(mapAuthError(error.message, error.code));
    }
    let ok = await hydrateCloudSession();
    if (!ok) {
      // Auth ok but profile missing (signup interrupted / confirm race): try pending bootstrap.
      const pending = loadPendingBootstrap(normalized);
      if (pending) {
        await runBootstrap(pending.businessName, pending.ownerName);
        clearPendingBootstrap();
        ok = await hydrateCloudSession();
      }
    }
    if (!ok) {
      throw new Error(
        "Tu cuenta existe pero no tiene negocio asociado. Usa «Crear cuenta» para completar el alta o pide el código al dueño.",
      );
    }
    return currentUser();
  }

  const user = findLocalUser(normalized, password);
  if (!user) return null;
  saveSession({ userId: user.id, businessId: user.businessId });
  return user;
}

export async function logout() {
  if (supabaseConfigured) {
    await supabase.auth.signOut();
    cloudCache = { user: null, business: null, users: [] };
  }
  saveSession(null);
}

export async function addOperario(input: {
  name: string;
  email: string;
  pin: string;
}): Promise<LiteUser | null> {
  const me = currentUser();
  if (!me || me.role !== "owner") return null;

  if (supabaseConfigured) {
    // Operario se registra después con el código del negocio; aquí solo validamos localmente no aplica.
    // Flujo: owner comparte businessId; operario usa registerJoin.
    void input;
    return null;
  }

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

/** Operario: crear cuenta y unirse con código = business UUID. */
export async function registerJoin(input: {
  businessId: string;
  name: string;
  email: string;
  password: string;
}): Promise<LiteUser> {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const email = input.email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { name: input.name.trim() } },
  });
  if (error) throw new Error(mapAuthError(error.message, error.code));
  await ensureSessionAfterSignUp(email, input.password, data.session);
  const { error: joinErr } = await supabase.rpc("join_business", {
    p_business_id: input.businessId.trim(),
    p_owner_name: input.name.trim(),
  });
  if (joinErr) throw new Error(joinErr.message);
  await hydrateCloudSession();
  const user = currentUser();
  if (!user) throw new Error("No se pudo unir al negocio");
  return user;
}

export async function removeOperario(userId: string): Promise<boolean> {
  const me = currentUser();
  if (!me || me.role !== "owner") return false;

  if (supabaseConfigured) {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId)
      .eq("role", "operario")
      .eq("business_id", me.businessId);
    if (error) return false;
    await hydrateCloudSession();
    return true;
  }

  const db = loadDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target || target.businessId !== me.businessId || target.role !== "operario") return false;
  db.users = db.users.filter((u) => u.id !== userId);
  saveDb(db);
  return true;
}

export function hasAnyAccount(): boolean {
  // Con cloud: solo mostrar "Entrar" por defecto si ya hubo sesión o cuentas locales previas.
  if (supabaseConfigured) {
    return Boolean(loadSessionLocal()) || loadDb().users.length > 0;
  }
  return loadDb().users.length > 0;
}

export async function renameBusiness(name: string): Promise<Business | null> {
  const me = currentUser();
  if (!me || me.role !== "owner") return null;
  const trimmed = name.trim();
  if (trimmed.length < 2) return null;

  if (supabaseConfigured) {
    const { error } = await supabase
      .from("businesses")
      .update({ name: trimmed })
      .eq("id", me.businessId);
    if (error) return null;
    await hydrateCloudSession();
    return loadBusiness();
  }

  const db = loadDb();
  const biz = db.businesses.find((b) => b.id === me.businessId);
  if (!biz) return null;
  biz.name = trimmed;
  saveDb(db);
  return biz;
}

export async function updateProfileName(name: string): Promise<LiteUser | null> {
  const me = currentUser();
  if (!me) return null;
  const trimmed = name.trim();
  if (trimmed.length < 2) return null;

  if (supabaseConfigured) {
    const { error } = await supabase.from("profiles").update({ name: trimmed }).eq("id", me.id);
    if (error) return null;
    await hydrateCloudSession();
    return currentUser();
  }

  const db = loadDb();
  const user = db.users.find((u) => u.id === me.id);
  if (!user) return null;
  user.name = trimmed;
  saveDb(db);
  return user;
}

export async function changePassword(
  current: string,
  next: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = currentUser();
  if (!me) return { ok: false, error: "Sin sesión" };
  if (next.length < 4) return { ok: false, error: "La nueva debe tener al menos 4 caracteres" };

  if (supabaseConfigured) {
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: me.email,
      password: current,
    });
    if (signErr) return { ok: false, error: "Contraseña actual incorrecta" };
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if ((me.pin ?? "") !== current) return { ok: false, error: "Contraseña actual incorrecta" };
  const db = loadDb();
  const user = db.users.find((u) => u.id === me.id);
  if (!user) return { ok: false, error: "Usuario no encontrado" };
  user.pin = next;
  saveDb(db);
  return { ok: true };
}
