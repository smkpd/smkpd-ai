import { createId, Role } from "./client";

export type SchoolUser = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  className?: string;
  isActive: boolean;
  createdAt: string;
};

const USER_KEY = "smkpd_users";

export const seedUsers: SchoolUser[] = [
  {
    id: "seed-admin",
    name: "Administrator SMKPD",
    username: "admin",
    password: "smkpd2026",
    role: "Admin",
    isActive: true,
    createdAt: "2026-07-19T00:00:00.000Z",
  },
  {
    id: "seed-kepala",
    name: "Kepala SMK Pelayaran Demak",
    username: "kepala",
    password: "kepala2026",
    role: "Kepala Sekolah",
    isActive: true,
    createdAt: "2026-07-19T00:00:00.000Z",
  },
  {
    id: "seed-guru",
    name: "Guru SMKPD",
    username: "guru",
    password: "guru2026",
    role: "Guru",
    isActive: true,
    createdAt: "2026-07-19T00:00:00.000Z",
  },
  {
    id: "seed-taruna",
    name: "Taruna SMKPD",
    username: "taruna",
    password: "taruna2026",
    role: "Taruna",
    className: "X Nautika",
    isActive: true,
    createdAt: "2026-07-19T00:00:00.000Z",
  },
  {
    id: "seed-wali",
    name: "Wali Taruna",
    username: "wali",
    password: "wali2026",
    role: "Wali Taruna",
    isActive: true,
    createdAt: "2026-07-19T00:00:00.000Z",
  },
];

export function loadUsers(): SchoolUser[] {
  if (typeof window === "undefined") return seedUsers;

  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      localStorage.setItem(USER_KEY, JSON.stringify(seedUsers));
      return seedUsers;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(USER_KEY, JSON.stringify(seedUsers));
      return seedUsers;
    }

    const existingUsernames = new Set(parsed.map((item) => item.username));
    const missingSeeds = seedUsers.filter(
      (seed) => !existingUsernames.has(seed.username)
    );
    const merged = [...parsed, ...missingSeeds];
    if (missingSeeds.length) {
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    localStorage.setItem(USER_KEY, JSON.stringify(seedUsers));
    return seedUsers;
  }
}

export function saveUsers(users: SchoolUser[]) {
  localStorage.setItem(USER_KEY, JSON.stringify(users));
}

export function authenticate(username: string, password: string) {
  return loadUsers().find(
    (user) =>
      user.isActive &&
      user.username.toLowerCase() === username.trim().toLowerCase() &&
      user.password === password
  );
}

export function createSchoolUser(
  value: Omit<SchoolUser, "id" | "createdAt">
): SchoolUser {
  return {
    ...value,
    id: createId(),
    createdAt: new Date().toISOString(),
  };
}
