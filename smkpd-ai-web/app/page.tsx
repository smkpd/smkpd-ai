"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type ChatMessage = { role: "user" | "assistant"; text: string };
type Mode = "umum" | "english" | "nautika" | "teknika" | "soal" | "surat";

const modes: { id: Mode; icon: string; title: string; subtitle: string; example: string }[] = [
  { id: "umum", icon: "/logo-smkpd-64.png", title: "AI Assistant", subtitle: "Asisten sekolah serbaguna", example: "Jelaskan fungsi SMKPD AI secara singkat." },
  { id: "english", icon: "📚", title: "Maritime English", subtitle: "Latihan komunikasi maritim", example: "Buat percakapan singkat antara captain dan cadet saat handover jaga." },
  { id: "nautika", icon: "⚓", title: "AI Nautika", subtitle: "Navigasi, COLREG, deck", example: "Jelaskan COLREG Rule 13 dengan bahasa sederhana." },
  { id: "teknika", icon: "⚙️", title: "AI Teknika", subtitle: "Mesin dan sistem kapal", example: "Jelaskan sistem pendingin main engine kapal." },
  { id: "soal", icon: "📝", title: "Generator Soal", subtitle: "Buat soal dan kunci", example: "Buat 10 soal pilihan ganda tentang alat keselamatan kapal beserta kunci." },
  { id: "surat", icon: "📄", title: "Generator Surat", subtitle: "Surat resmi sekolah", example: "Buat surat undangan rapat wali taruna yang resmi." },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("umum");
  const [role, setRole] = useState("Guru");
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Selamat datang di SMKPD AI. Pilih layanan, lalu tuliskan pertanyaan Anda. Saya siap membantu kebutuhan pembelajaran dan administrasi maritim.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const active = modes.find((item) => item.id === mode)!;

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text: message }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, role, language, message, history: nextMessages.slice(-8) }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI belum dapat merespons.");

      setMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: error instanceof Error
            ? `Terjadi kendala: ${error.message}`
            : "Terjadi kendala saat menghubungi AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function startVoiceInput() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Fitur mikrofon belum didukung browser ini. Gunakan Google Chrome atau Microsoft Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === "id" ? "id-ID" : "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event: any) => setInput(event.results[0][0].transcript);
    recognition.onerror = () => alert("Suara belum terbaca. Silakan coba lagi.");
    recognition.start();
  }

  function speakLastAnswer() {
    const last = [...messages].reverse().find((item) => item.role === "assistant");
    if (!last || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(last.text);
    utterance.lang = language === "id" ? "id-ID" : "en-US";
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main>
      <header className="navbar">
        <div className="brand">
          <img src="/logo-smkpd.png" alt="Logo SMK Pelayaran Demak" />
          <div>
            <strong>SMKPD AI</strong>
            <span>Smart Maritime Education Platform</span>
          </div>
        </div>

        <div className="nav-actions">
          <Link className="dashboard-link" href="/login">Masuk Portal v3</Link>
          <select aria-label="Peran pengguna" value={role} onChange={(e) => setRole(e.target.value)}>
            <option>Admin</option>
            <option>Guru</option>
            <option>Taruna</option>
            <option>Wali Taruna</option>
          </select>
          <button className="language" onClick={() => setLanguage(language === "id" ? "en" : "id")}>
            {language === "id" ? "ID 🇮🇩" : "EN 🇬🇧"}
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">SMK PELAYARAN DEMAK BOARDING SCHOOL</p>
          <h1>
            Belajar maritim lebih cepat dengan <span>Artificial Intelligence</span>
          </h1>
          <p className="hero-description">
            Satu platform untuk Maritime English, Nautika, Teknika, pembuatan soal,
            surat resmi, dan pendamping belajar taruna.
          </p>
          <div className="hero-buttons">
            <a href="#assistant" className="primary-btn">Mulai Gunakan AI</a>
            <Link href="/presentasi" className="secondary-btn">Lihat Semua Fitur</Link>
            <span className="status"><i /> Sistem demo aktif</span>
          </div>
          <div className="stats">
            <div><strong>12+</strong><span>Layanan AI</span></div>
            <div><strong>4</strong><span>Peran pengguna</span></div>
            <div><strong>2</strong><span>Bahasa</span></div>
          </div>
        </div>

        <div className="hero-card">
          <div className="radar">
            <div className="radar-line" />
            <div className="radar-dot dot-one" />
            <div className="radar-dot dot-two" />
            <div className="radar-dot dot-three" />
            <img src="/logo-smkpd.png" alt="" />
          </div>
          <h2>Maritime Intelligence Center</h2>
          <p>Teknologi pembelajaran untuk generasi maritim religius, disiplin, tangguh, profesional, dan berkarakter.</p>
        </div>
      </section>

      <section className="feature-section">
        <div className="section-heading">
          <p>LAYANAN UTAMA</p>
          <h2>Pilih kebutuhan Anda</h2>
        </div>
        <div className="feature-grid">
          {modes.map((item) => (
            <button
              key={item.id}
              className={`feature-card ${mode === item.id ? "active" : ""}`}
              onClick={() => {
                setMode(item.id);
                document.getElementById("assistant")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span className={`feature-icon ${item.icon.startsWith("/") ? "service-logo-icon" : ""}`}>
                {item.icon.startsWith("/") ? <img src={item.icon} alt="" /> : item.icon}
              </span>
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
              <span className="feature-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      <section className="assistant-section" id="assistant">
        <aside className="assistant-sidebar">
          <p className="eyebrow">MODE AKTIF</p>
          <div className="active-mode">
            <span className={active.icon.startsWith("/") ? "service-logo-icon" : ""}>
              {active.icon.startsWith("/") ? <img src={active.icon} alt="" /> : active.icon}
            </span>
            <div>
              <strong>{active.title}</strong>
              <small>{active.subtitle}</small>
            </div>
          </div>
          <p className="sidebar-label">Contoh perintah</p>
          <button className="example-button" onClick={() => setInput(active.example)}>
            “{active.example}”
          </button>
          <div className="demo-note">
            <strong>Mode Demo</strong>
            <p>Portal v3 menyediakan generator, AI maritim, PDF Knowledge Base, voice, arsip, dan statistik kepala sekolah.</p>
          </div>
        </aside>

        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <span className="online-dot" />
              <strong>SMKPD AI Assistant</strong>
              <small>Siap melayani sebagai {role}</small>
            </div>
            <button className="voice-output" onClick={speakLastAnswer}>
              {speaking ? "🔊 Berbicara..." : "🔈 Baca Jawaban"}
            </button>
          </div>

          <div className="messages">
            {messages.map((item, index) => (
              <div key={index} className={`message ${item.role}`}>
                <span className="avatar">{item.role === "assistant" ? "⚓" : "👤"}</span>
                <div>{item.text}</div>
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <span className="avatar">⚓</span>
                <div className="typing"><i /><i /><i /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="chat-form" onSubmit={submit}>
            <button type="button" className="mic-button" onClick={startVoiceInput} title="Masukkan suara">🎙️</button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={`Tulis pertanyaan untuk ${active.title}...`}
              rows={1}
            />
            <button className="send-button" disabled={loading || !input.trim()}>
              Kirim ➜
            </button>
          </form>
          <p className="disclaimer">AI dapat membuat kekeliruan. Verifikasi materi penting dengan guru atau sumber resmi.</p>
        </div>
      </section>

      <footer>
        <img src="/logo-smkpd.png" alt="" />
        <div>
          <strong>SMKPD AI</strong>
          <p>SMK Pelayaran Demak Boarding School</p>
        </div>
        <span>© 2026 • Presentation Edition v3.0</span>
      </footer>
    </main>
  );
}
