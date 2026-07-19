"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import RichText from "../components/RichText";
import {
  cleanSpeechText,
  createId,
  KnowledgeRecord,
  loadArray,
  loadSession,
  saveArray,
  UsageLog,
} from "../lib/client";

type Mode = "umum" | "nautika" | "teknika" | "english";
type Message = { id: string; role: "user" | "assistant"; text: string };

const modes: Array<{
  id: Mode;
  title: string;
  icon: string;
  description: string;
  prompts: string[];
}> = [
  {
    id: "umum",
    title: "AI Assistant",
    icon: "✦",
    description: "Asisten pembelajaran dan administrasi sekolah.",
    prompts: [
      "Buat rencana kegiatan pembelajaran yang aktif untuk kelas X.",
      "Jelaskan konsep ini menggunakan bahasa yang mudah dipahami taruna.",
      "Buat ringkasan dan pertanyaan evaluasi dari materi berikut.",
    ],
  },
  {
    id: "nautika",
    title: "AI Nautika",
    icon: "⚓",
    description: "Navigasi, COLREG, deck operation, muatan, dan dinas jaga.",
    prompts: [
      "Jelaskan COLREG Rule 13 beserta contoh situasinya.",
      "Buat checklist persiapan lepas sandar untuk taruna Nautika.",
      "Buat simulasi handover dinas jaga di anjungan.",
    ],
  },
  {
    id: "teknika",
    title: "AI Teknika",
    icon: "⚙️",
    description: "Mesin induk, pesawat bantu, sistem kapal, dan perawatan.",
    prompts: [
      "Jelaskan alur sistem pendingin tertutup main engine.",
      "Buat checklist persiapan mesin sebelum keberangkatan.",
      "Buat diagnosis awal ketika tekanan minyak lumas menurun.",
    ],
  },
  {
    id: "english",
    title: "Maritime English",
    icon: "📚",
    description: "Percakapan, SMCP, kosakata, pelafalan, dan koreksi.",
    prompts: [
      "Buat dialog bridge watch handover beserta arti Indonesia.",
      "Latih saya memberikan steering commands yang benar.",
      "Koreksi kalimat Maritime English berikut dan jelaskan kesalahannya.",
    ],
  },
];

