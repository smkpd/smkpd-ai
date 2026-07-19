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
  welcome: string;
  prompts: string[];
}> = [
  {
    id: "umum",
    title: "AI Assistant",
    icon: "✦",
    description: "Pembelajaran dan administrasi sekolah.",
    welcome:
      "AI Assistant aktif. Tuliskan kebutuhan pembelajaran atau administrasi sekolah Anda.",
    prompts: [
      "Buat rencana kegiatan pembelajaran aktif untuk kelas X.",
      "Ringkas materi berikut dan buat lima pertanyaan evaluasi.",
      "Jelaskan konsep ini dengan bahasa sederhana untuk taruna.",
    ],
  },
  {
    id: "nautika",
    title: "AI Nautika",
    icon: "⚓",
    description: "Navigasi, COLREG, deck, muatan, dan dinas jaga.",
    welcome:
      "AI Nautika aktif. Saya siap membantu navigasi, COLREG, deck operation, muatan, keselamatan, dan dinas jaga.",
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
    description: "Mesin, sistem kapal, troubleshooting, dan perawatan.",
    welcome:
      "AI Teknika aktif. Saya siap membantu mesin induk, pesawat bantu, sistem kapal, perawatan, dan troubleshooting.",
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
    description: "SMCP, conversation, vocabulary, grammar, dan pronunciation.",
    welcome:
      "Maritime English mode is active. Ask for a dialogue, vocabulary lesson, SMCP practice, grammar correction, or pronunciation guidance. Penjelasan Bahasa Indonesia akan tetap disertakan.",
    prompts: [
      "Create a bridge watch handover dialogue with Indonesian translation.",
      "Train me to give standard steering commands and correct my responses.",
      "Teach 15 engine-room vocabulary words with examples and pronunciation guidance.",
      "Correct this sentence: Captain, the ship already arrive at pilot station.",
    ],
  },
];

function getModeFromLocation(): Mode {
  if (typeof window === "undefined") return "umum";
  const value = new URLSearchParams(window.location.search).get("mode");
  return value && ["umum", "nautika", "teknika", "english"].includes(value)
    ? (value as Mode)
    : "umum";
}

