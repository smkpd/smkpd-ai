import Link from "next/link";

const functions = [
  {
    icon: "🗓️",
    title: "Jadwal Otomatis",
    description:
      "Preferensi guru, generator anti bentrok, serta cetak jadwal sekolah, guru, kelas, dan taruna.",
    href: "/login",
  },
  {
    icon: "✦",
    title: "AI Pembelajaran",
    description:
      "Asisten umum, AI Nautika, AI Teknika, dan Maritime English untuk kegiatan belajar.",
    href: "/login",
  },
  {
    icon: "📚",
    title: "Perpustakaan AI",
    description:
      "Kelola PDF dan materi maritim, lalu tanyakan isi dokumen kepada AI.",
    href: "/login",
  },
  {
    icon: "📖",
    title: "Akademik & CBT",
    description:
      "E-Raport, absensi, analisis hasil belajar, dan bank soal terintegrasi.",
    href: "/login",
  },
  {
    icon: "⚓",
    title: "Simulator Maritim",
    description:
      "Virtual Ship Tour, Bridge Simulator, Engine Room, dan latihan SMCP.",
    href: "/login",
  },
  {
    icon: "🏫",
    title: "Layanan Taruna",
    description:
      "Pembayaran SPP, PRALA, MCU, Alumni, dan PPDB dalam satu alur.",
    href: "/login",
  },
  {
    icon: "🗄️",
    title: "Database & Excel",
    description:
      "Database terstruktur dengan impor satu jenis data per proses dan backup Excel.",
    href: "/login",
  },
];

const roleAccess = [
  {
    role: "Admin",
    icon: "👨‍💼",
    description: "Pengaturan sistem, database, pengguna, dokumen, dan seluruh layanan.",
  },
  {
    role: "Kepala Sekolah",
    icon: "👩‍💼",
    description: "Dashboard eksekutif, validasi data, pengguna, dan monitoring sekolah.",
  },
  {
    role: "Waka Kurikulum",
    icon: "🧑‍💼",
    description: "Mengelola struktur kurikulum, beban mengajar, preferensi, dan jadwal anti bentrok.",
  },
  {
    role: "Guru",
    icon: "👨‍🏫",
    description: "Perangkat ajar, akademik, CBT, AI, perpustakaan, dan absensi.",
  },
  {
    role: "Taruna & Wali",
    icon: "👨‍🎓",
    description: "Akses belajar dan informasi akademik atau layanan sesuai kewenangan.",
  },
];

