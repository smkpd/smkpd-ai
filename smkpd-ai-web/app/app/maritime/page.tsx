"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import RichText from "../components/RichText";
import {
  createId,
  loadArray,
  loadSession,
  saveArray,
  UsageLog,
} from "../lib/client";
import { dbGetAll, dbPutOne } from "../lib/database";

type Tab = "library" | "tour" | "bridge" | "engine" | "smcp" | "cbt";

type LibraryItem = {
  id: string;
  title: string;
  category: string;
  level: string;
  description: string;
};

type CbtQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

const defaultLibrary: LibraryItem[] = [
  {
    id: "lib-1",
    title: "Dasar-Dasar Nautika Kapal Niaga",
    category: "Nautika",
    level: "Dasar",
    description: "Navigasi, bagian kapal, dinas jaga, dan keselamatan.",
  },
  {
    id: "lib-2",
    title: "Dasar-Dasar Teknika Kapal Niaga",
    category: "Teknika",
    level: "Dasar",
    description: "Mesin induk, pesawat bantu, sistem kapal, dan perawatan.",
  },
  {
    id: "lib-3",
    title: "Maritime English & SMCP",
    category: "Maritime English",
    level: "Dasar–Menengah",
    description: "Komunikasi standar, conversation, dan vocabulary.",
  },
  {
    id: "lib-4",
    title: "SOLAS dan Keselamatan Kapal",
    category: "Keselamatan",
    level: "Menengah",
    description: "Peralatan keselamatan, prosedur darurat, dan latihan.",
  },
];

const shipStations = [
  {
    title: "Bridge / Anjungan",
    icon: "🧭",
    description: "Pusat navigasi dan pengendalian kapal.",
    equipment: "Radar, ECDIS, GPS, gyro compass, magnetic compass, engine telegraph.",
  },
  {
    title: "Main Deck",
    icon: "⚓",
    description: "Area operasi deck, mooring, dan cargo handling.",
    equipment: "Windlass, capstan, bollard, fairlead, hatch cover, crane.",
  },
  {
    title: "Engine Room",
    icon: "⚙️",
    description: "Pusat penggerak dan sistem teknis kapal.",
    equipment: "Main engine, generator, boiler, purifier, pumps, compressors.",
  },
  {
    title: "Cargo Area",
    icon: "📦",
    description: "Area penanganan dan pengamanan muatan.",
    equipment: "Cargo hold/tank, manifold, crane, lashing equipment.",
  },
  {
    title: "Safety Station",
    icon: "🛟",
    description: "Peralatan keselamatan dan keadaan darurat.",
    equipment: "Lifeboat, liferaft, fire station, emergency equipment.",
  },
];

const bridgeScenarios = [
  {
    title: "Steady Course",
    prompt: "Kapal berlayar pada haluan 090°. Perintah kemudi untuk mempertahankan haluan?",
    choices: ["Steady as she goes", "Hard-a-port", "Stop engine"],
    answer: "Steady as she goes",
  },
  {
    title: "Alter Course",
    prompt: "Kapal diminta mengubah haluan dari 090° ke 120°. Tindakan dasar?",
    choices: ["Starboard the helm", "Port the helm", "Full astern"],
    answer: "Starboard the helm",
  },
  {
    title: "Close-Quarters",
    prompt: "Risiko tubrukan meningkat dan diperlukan pengurangan kecepatan.",
    choices: ["Reduce speed / stop engine", "Increase speed", "Ignore target"],
    answer: "Reduce speed / stop engine",
  },
];

const engineScenarios = [
  {
    title: "Low Lube Oil Pressure",
    prompt: "Tekanan minyak lumas main engine turun.",
    choices: [
      "Kurangi beban, periksa level/kebocoran/filter",
      "Naikkan putaran mesin",
      "Abaikan alarm",
    ],
    answer: "Kurangi beban, periksa level/kebocoran/filter",
  },
  {
    title: "High Cooling Water Temperature",
    prompt: "Suhu air pendingin meningkat.",
    choices: [
      "Periksa pompa, level, valve, dan cooler",
      "Tutup seluruh valve",
      "Naikkan beban",
    ],
    answer: "Periksa pompa, level, valve, dan cooler",
  },
  {
    title: "Generator Overload",
    prompt: "Generator menunjukkan beban berlebih.",
    choices: [
      "Kurangi beban dan siapkan generator paralel",
      "Tambahkan beban",
      "Matikan seluruh sistem tanpa koordinasi",
    ],
    answer: "Kurangi beban dan siapkan generator paralel",
  },
];