export default function ProfessionalAiPage() {
  const [mode, setMode] = useState<Mode>("umum");
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([]);
  const [knowledgeId, setKnowledgeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState("");
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  function activateMode(nextMode: Mode, updateUrl = true) {
    const selected = modes.find((item) => item.id === nextMode) || modes[0];
    setMode(nextMode);
    setLanguage(nextMode === "english" ? "en" : "id");
    setMessages([
      {
        id: createId(),
        role: "assistant",
        text: selected.welcome,
      },
    ]);
    setInput("");
    setNotice("");

    if (updateUrl) {
      const url = nextMode === "umum" ? "/ai" : `/ai?mode=${nextMode}`;
      window.history.replaceState({}, "", url);
    }
  }

  useEffect(() => {
    activateMode(getModeFromLocation(), false);
    setKnowledge(loadArray<KnowledgeRecord>("smkpd_knowledge"));

    const syncFromBrowser = () => activateMode(getModeFromLocation(), false);
    window.addEventListener("popstate", syncFromBrowser);
    return () => window.removeEventListener("popstate", syncFromBrowser);
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
    const userText = input.trim();
    if (!userText || loading) return;

    const session = loadSession();
    if (!session) return;

    const englishInstruction =
      mode === "english"
        ? "\n\nMARITIME ENGLISH INSTRUCTION: Use English first, then provide concise Indonesian translation/explanation. Include correct maritime terminology, a practice response, and pronunciation guidance when relevant."
        : "";

    const documentContext = selectedKnowledge
      ? `\n\nDOCUMENT CONTEXT:\nTitle: ${selectedKnowledge.title}\n${selectedKnowledge.content.slice(0, 18000)}\n\nUse this document when relevant. If the answer is not found in it, say so honestly.`
      : "";

    const requestMessage = `${userText}${englishInstruction}${documentContext}`;

    const userMessage: Message = {
      id: createId(),
      role: "user",
      text: userText,
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
          message: requestMessage,
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
        title: userText.slice(0, 80),
        role: session.role,
        createdAt: new Date().toISOString(),
        inputChars: userText.length,
        outputChars: answer.length,
      };
      saveArray(
        "smkpd_ai_logs",
        [log, ...loadArray<UsageLog>("smkpd_ai_logs")],
        200
      );
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Terjadi kendala saat menghubungi AI.";
      setMessages((previous) => [
        ...previous,
        {
          id: createId(),
          role: "assistant",
          text: `Terjadi kendala: ${text}`,
        },
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
      setNotice(
        "Mikrofon belum didukung browser ini. Gunakan Chrome/Edge dan izinkan akses mikrofon."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = mode === "english" ? "en-US" : language === "id" ? "id-ID" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => {
      setListening(true);
      setNotice(
        mode === "english"
          ? "Speak in English now..."
          : "Silakan berbicara..."
      );
    };
    recognition.onresult = (event: any) => {
      setInput(event.results[0][0].transcript);
      setNotice("Suara berhasil diubah menjadi teks.");
    };
    recognition.onerror = () =>
      setNotice("Suara belum terbaca. Pastikan izin mikrofon aktif.");
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
    utterance.lang = mode === "english" ? "en-US" : language === "id" ? "id-ID" : "en-US";
    utterance.rate = mode === "english" ? 0.86 : 0.94;
    utterance.onstart = () => {
      setSpeakingId(message.id);
      const session = loadSession();
      if (session) {
        const log: UsageLog = {
          id: createId(),
          type: "voice",
          mode,
          title: `Pembaca suara ${activeMode.title}`,
          role: session.role,
          createdAt: new Date().toISOString(),
        };
        saveArray(
          "smkpd_ai_logs",
          [log, ...loadArray<UsageLog>("smkpd_ai_logs")],
          200
        );
      }
    };
    utterance.onend = () => setSpeakingId("");
    utterance.onerror = () => setSpeakingId("");
    window.speechSynthesis.speak(utterance);
  }

  function clearChat() {
    window.speechSynthesis?.cancel();
    activateMode(mode);
    setSpeakingId("");
  }

  return (
    <PortalLayout
      title="AI Profesional"
      subtitle="AI umum, Nautika, Teknika, Maritime English, knowledge context, dan voice."
    >
      <section className="ai-suite-grid">
        <aside className="ai-mode-panel">
          <p className="suite-eyebrow">PILIH SPESIALIS</p>
          <div className="ai-mode-list">
            {modes.map((item) => (
              <button
                key={item.id}
                className={mode === item.id ? "active" : ""}
                onClick={() => activateMode(item.id)}
              >
                <span>{item.icon}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </div>
              </button>
            ))}
          </div>

          <div className="ai-settings-grid">
            <label className="ai-select-label">
              Bahasa Jawaban
              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as "id" | "en")
                }
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
          </div>

          {mode === "english" && (
            <div className="english-ready-card">
              <strong>Maritime English Ready</strong>
              <span>English + Indonesian explanation</span>
              <span>SMCP • Conversation • Grammar • Pronunciation</span>
            </div>
          )}

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
                <strong>
                  {activeMode.icon} {activeMode.title}
                </strong>
                <small>
                  {selectedKnowledge
                    ? `Dokumen aktif: ${selectedKnowledge.title}`
                    : mode === "english"
                      ? "English-first maritime learning mode"
                      : "Terhubung ke Gemini AI"}
                </small>
              </div>
            </div>
            <button onClick={clearChat}>Chat Baru</button>
          </header>

          <div className="professional-messages">
            {messages.map((message) => (
              <article
                className={`professional-message ${message.role}`}
                key={message.id}
              >
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
                    <button
                      className="speak-answer"
                      onClick={() => speak(message)}
                    >
                      {speakingId === message.id
                        ? "🔊 Sedang dibacakan"
                        : mode === "english"
                          ? "🔈 Listen"
                          : "🔈 Baca jawaban"}
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
                  {mode === "english"
                    ? "Preparing your Maritime English lesson..."
                    : "AI sedang menyusun jawaban terbaik..."}
                </div>
              </article>
            )}
            <div ref={endRef} />
          </div>

          <form className="professional-composer" onSubmit={submit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                mode === "english"
                  ? "Type your Maritime English question or sentence..."
                  : `Tulis pertanyaan untuk ${activeMode.title}...`
              }
              rows={3}
            />
            <div>
              <button
                type="button"
                className={listening ? "voice-active" : ""}
                onClick={startVoiceInput}
              >
                {listening
                  ? "🎙️ Mendengarkan..."
                  : mode === "english"
                    ? "🎤 Speak"
                    : "🎤 Bicara"}
              </button>
              <button type="submit" disabled={loading || !input.trim()}>
                {loading
                  ? "Memproses..."
                  : mode === "english"
                    ? "Send →"
                    : "Kirim →"}
              </button>
            </div>
          </form>
          {notice && <p className="ai-notice">{notice}</p>}
        </section>
      </section>
    </PortalLayout>
  );
}
