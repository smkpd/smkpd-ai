import { createId, Role } from "./client";
import {
  dbGetAll,
  dbReplaceModule,
  dbUpsertMany,
  migrateLegacyData,
} from "./database";

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
    id: "seed-waka",
    name: "Waka Kurikulum SMKPD",
    username: "waka",
    password: "waka2026",
    role: "Waka Kurikulum",
    isActive: true,
    createdAt: "2026-07-20T00:00:00.000Z",
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

function toDbUser(user: SchoolUser) {
  return {
    id: user.id,
    nama: user.name,
    username: user.username,
    password: user.password,
    role: user.role,
    kelas_identitas: user.className || "",
    status: user.isActive ? "Aktif" : "Nonaktif",
    dibuat_pada: user.createdAt,
  };
}

function fromDbUser(value: any): SchoolUser {
  return {
    id: String(value.id || createId()),
    name: String(value.nama || value.name || ""),
    username: String(value.username || ""),
    password: String(value.password || ""),
    role: value.role as Role,
    className: String(value.kelas_identitas || value.className || ""),
    isActive:
      value.status === undefined
        ? value.isActive !== false
        : String(value.status).toLowerCase() !== "nonaktif",
    createdAt: String(value.dibuat_pada || value.createdAt || new Date().toISOString()),
  };
}

export async function loadUsers(): Promise<SchoolUser[]> {
  await migrateLegacyData();
  let users = (await dbGetAll("users")).map(fromDbUser);

  const existing = new Set(users.map((user) => user.username.toLowerCase()));
  const missingSeeds = seedUsers.filter(
    (seed) => !existing.has(seed.username.toLowerCase())
  );

  if (missingSeeds.length) {
    await dbUpsertMany("users", missingSeeds.map(toDbUser), "manual");
    users = [...users, ...missingSeeds];
  }

  return users;
}

export async function saveUsers(users: SchoolUser[]) {
  await dbReplaceModule("users", users.map(toDbUser), "manual");
}

export async function authenticate(username: string, password: string) {
  const users = await loadUsers();
  return users.find(
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