const smcpPhrases = [
  {
    category: "Helm Orders",
    english: "Starboard ten.",
    meaning: "Kemudi kanan sepuluh derajat.",
    response: "Starboard ten, Sir.",
  },
  {
    category: "Helm Orders",
    english: "Steady as she goes.",
    meaning: "Pertahankan haluan kapal saat ini.",
    response: "Steady as she goes, Sir.",
  },
  {
    category: "Engine Orders",
    english: "Dead slow ahead.",
    meaning: "Mesin maju sangat pelan.",
    response: "Dead slow ahead, Sir.",
  },
  {
    category: "Mooring",
    english: "Heave in the forward spring.",
    meaning: "Hebob/tarik spring depan.",
    response: "Heaving in the forward spring.",
  },
  {
    category: "Emergency",
    english: "Man overboard on starboard side!",
    meaning: "Orang jatuh ke laut di sisi kanan!",
    response: "Man overboard on starboard side!",
  },
];

function extractJson(value: string) {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("[");
    const last = cleaned.lastIndexOf("]");
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error("Format soal dari AI belum dapat dibaca.");
  }
}

export default function MaritimePage() {
  const [tab, setTab] = useState<Tab>("tour");
  const [library, setLibrary] = useState<LibraryItem[]>(defaultLibrary);
  const [selectedStation, setSelectedStation] = useState(shipStations[0]);
  const [bridgeScore, setBridgeScore] = useState(0);
  const [engineScore, setEngineScore] = useState(0);
  const [smcpIndex, setSmcpIndex] = useState(0);
  const [smcpPractice, setSmcpPractice] = useState("");
  const [cbtTopic, setCbtTopic] = useState("Keselamatan kerja di atas kapal");
  const [cbtCount, setCbtCount] = useState("5");
  const [cbtQuestions, setCbtQuestions] = useState<CbtQuestion[]>([]);
  const [cbtAnswers, setCbtAnswers] = useState<Record<number, string>>({});
  const [cbtResult, setCbtResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    dbGetAll("library").then((saved: any[]) => {
      if (saved.length) {
        setLibrary(saved.map((item) => ({
          id: item.id,
          title: item.judul,
          category: item.kategori,
          level: item.tingkat,
          description: item.deskripsi,
        })));
      }
    });
  }, []);

  function addLibraryItem() {
    const title = window.prompt("Judul materi/perpustakaan:");
    if (!title) return;
    const category = window.prompt("Kategori:", "Nautika") || "Maritim";
    const description =
      window.prompt("Deskripsi singkat:", "Materi pembelajaran maritim.") || "";
    const item: LibraryItem = {
      id: createId(),
      title,
      category,
      level: "Umum",
      description,
    };
    const next = [item, ...library];
    setLibrary(next);
    dbPutOne("library", {
      id: item.id,
      kode: item.id,
      judul: item.title,
      kategori: item.category,
      tingkat: item.level,
      deskripsi: item.description,
      sumber_url: "",
      status: "Aktif",
    });
  }

  function answerScenario(
    scenario: typeof bridgeScenarios[number],
    choice: string,
    type: "bridge" | "engine"
  ) {
    const correct = choice === scenario.answer;
    if (type === "bridge" && correct) setBridgeScore((value) => value + 1);
    if (type === "engine" && correct) setEngineScore((value) => value + 1);
    setNotice(
      correct
        ? "Jawaban benar. Lanjutkan ke skenario berikutnya."
        : `Belum tepat. Jawaban aman: ${scenario.answer}`
    );
  }

  async function generateCbt(event: FormEvent) {
    event.preventDefault();
    const session = loadSession();
    if (!session) return;
    setLoading(true);
    setNotice("");
    setCbtResult(null);

    const prompt = `
Buat ${cbtCount} soal pilihan ganda A-E untuk Bank Soal CBT SMK Pelayaran.
Topik: ${cbtTopic}
Gunakan Bahasa Indonesia.
Kembalikan HANYA JSON array valid tanpa pagar kode:
[
  {
    "question": "teks soal",
    "options": ["A. ...", "B. ...", "C. ...", "D. ...", "E. ..."],
    "answer": "A",
    "explanation": "pembahasan"
  }
]
Pastikan tepat satu jawaban benar dan sesuai tingkat SMK.
`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "soal",
          role: session.role,
          language: "id",
          message: prompt,
          history: [{ role: "user", text: prompt }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Soal belum berhasil dibuat.");
      const questions = extractJson(String(data.text || ""));
      const validQuestions = Array.isArray(questions) ? questions : [];
      setCbtQuestions(validQuestions);
      setCbtAnswers({});
      for (let index = 0; index < validQuestions.length; index += 1) {
        const question = validQuestions[index];
        await dbPutOne("question_bank", {
          id: createId(),
          kode: `AI-${Date.now()}-${index + 1}`,
          mata_pelajaran: "Maritim",
          topik: cbtTopic,
          kelas: "SMK",
          jenis: "Pilihan Ganda",
          soal: question.question,
          opsi_a: question.options?.[0] || "",
          opsi_b: question.options?.[1] || "",
          opsi_c: question.options?.[2] || "",
          opsi_d: question.options?.[3] || "",
          opsi_e: question.options?.[4] || "",
          jawaban: question.answer,
          pembahasan: question.explanation,
          tingkat_kesulitan: "Campuran",
        });
      }
      setNotice("Bank Soal CBT berhasil dibuat dan disimpan ke database.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Terjadi kendala.");
    } finally {
      setLoading(false);
    }
  }

  function finishCbt() {
    let correct = 0;
    cbtQuestions.forEach((question, index) => {
      if (cbtAnswers[index] === question.answer) correct += 1;
    });
    const score = cbtQuestions.length
      ? Math.round((correct / cbtQuestions.length) * 100)
      : 0;
    setCbtResult(score);

    const session = loadSession();
    if (session) {
      const log: UsageLog = {
        id: createId(),
        type: "document",
        mode: "cbt",
        title: `CBT ${cbtTopic} — Nilai ${score}`,
        role: session.role,
        createdAt: new Date().toISOString(),
      };
      saveArray(
        "smkpd_ai_logs",
        [log, ...loadArray<UsageLog>("smkpd_ai_logs")],
        200
      );
    }
  }

  return (
    <PortalLayout
      title="Simulator Maritim"
      subtitle="Virtual Ship Tour, Bridge Simulator, Engine Room Simulator, dan latihan SMCP."
    >
      <div className="module-tabs">
        {[
          ["tour", "🚢 Virtual Ship Tour"],
          ["bridge", "⚓ Bridge Simulator"],
          ["engine", "🔧 Engine Simulator"],
          ["smcp", "📻 Latihan SMCP"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id as Tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "library" && (
        <section className="module-card">
          <div className="module-card-header">
            <div>
              <p className="suite-eyebrow">PERPUSTAKAAN AI MARITIM</p>
              <h2>Materi Maritim Terpadu</h2>
            </div>
            <button onClick={addLibraryItem}>+ Tambah Materi</button>
          </div>
          <div className="library-grid">
            {library.map((item) => (
              <article key={item.id}>
                <span>📘</span>
                <small>{item.category} • {item.level}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <a href={`/ai?mode=${item.category === "Teknika" ? "teknika" : item.category === "Maritime English" ? "english" : "nautika"}`}>
                  Pelajari dengan AI →
                </a>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "tour" && (
        <section className="virtual-tour-layout">
          <div className="ship-map-card">
            <p className="suite-eyebrow">VIRTUAL SHIP TOUR</p>
            <h2>Jelajahi Bagian Kapal</h2>
            <div className="ship-silhouette">
              <div className="ship-body">🚢</div>
              {shipStations.map((station, index) => (
                <button
                  key={station.title}
                  className={selectedStation.title === station.title ? "active" : ""}
                  style={{ left: `${12 + index * 18}%`, top: `${28 + (index % 2) * 28}%` }}
                  onClick={() => setSelectedStation(station)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
          <article className="station-detail-card">
            <span>{selectedStation.icon}</span>
            <p className="suite-eyebrow">STATION DETAIL</p>
            <h2>{selectedStation.title}</h2>
            <p>{selectedStation.description}</p>
            <strong>Peralatan utama</strong>
            <p>{selectedStation.equipment}</p>
            <a href="/ai?mode=nautika">Tanyakan ke AI Maritim →</a>
          </article>
        </section>
      )}

      {tab === "bridge" && (
        <section className="simulator-card">
          <div className="simulator-screen bridge-screen">
            <div className="simulator-horizon" />
            <div className="simulator-heading">HDG 090° • SPD 8.5 kn</div>
            <div className="simulator-wheel">☸</div>
          </div>
          <div className="simulator-panel">
            <p className="suite-eyebrow">BRIDGE SIMULATOR DASAR</p>
            <h2>Latihan Keputusan Anjungan</h2>
            <strong>Skor benar: {bridgeScore}</strong>
            {bridgeScenarios.map((scenario) => (
              <article key={scenario.title}>
                <h3>{scenario.title}</h3>
                <p>{scenario.prompt}</p>
                <div>
                  {scenario.choices.map((choice) => (
                    <button
                      key={choice}
                      onClick={() => answerScenario(scenario, choice, "bridge")}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "engine" && (
        <section className="simulator-card">
          <div className="simulator-screen engine-screen">
            <div className="engine-gauges">
              <span>LO 3.8 bar</span>
              <span>CW 78°C</span>
              <span>RPM 420</span>
              <span>LOAD 65%</span>
            </div>
            <div className="engine-icon">⚙️</div>
          </div>
          <div className="simulator-panel">
            <p className="suite-eyebrow">ENGINE ROOM SIMULATOR DASAR</p>
            <h2>Latihan Alarm dan Troubleshooting</h2>
            <strong>Skor benar: {engineScore}</strong>
            {engineScenarios.map((scenario) => (
              <article key={scenario.title}>
                <h3>{scenario.title}</h3>
                <p>{scenario.prompt}</p>
                <div>
                  {scenario.choices.map((choice) => (
                    <button
                      key={choice}
                      onClick={() => answerScenario(scenario, choice, "engine")}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "smcp" && (
        <section className="smcp-layout">
          <article className="smcp-card">
            <p className="suite-eyebrow">SMCP PRACTICE</p>
            <span>{smcpPhrases[smcpIndex].category}</span>
            <h2>{smcpPhrases[smcpIndex].english}</h2>
            <p>{smcpPhrases[smcpIndex].meaning}</p>
            <strong>Expected response</strong>
            <p>{smcpPhrases[smcpIndex].response}</p>
            <div>
              <button
                onClick={() =>
                  setSmcpIndex((value) =>
                    value === 0 ? smcpPhrases.length - 1 : value - 1
                  )
                }
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() =>
                  setSmcpIndex((value) => (value + 1) % smcpPhrases.length)
                }
              >
                Berikutnya →
              </button>
            </div>
          </article>
          <article className="smcp-practice-card">
            <h2>Latihan Respons</h2>
            <p>Tuliskan atau ucapkan respons standar untuk perintah di samping.</p>
            <textarea
              rows={6}
              value={smcpPractice}
              onChange={(event) => setSmcpPractice(event.target.value)}
              placeholder="Type your response..."
            />
            <button
              onClick={() =>
                setNotice(
                  smcpPractice.trim().toLowerCase() ===
                    smcpPhrases[smcpIndex].response.toLowerCase()
                    ? "Respons tepat."
                    : `Coba gunakan: ${smcpPhrases[smcpIndex].response}`
                )
              }
            >
              Periksa Respons
            </button>
            <a href="/ai?mode=english">Latihan dengan Maritime English AI →</a>
          </article>
        </section>
      )}

      {tab === "cbt" && (
        <section className="cbt-layout">
          <form className="cbt-generator-card" onSubmit={generateCbt}>
            <p className="suite-eyebrow">AI CBT GENERATOR</p>
            <h2>Buat Bank Soal Otomatis</h2>
            <label>
              Materi / Topik
              <input
                value={cbtTopic}
                onChange={(event) => setCbtTopic(event.target.value)}
              />
            </label>
            <label>
              Jumlah Soal
              <input
                type="number"
                min="3"
                max="20"
                value={cbtCount}
                onChange={(event) => setCbtCount(event.target.value)}
              />
            </label>
            <button disabled={loading}>
              {loading ? "AI membuat soal..." : "Buat CBT"}
            </button>
          </form>

          <section className="cbt-question-card">
            <div className="module-card-header">
              <div>
                <p className="suite-eyebrow">CBT PREVIEW</p>
                <h2>{cbtQuestions.length} Soal</h2>
              </div>
              {cbtResult !== null && <strong>Nilai: {cbtResult}</strong>}
            </div>

            {cbtQuestions.map((question, index) => (
              <article key={`${question.question}-${index}`}>
                <h3>{index + 1}. {question.question}</h3>
                <div>
                  {question.options.map((option) => {
                    const letter = option.trim().charAt(0).toUpperCase();
                    return (
                      <label key={option}>
                        <input
                          type="radio"
                          name={`question-${index}`}
                          checked={cbtAnswers[index] === letter}
                          onChange={() =>
                            setCbtAnswers({ ...cbtAnswers, [index]: letter })
                          }
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
                {cbtResult !== null && (
                  <p className="cbt-explanation">
                    Jawaban: {question.answer}. {question.explanation}
                  </p>
                )}
              </article>
            ))}

            {cbtQuestions.length > 0 && (
              <button className="finish-cbt" onClick={finishCbt}>
                Selesaikan CBT
              </button>
            )}
          </section>
        </section>
      )}

      {notice && <p className="module-notice">{notice}</p>}
    </PortalLayout>
  );
}
