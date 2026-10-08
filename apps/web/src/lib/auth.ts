export type UserRole = "owner" | "operario";

export type LiteUser = {
  id: string;
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

const BIZ_KEY = "clariveye-lite.business.v1";
const USERS_KEY = "clariveye-lite.users.v1";
const SESSION_KEY = "clariveye-lite.session.v1";

function id() {
  return crypto.randomUUID();
}

export function loadBusiness(): Business | null {
  try {
    const raw = localStorage.getItem(BIZ_KEY);
    return raw ? (JSON.parse(raw) as Business) : null;
  } catch {
    return null;
  }
}

export function saveBusiness(biz: Business) {
  localStorage.setItem(BIZ_KEY, JSON.stringify(biz));
}

export function loadUsers(): LiteUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as LiteUser[];
  } catch {
    return [];
  }
}

export function saveUsers(users: LiteUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function bootstrapBusiness(input: {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
}): { business: Business; user: LiteUser } {
  const business: Business = {
    id: id(),
    name: input.businessName.trim(),
    createdAt: new Date().toISOString(),
  };
  const user: LiteUser = {
    id: id(),
    email: input.email.trim().toLowerCase(),
    name: input.ownerName.trim(),
    role: "owner",
    pin: input.password,
  };
  saveBusiness(business);
  saveUsers([user]);
  saveSession({ userId: user.id, businessId: business.id });
  return { business, user };
}

export function login(email: string, password: string): LiteUser | null {
  const users = loadUsers();
  const user = users.find(
    (u) => u.email === email.trim().toLowerCase() && (u.pin ?? "") === password,
  );
  const biz = loadBusiness();
  if (!user || !biz) return null;
  saveSession({ userId: user.id, businessId: biz.id });
  return user;
}

export function logout() {
  saveSession(null);
}

export function currentUser(): LiteUser | null {
  const session = loadSession();
  if (!session) return null;
  return loadUsers().find((u) => u.id === session.userId) ?? null;
}

export function addOperario(input: { name: string; email: string; pin: string }): LiteUser | null {
  const me = currentUser();
  if (!me || me.role !== "owner") return null;
  const users = loadUsers();
  const email = input.email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) return null;
  const user: LiteUser = {
    id: id(),
    email,
    name: input.name.trim(),
    role: "operario",
    pin: input.pin,
  };
  saveUsers([...users, user]);
  return user;
}

export function removeOperario(userId: string): boolean {
  const me = currentUser();
  if (!me || me.role !== "owner") return false;
  const users = loadUsers().filter((u) => !(u.id === userId && u.role === "operario"));
  saveUsers(users);
  return true;
}