export default function Home() {
  return (
    <main className="product-landing">
      <header className="product-nav">
        <Link href="/" className="product-brand">
          <img src="/logo-smkpd.png" alt="Logo SMK Pelayaran Demak" />
          <div>
            <strong>SMKPD AI</strong>
            <span>Sistem Informasi dan Pembelajaran Maritim</span>
          </div>
        </Link>

        <nav>
          <a href="#fungsi">Fungsi</a>
          <a href="#alur">Alur</a>
          <a href="#akses">Akses</a>
          <Link href="/login" className="product-login-button">
            Masuk Sistem
          </Link>
        </nav>
      </header>

      <section className="product-hero">
        <div className="product-hero-copy">
          <p className="product-kicker">
            SMK PELAYARAN DEMAK BOARDING SCHOOL
          </p>
          <h1>
            Satu sistem untuk pembelajaran, akademik, administrasi, dan layanan
            sekolah.
          </h1>
          <p>
            SMKPD AI menghubungkan kecerdasan buatan maritim, pengelolaan data,
            perangkat ajar, layanan taruna, dan monitoring sekolah dalam alur
            kerja yang terstruktur.
          </p>
          <div className="product-hero-actions">
            <Link href="/login" className="product-primary-button">
              Masuk ke Sistem
            </Link>
            <a href="#fungsi" className="product-secondary-button">
              Pelajari Fungsi
            </a>
          </div>
          <div className="product-trust-row">
            <span>✓ Akses berbasis peran</span>
            <span>✓ Database terstruktur</span>
            <span>✓ Import data per jenis</span>
          </div>
        </div>

        <div className="product-command-card">
          <div className="product-command-head">
            <img src="/logo-smkpd-192.png" alt="" />
            <div>
              <small>PLATFORM TERPADU</small>
              <strong>Maritime School System</strong>
            </div>
          </div>
          <div className="product-command-list">
            <div><span>✦</span><b>AI Maritim</b><small>Pembelajaran dan dokumen</small></div>
            <div><span>📊</span><b>Akademik</b><small>Nilai, absensi, dan CBT</small></div>
            <div><span>🗄️</span><b>Database</b><small>Excel dan data sekolah</small></div>
            <div><span>🏫</span><b>Layanan</b><small>SPP, PRALA, MCU, Alumni, PPDB</small></div>
          </div>
          <div className="product-system-status">
            <i />
            Sistem siap digunakan
          </div>
        </div>
      </section>

      <section className="product-function-section" id="fungsi">
        <div className="product-section-heading">
          <p>FUNGSI UTAMA</p>
          <h2>Setiap pekerjaan berada pada menu yang tepat</h2>
          <span>
            Tidak ada menu berulang. Pengguna masuk ke sistem dan hanya melihat
            fungsi sesuai role.
          </span>
        </div>

        <div className="product-function-grid">
          {functions.map((item) => (
            <Link href={item.href} key={item.title}>
              <span>{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <strong>Buka melalui portal →</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="product-workflow-section" id="alur">
        <div className="product-section-heading">
          <p>ALUR OPERASIONAL</p>
          <h2>Data dikerjakan secara bertahap dan mudah diperiksa</h2>
        </div>

        <div className="product-workflow-grid">
          <article>
            <span>1</span>
            <h3>Siapkan Data</h3>
            <p>Pilih satu jenis data, misalnya Taruna, Nilai, SPP, atau PPDB.</p>
          </article>
          <article>
            <span>2</span>
            <h3>Gunakan Template</h3>
            <p>Unduh template khusus untuk item tersebut dan lengkapi datanya.</p>
          </article>
          <article>
            <span>3</span>
            <h3>Validasi dan Import</h3>
            <p>Unggah satu file, periksa kesalahan, lalu simpan ke database.</p>
          </article>
          <article>
            <span>4</span>
            <h3>Gunakan Data</h3>
            <p>Data tersedia pada modul akademik, layanan, pengguna, atau laporan.</p>
          </article>
        </div>
      </section>

      <section className="product-access-section" id="akses">
        <div className="product-section-heading">
          <p>HAK AKSES</p>
          <h2>Tampilan dan wewenang menyesuaikan pengguna</h2>
        </div>

        <div className="product-access-grid">
          {roleAccess.map((item) => (
            <article key={item.role}>
              <span>{item.icon}</span>
              <div>
                <h3>{item.role}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="product-cta">
        <img src="/logo-smkpd-192.png" alt="" />
        <div>
          <p>PORTAL RESMI SMKPD AI</p>
          <h2>Masuk menggunakan akun yang diberikan pengelola sistem.</h2>
          <span>
            Username dan password dikelola oleh Admin atau Kepala Sekolah.
          </span>
        </div>
        <Link href="/login">Masuk Sistem →</Link>
      </section>

      <footer className="product-footer">
        <div className="product-footer-brand">
          <img src="/logo-smkpd.png" alt="" />
          <div>
            <strong>SMKPD AI</strong>
            <span>SMK Pelayaran Demak Boarding School</span>
          </div>
        </div>
        <div className="product-footer-credit">
          Dibuat oleh <strong>Syaiful Bahri, M. Pd</strong>
          <span>Contact: 082335339994</span>
        </div>
        <span>© 2026 SMK Pelayaran Demak Boarding School</span>
      </footer>
    </main>
  );
}
