export type Role = "Admin" | "Kepala Sekolah" | "Waka Kurikulum" | "Guru" | "Taruna" | "Wali Taruna";

export type Session = {
  role: Role;
  name: string;
  loginAt: string;
};

export type KnowledgeRecord = {
  id: string;
  fileName: string;
  title: string;
  summary: string;
  content: string;
  suggestedQuestions: string[];
  size: number;
  createdAt: string;
  createdBy: string;
  createdByRole?: string;
  visibility?: "all";
  fileUri?: string;
};

export type UsageLog = {
  id: string;
  type: "chat" | "document" | "knowledge" | "voice";
  mode: string;
  title: string;
  role: string;
  createdAt: string;
  inputChars?: number;
  outputChars?: number;
};

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("smkpd_session");
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function loadArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveArray<T>(key: string, value: T[], limit = 100) {
  localStorage.setItem(key, JSON.stringify(value.slice(0, limit)));
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function cleanSpeechText(value: string) {
  return value
    .replace(/\|/g, " ")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/[-*_]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
