import { Role } from "./client";

export type Permission =
  | "manage_users"
  | "executive_dashboard"
  | "manage_generators"
  | "manage_library"
  | "use_simulators"
  | "manage_cbt"
  | "take_cbt"
  | "view_learning_analytics"
  | "manage_eraport"
  | "view_eraport"
  | "manage_attendance"
  | "view_attendance"
  | "manage_spp"
  | "view_spp"
  | "manage_prala"
  | "view_prala"
  | "manage_mcu"
  | "view_mcu"
  | "manage_alumni"
  | "manage_ppdb"
  | "view_ppdb";

const permissions: Record<Role, Permission[]> = {
  Admin: [
    "manage_users",
    "executive_dashboard",
    "manage_generators",
    "manage_library",
    "use_simulators",
    "manage_cbt",
    "take_cbt",
    "view_learning_analytics",
    "manage_eraport",
    "view_eraport",
    "manage_attendance",
    "view_attendance",
    "manage_spp",
    "view_spp",
    "manage_prala",
    "view_prala",
    "manage_mcu",
    "view_mcu",
    "manage_alumni",
    "manage_ppdb",
    "view_ppdb",
  ],
  "Kepala Sekolah": [
    "manage_users",
    "executive_dashboard",
    "manage_library",
    "use_simulators",
    "manage_cbt",
    "take_cbt",
    "view_learning_analytics",
    "manage_eraport",
    "view_eraport",
    "manage_attendance",
    "view_attendance",
    "manage_spp",
    "view_spp",
    "manage_prala",
    "view_prala",
    "manage_mcu",
    "view_mcu",
    "manage_alumni",
    "manage_ppdb",
    "view_ppdb",
  ],
  Guru: [
    "manage_generators",
    "manage_library",
    "use_simulators",
    "manage_cbt",
    "take_cbt",
    "view_learning_analytics",
    "manage_eraport",
    "view_eraport",
    "manage_attendance",
    "view_attendance",
    "view_prala",
    "view_mcu",
    "view_ppdb",
  ],
  Taruna: [
    "manage_library",
    "use_simulators",
    "take_cbt",
    "view_eraport",
    "view_attendance",
    "view_spp",
    "view_prala",
    "view_mcu",
    "view_ppdb",
  ],
  "Wali Taruna": [
    "view_eraport",
    "view_attendance",
    "view_spp",
    "view_prala",
    "view_mcu",
    "view_ppdb",
  ],
};

export function hasPermission(role: Role, permission: Permission) {
  return permissions[role]?.includes(permission) ?? false;
}

export function canAccessRole(
  role: Role,
  allowedRoles?: Role[]
) {
  return !allowedRoles || allowedRoles.includes(role);
}
