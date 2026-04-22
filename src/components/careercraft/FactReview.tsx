import { useState, useEffect } from "react";
import { getSession, generateOutputs } from "../../lib/careercraft/api";
import type { Fact, AtsScore } from "../../lib/careercraft/api";
import { downloadAsDocx, downloadAsMarkdown } from "../../lib/careercraft/docx-writer";

type Phase = "loading" | "review" | "generating" | "done" | "error";

interface Output {
  resume: string;
  linkedin: string;
  siteContent: string;
  atsScore: AtsScore;
  originalAtsScore: AtsScore | null;
}

export default function FactReview() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState("");
  const [facts, setFacts] = useState<Fact[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newFact, setNewFact] = useState("");
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setError("No session ID found in the URL. Please start a new session."); setPhase("error"); return; }
    setSessionId(id);

    // Safety-net: if the fetch neither resolves nor rejects in 16 s, show an error.
    const safetyTimer = setTimeout(() => {
      setError(
        "The API is not responding. If you're running locally, make sure `wrangler dev` is running in the careercraft-api folder."
      );
      setPhase("error");
    }, 16_000);

    getSession(id)
      .then((s) => {
        clearTimeout(safetyTimer);
        setFacts(s.factLedger ?? []);
        if (s.phase === "done" && s.generatedResume) {
          setOutput({
            resume: s.generatedResume,
            linkedin: s.linkedinUpdate,
            siteContent: s.siteContent,
            atsScore: { score: 0, suggestions: [], breakdown: { bulletCount: 0, metricBulletCount: 0, metricRatio: 0, hasImpactVerbs: true, weakVerbsFound: [], hasSummary: true, hasExperience: true } },
            originalAtsScore: null,
          });
          setPhase("done");
        } else {
          setPhase("review");
        }
      })
      .catch((err: Error) => {
        clearTimeout(safetyTimer);
        setError(err.message ?? "Session not found or expired.");
        setPhase("error");
      });

    return () => clearTimeout(safetyTimer);
  }, []);

  function startEdit(i: number) {
    setEditingIndex(i);
    setEditValue(facts[i].claim);
  }

  function saveEdit() {
    if (editingIndex === null) return;
    setFacts((f) => f.map((fact, i) => i === editingIndex ? { ...fact, claim: editValue.trim() } : fact));
    setEditingIndex(null);
  }

  function removeFact(i: number) {
    setFacts((f) => f.filter((_, idx) => idx !== i));
  }

  function addFact() {
    if (!newFact.trim()) return;
    setFacts((f) => [...f, { claim: newFact.trim(), confirmedBy: "user", relatedGap: "manual" }]);
    setNewFact("");
  }

  async function handleGenerate() {
    setPhase("generating");
    setError("");
    try {
      const result = await generateOutputs(sessionId);
      setOutput({ ...result, originalAtsScore: result.originalAtsScore ?? null });
      setPhase("done");
    } catch (err) {
      setError((err as Error).message ?? "Generation failed. Please try again.");
      setPhase("review");
    }
  }

  if (phase === "loading") return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <Spinner />
      <p style={{ color: "var(--ink-faint)", marginTop: "1rem", fontSize: "0.875rem" }}>
        Loading your session…
      </p>
      <p style={{ color: "var(--ink-faint)", marginTop: "0.5rem", fontSize: "0.78rem" }}>
        Connecting to <code style={{ fontFamily: "monospace" }}>{typeof window !== "undefined" ? (import.meta.env.PUBLIC_API_URL ?? "api.ashifkhan.com") : ""}</code>
      </p>
    </div>
  );

  if (phase === "error") return (
    <div style={{ maxWidth: 480, margin: "4rem auto", padding: "0 2rem", textAlign: "center" }}>
      <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</p>
      <p style={{ color: "var(--ink)", fontWeight: 500, marginBottom: "0.75rem", fontSize: "1rem" }}>
        Couldn't load your session
      </p>
      <p style={{ color: "var(--ink-light)", marginBottom: "1.5rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
        {error}
      </p>
      <div style={{
        background: "var(--paper-warm)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.5rem",
        textAlign: "left", fontSize: "0.82rem", color: "var(--ink-light)", lineHeight: 1.7,
      }}>
        <strong style={{ color: "var(--ink)" }}>Running locally?</strong><br />
        Make sure the API is running:<br />
        <code style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--accent)" }}>
          cd careercraft-api &amp;&amp; npx wrangler dev
        </code>
      </div>
      <a href="/careercraft" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
        ← Start a new session
      </a>
    </div>
  );

  if (phase === "done" && output) {
    return <OutputPanel output={output} />;
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem" }}>
        Review
      </p>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: "0.75rem", lineHeight: 1.15 }}>
        Here's what I learned about your work
      </h1>
      <p style={{ color: "var(--ink-light)", fontSize: "0.9375rem", marginBottom: "2rem", fontWeight: 300 }}>
        Edit or remove any fact before generating. Everything below goes into your resume.
      </p>

      {/* Fact list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.5rem" }}>
        {facts.map((fact, i) => (
          <div key={i} style={{
            padding: "0.875rem 1rem",
            background: "var(--paper-warm)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}>
            {editingIndex === i ? (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  style={{
                    flex: 1, padding: "0.5rem 0.75rem", border: "1px solid var(--accent)",
                    borderRadius: 6, fontSize: "0.875rem", fontFamily: "var(--sans)",
                    color: "var(--ink)", background: "var(--paper)", outline: "none",
                  }}
                />
                <button onClick={saveEdit} style={smallBtn("var(--accent)")}>Save</button>
                <button onClick={() => setEditingIndex(null)} style={smallBtn("var(--border-med)", "var(--ink-light)")}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <span style={{ color: "#1a7a45", fontWeight: 600, marginTop: 1 }}>✓</span>
                <span style={{ flex: 1, fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.5 }}>{fact.claim}</span>
                <button onClick={() => startEdit(i)} style={iconBtn()}>Edit</button>
                <button onClick={() => removeFact(i)} style={iconBtn("#c0392b")}>✕</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add fact */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        <input
          value={newFact}
          onChange={(e) => setNewFact(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFact()}
          placeholder="Add a fact you forgot to mention..."
          style={{
            flex: 1, padding: "0.75rem 1rem", border: "1px solid var(--border-med)",
            borderRadius: 8, fontSize: "0.875rem", fontFamily: "var(--sans)",
            color: "var(--ink)", background: "var(--paper)", outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-med)")}
        />
        <button onClick={addFact} disabled={!newFact.trim()} style={smallBtn(newFact.trim() ? "var(--accent)" : "var(--border-med)")}>
          Add
        </button>
      </div>

      {error && <p style={{ color: "#c0392b", fontSize: "0.875rem", marginBottom: "1rem" }}>{error}</p>}

      {/* Generate CTA */}
      <button
        onClick={handleGenerate}
        disabled={facts.length === 0 || phase === "generating"}
        style={{
          width: "100%", padding: "0.9375rem", background: facts.length > 0 ? "var(--accent)" : "var(--border-med)",
          color: "var(--paper)", border: "none", borderRadius: 8, fontSize: "1rem",
          fontWeight: 500, fontFamily: "var(--sans)", cursor: facts.length > 0 ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
      >
        {phase === "generating" ? "Generating your resume…" : "Generate my resume →"}
      </button>
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#1a7a45" : score >= 65 ? "var(--accent)" : "#c0392b";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "var(--serif)", fontSize: "2.25rem", fontWeight: 700,
        color, lineHeight: 1,
      }}>{score}</div>
      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-faint)", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function AtsPanel({ atsScore, originalAtsScore }: { atsScore: AtsScore; originalAtsScore: AtsScore | null }) {
  if (atsScore.score === 0) return null;

  const improvement = originalAtsScore ? atsScore.score - originalAtsScore.score : null;
  const bd = atsScore.breakdown;
  const origBd = originalAtsScore?.breakdown;

  const metricPct     = Math.round(bd.metricRatio * 100);
  const origMetricPct = origBd ? Math.round(origBd.metricRatio * 100) : null;

  // Checks shown as green ✓ or amber →
  const checks: { label: string; ok: boolean; detail?: string }[] = [
    {
      label: `${metricPct}% of bullets have measurable results`,
      ok: bd.metricRatio >= 0.7,
      detail: origMetricPct !== null && origMetricPct !== metricPct
        ? `was ${origMetricPct}% before`
        : undefined,
    },
    {
      label: "Strong action verbs throughout",
      ok: bd.hasImpactVerbs,
    },
    {
      label: "No weak or passive verbs",
      ok: bd.weakVerbsFound.length === 0,
      detail: bd.weakVerbsFound.length > 0
        ? `still contains: ${bd.weakVerbsFound.slice(0, 2).map((v) => `"${v}"`).join(", ")}`
        : origBd && origBd.weakVerbsFound.length > 0
          ? `removed: ${origBd.weakVerbsFound.slice(0, 2).map((v) => `"${v}"`).join(", ")}`
          : undefined,
    },
    {
      label: "Summary and Experience sections present",
      ok: bd.hasSummary && bd.hasExperience,
    },
  ];

  return (
    <div style={{
      background: "var(--paper-warm)", border: "1px solid var(--border)",
      borderRadius: 12, marginBottom: "1.5rem", overflow: "hidden",
    }}>
      {/* Score row */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1.25rem",
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid var(--border)",
      }}>
        {originalAtsScore && (
          <>
            <ScoreRing score={originalAtsScore.score} label="Before" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
              <div style={{ height: 2, width: "100%", background: "var(--border)", borderRadius: 1, position: "relative" }}>
                <div style={{
                  position: "absolute", right: 0, top: "50%",
                  transform: "translateY(-50%)",
                  width: 0, height: 0,
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: "7px solid var(--accent)",
                }} />
              </div>
              {improvement !== null && (
                <span style={{
                  fontSize: "0.75rem", fontWeight: 600,
                  color: improvement > 0 ? "#1a7a45" : "var(--ink-faint)",
                }}>
                  {improvement > 0 ? `+${improvement} improvement` : "no change"}
                </span>
              )}
            </div>
          </>
        )}
        <ScoreRing score={atsScore.score} label={originalAtsScore ? "After" : "ATS Score"} />
        {!originalAtsScore && (
          <div style={{ flex: 1, fontSize: "0.82rem", color: "var(--ink-light)", lineHeight: 1.5 }}>
            This score estimates how well your resume will pass automated screening before a recruiter sees it.
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div style={{ padding: "1rem 1.5rem" }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
          Readiness breakdown
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {checks.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", flexShrink: 0, marginTop: 1, color: c.ok ? "#1a7a45" : "#c0392b" }}>
                {c.ok ? "✓" : "✗"}
              </span>
              <div>
                <span style={{ fontSize: "0.82rem", color: c.ok ? "var(--ink)" : "var(--ink-light)" }}>
                  {c.label}
                </span>
                {c.detail && (
                  <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)", marginLeft: "0.375rem" }}>
                    ({c.detail})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        {atsScore.suggestions.length > 0 && (
          <>
            <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.5rem" }}>
              To push it higher
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {atsScore.suggestions.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0, fontSize: "0.85rem", marginTop: 1 }}>→</span>
                  <p style={{ fontSize: "0.82rem", color: "var(--ink-light)", lineHeight: 1.5, margin: 0 }}>{s}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OutputPanel({ output }: { output: Output }) {
  const [copied, setCopied] = useState(false);

  function shareLink() {
    navigator.clipboard.writeText("https://ashifkhan.com/careercraft");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem" }}>
        Done
      </p>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: "0.75rem", lineHeight: 1.15 }}>
        Your resume is ready
      </h1>
      <p style={{ color: "var(--ink-light)", fontSize: "0.9375rem", marginBottom: "2rem", fontWeight: 300 }}>
        Download all three files. The resume opens in Word and Google Docs.
      </p>

      <AtsPanel atsScore={output.atsScore} originalAtsScore={output.originalAtsScore} />

      {/* Downloads */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <DownloadBtn
          label="↓ Resume.docx"
          sub="Opens in Word & Google Docs"
          onClick={() => downloadAsDocx(output.resume, "resume.docx")}
          primary
        />
        <DownloadBtn
          label="↓ LinkedIn_update.md"
          sub="Full About section + role summaries with metrics"
          onClick={() => { downloadAsMarkdown(output.linkedin, "linkedin_update.md"); }}
        />
        <DownloadBtn
          label="↓ Site_content.md"
          sub="Hero stats, about copy, experience bullets per role"
          onClick={() => { downloadAsMarkdown(output.siteContent, "site_content.md"); }}
        />
      </div>

      {/* Share */}
      <button
        onClick={shareLink}
        style={{
          width: "100%", padding: "0.75rem", background: "transparent",
          color: "var(--ink-light)", border: "1px solid var(--border-med)",
          borderRadius: 8, fontSize: "0.875rem", fontFamily: "var(--sans)",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        {copied ? "Link copied!" : "Share this tool →"}
      </button>
    </div>
  );
}

function DownloadBtn({
  label, sub, onClick, primary,
}: {
  label: string;
  sub: string;
  onClick: () => Promise<void> | void;
  primary?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [dlError, setDlError] = useState("");

  async function handle() {
    if (busy) return;
    setBusy(true);
    setDlError("");
    try {
      await onClick();
    } catch (e) {
      setDlError((e as Error).message ?? "Download failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={handle}
        disabled={busy}
        style={{
          width: "100%", padding: "1rem 1.25rem", textAlign: "left",
          background: primary ? "var(--accent)" : "var(--paper-warm)",
          color: primary ? "var(--paper)" : "var(--ink)",
          border: primary ? "none" : "1px solid var(--border)",
          borderRadius: 8, cursor: busy ? "wait" : "pointer",
          fontFamily: "var(--sans)", transition: "opacity 0.2s",
          opacity: busy ? 0.7 : 1,
        }}
        onMouseEnter={(e) => !busy && (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => !busy && (e.currentTarget.style.opacity = busy ? "0.7" : "1")}
      >
        <div style={{ fontWeight: 500, fontSize: "0.9375rem", marginBottom: "0.2rem" }}>
          {busy ? "Preparing…" : label}
        </div>
        <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{sub}</div>
      </button>
      {dlError && (
        <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.375rem", paddingLeft: "0.25rem" }}>
          {dlError}
        </p>
      )}
    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────
function smallBtn(bg: string, color = "var(--paper)"): React.CSSProperties {
  return {
    padding: "0.4rem 0.875rem", background: bg, color, border: "none",
    borderRadius: 6, fontSize: "0.8rem", fontFamily: "var(--sans)",
    cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 0.15s",
  };
}

function iconBtn(color = "var(--ink-faint)"): React.CSSProperties {
  return {
    background: "none", border: "none", color, fontSize: "0.8rem",
    cursor: "pointer", padding: "0 0.25rem", flexShrink: 0,
    fontFamily: "var(--sans)",
  };
}

function Spinner() {
  return (
    <div style={{
      width: 24, height: 24, border: "2px solid var(--border-med)",
      borderTopColor: "var(--accent)", borderRadius: "50%",
      animation: "cc-spin 0.7s linear infinite", display: "inline-block",
    }} />
  );
}
