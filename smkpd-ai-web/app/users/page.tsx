"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { formatDate, Role } from "../lib/client";
import {
  createSchoolUser,
  loadUsers,
  saveUsers,
  SchoolUser,
} from "../lib/users";

const roleOptions: Role[] = [
  "Admin",
  "Kepala Sekolah",
  "Waka Kurikulum",
  "Guru",
  "Taruna",
  "Wali Taruna",
];

const blankForm = {
  name: "",
  username: "",
  password: "",
  role: "Guru" as Role,
  className: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [form, setForm] = useState(blankForm);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { loadUsers().then(setUsers); }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) =>
      [user.name, user.username, user.role, user.className || ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [search, users]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const username = form.username.trim().toLowerCase();

    if (!form.name.trim() || !username || form.password.length < 6) {
      setNotice("Nama, username, dan password minimal 6 karakter wajib diisi.");
      return;
    }

    if (users.some((user) => user.username.toLowerCase() === username)) {
      setNotice("Username sudah digunakan.");
      return;
    }

    const user = createSchoolUser({
      ...form,
      name: form.name.trim(),
      username,
      isActive: true,
    });
    const next = [user, ...users];
    await saveUsers(next);
    setUsers(next);
    setForm(blankForm);
    setNotice("Pengguna baru berhasil ditambahkan.");
  }

  async function toggleUser(user: SchoolUser) {
    if (user.username === "admin" || user.username === "kepala") {
      setNotice("Akun inti Admin dan Kepala Sekolah tidak dapat dinonaktifkan.");
      return;
    }
    const next = users.map((item) =>
      item.id === user.id ? { ...item, isActive: !item.isActive } : item
    );
    await saveUsers(next);
    setUsers(next);
  }

  async function resetPassword(user: SchoolUser) {
    const password = window.prompt(
      `Masukkan password baru untuk ${user.name} (minimal 6 karakter):`
    );
    if (!password) return;
    if (password.length < 6) {
      setNotice("Password minimal 6 karakter.");
      return;
    }

    const next = users.map((item) =>
      item.id === user.id ? { ...item, password } : item
    );
    await saveUsers(next);
    setUsers(next);
    setNotice(`Password ${user.name} berhasil diperbarui.`);
  }

  async function removeUser(user: SchoolUser) {
    if (user.username === "admin" || user.username === "kepala") {
      setNotice("Akun inti tidak dapat dihapus.");
      return;
    }
    if (!window.confirm(`Hapus akun ${user.name}?`)) return;
    const next = users.filter((item) => item.id !== user.id);
    await saveUsers(next);
    setUsers(next);
    setNotice("Akun berhasil dihapus.");
  }

  return (
    <PortalLayout
      title="Manajemen Pengguna"
      subtitle="Admin dan Kepala Sekolah dapat menambah akun termasuk Waka Kurikulum, mengubah password, serta mengatur status pengguna."
      requiredPermission="manage_users"
    >
      <section className="user-management-grid">
        <form className="user-form-card" onSubmit={submit}>
          <p className="suite-eyebrow">TAMBAH PENGGUNA</p>
          <h2>Akun Baru</h2>

          <label>
            Nama Lengkap
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>

          <label>
            Username
            <input
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
            />
          </label>

          <label>
            Password
            <input
              type="text"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              placeholder="Minimal 6 karakter"
            />
          </label>

          <label>
            Role
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as Role })
              }
            >
              {roleOptions.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>

          {(form.role === "Taruna" || form.role === "Wali Taruna") && (
            <label>
              Kelas / Identitas Taruna
              <input
                value={form.className}
                onChange={(event) =>
                  setForm({ ...form, className: event.target.value })
                }
                placeholder="Contoh: X Nautika"
              />
            </label>
          )}

          <button>Tambah Pengguna</button>
          {notice && <p className="module-notice">{notice}</p>}
        </form>

        <section className="user-list-card">
          <div className="module-card-header">
            <div>
              <p className="suite-eyebrow">DAFTAR AKUN</p>
              <h2>{users.length} Pengguna</h2>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari pengguna..."
            />
          </div>

          <div className="responsive-table-wrap">
            <table className="school-table">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Role</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small>{user.className || "-"}</small>
                    </td>
                    <td>{user.role}</td>
                    <td>{user.username}</td>
                    <td>
                      <span className={user.isActive ? "status-active" : "status-inactive"}>
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => resetPassword(user)}>Password</button>
                        <button onClick={() => toggleUser(user)}>
                          {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button className="danger" onClick={() => removeUser(user)}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </PortalLayout>
  );
}