export default function ProfessionalAiPage() {
  const [mode, setMode] = useState<Mode>("umum");
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Selamat datang di AI Profesional SMKPD. Pilih mode AI, gunakan mikrofon bila diperlukan, lalu tuliskan pertanyaan Anda.",
    },
  ]);
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([]);
  const [knowledgeId, setKnowledgeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState("");
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const queryMode = new URLSearchParams(window.location.search).get("mode");
    if (queryMode && ["umum", "nautika", "teknika", "english"].includes(queryMode)) {
      setMode(queryMode as Mode);
    }
    setKnowledge(loadArray<KnowledgeRecord>("smkpd_knowledge"));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeMode = useMemo(
    () => modes.find((item) => item.id === mode) || modes[0],
    [mode]
  );
  const selectedKnowledge = useMemo(
    () => knowledge.find((item) => item.id === knowledgeId),
    [knowledge, knowledgeId]
  );

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    const session = loadSession();
    if (!session) return;

    const context = selectedKnowledge
      ? `\n\nKONTEKS DOKUMEN SEKOLAH:\nJudul: ${selectedKnowledge.title}\n${selectedKnowledge.content.slice(0, 18000)}\n\nJawab berdasarkan konteks dokumen tersebut. Bila jawabannya tidak ada di dokumen, katakan dengan jujur.`
      : "";

    const userMessage: Message = {
      id: createId(),
      role: "user",
      text: message,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setNotice("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          role: session.role,
          language,
          message: `${message}${context}`,
          history: nextMessages
            .slice(-8)
            .map((item) => ({ role: item.role, text: item.text })),
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "AI belum dapat menjawab.");

      const answer = String(data.text || "");
      setMessages((previous) => [
        ...previous,
        { id: createId(), role: "assistant", text: answer },
      ]);

      const log: UsageLog = {
        id: createId(),
        type: "chat",
        mode,
        title: message.slice(0, 80),
        role: session.role,
        createdAt: new Date().toISOString(),
        inputChars: message.length,
        outputChars: answer.length,
      };
      saveArray("smkpd_ai_logs", [log, ...loadArray<UsageLog>("smkpd_ai_logs")], 200);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Terjadi kendala saat menghubungi AI.";
      setMessages((previous) => [
        ...previous,
        { id: createId(), role: "assistant", text: `Terjadi kendala: ${text}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function startVoiceInput() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotice("Mikrofon belum didukung browser ini. Gunakan Chrome atau Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === "id" ? "id-ID" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => {
      setListening(true);
      setNotice("Silakan berbicara...");
    };
    recognition.onresult = (event: any) => {
      setInput(event.results[0][0].transcript);
      setNotice("Suara berhasil diubah menjadi teks.");
    };
    recognition.onerror = () => setNotice("Suara belum terbaca. Silakan coba lagi.");
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function speak(message: Message) {
    if (!("speechSynthesis" in window)) {
      setNotice("Pembaca suara belum tersedia di browser ini.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanSpeechText(message.text));
    utterance.lang = language === "id" ? "id-ID" : "en-US";
    utterance.rate = 0.95;
    utterance.onstart = () => {
      setSpeakingId(message.id);
      const session = loadSession();
      if (session) {
        const log: UsageLog = {
          id: createId(),
          type: "voice",
          mode,
          title: "Membacakan jawaban AI",
          role: session.role,
          createdAt: new Date().toISOString(),
        };
        saveArray("smkpd_ai_logs", [log, ...loadArray<UsageLog>("smkpd_ai_logs")], 200);
      }
    };
    utterance.onend = () => setSpeakingId("");
    utterance.onerror = () => setSpeakingId("");
    window.speechSynthesis.speak(utterance);
  }

  function clearChat() {
    window.speechSynthesis?.cancel();
    setMessages([
      {
        id: createId(),
        role: "assistant",
        text: `Percakapan baru untuk mode ${activeMode.title} telah dimulai.`,
      },
    ]);
    setSpeakingId("");
    setNotice("");
  }

  return (
    <PortalLayout
      title="AI Profesional"
      subtitle="Chat multimode, knowledge context, input suara, dan pembaca jawaban."
    >
      <section className="ai-suite-grid">
        <aside className="ai-mode-panel">
          <p className="suite-eyebrow">PILIH SPESIALIS</p>
          <div className="ai-mode-list">
            {modes.map((item) => (
              <button
                key={item.id}
                className={mode === item.id ? "active" : ""}
                onClick={() => {
                  setMode(item.id);
                  setMessages([
                    {
                      id: createId(),
                      role: "assistant",
                      text: `${item.title} aktif. ${item.description}`,
                    },
                  ]);
                }}
              >
                <span>{item.icon}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </div>
              </button>
            ))}
          </div>

          <label className="ai-select-label">
            Bahasa Jawaban
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as "id" | "en")}
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="ai-select-label">
            Knowledge Base
            <select
              value={knowledgeId}
              onChange={(event) => setKnowledgeId(event.target.value)}
            >
              <option value="">Tanpa dokumen</option>
              {knowledge.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.title}
                </option>
              ))}
            </select>
          </label>

          <div className="ai-prompt-box">
            <strong>Contoh Perintah</strong>
            {activeMode.prompts.map((prompt) => (
              <button key={prompt} onClick={() => setInput(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <section className="professional-chat">
          <header className="professional-chat-header">
            <div>
              <span className="ai-online-dot" />
              <div>
                <strong>{activeMode.icon} {activeMode.title}</strong>
                <small>
                  {selectedKnowledge
                    ? `Menggunakan dokumen: ${selectedKnowledge.title}`
                    : "Terhubung ke Gemini AI"}
                </small>
              </div>
            </div>
            <button onClick={clearChat}>Percakapan Baru</button>
          </header>

          <div className="professional-messages">
            {messages.map((message) => (
              <article className={`professional-message ${message.role}`} key={message.id}>
                <div className="message-avatar">
                  {message.role === "assistant" ? (
                    <img src="/logo-smkpd-64.png" alt="" />
                  ) : (
                    "Anda"
                  )}
                </div>
                <div className="message-content">
                  {message.role === "assistant" ? (
                    <RichText text={message.text} />
                  ) : (
                    <p>{message.text}</p>
                  )}
                  {message.role === "assistant" && (
                    <button className="speak-answer" onClick={() => speak(message)}>
                      {speakingId === message.id ? "🔊 Sedang dibacakan" : "🔈 Baca jawaban"}
                    </button>
                  )}
                </div>
              </article>
            ))}
            {loading && (
              <article className="professional-message assistant">
                <div className="message-avatar">
                  <img src="/logo-smkpd-64.png" alt="" />
                </div>
                <div className="message-content ai-thinking">
                  AI sedang menyusun jawaban terbaik...
                </div>
              </article>
            )}
            <div ref={endRef} />
          </div>

          <form className="professional-composer" onSubmit={submit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={`Tulis pertanyaan untuk ${activeMode.title}...`}
              rows={3}
            />
            <div>
              <button
                type="button"
                className={listening ? "voice-active" : ""}
                onClick={startVoiceInput}
              >
                {listening ? "🎙️ Mendengarkan..." : "🎤 Bicara"}
              </button>
              <button type="submit" disabled={loading || !input.trim()}>
                {loading ? "Memproses..." : "Kirim →"}
              </button>
            </div>
          </form>
          {notice && <p className="ai-notice">{notice}</p>}
        </section>
      </section>
    </PortalLayout>
  );
}
