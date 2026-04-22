import { useState, useEffect, useRef } from "react";
import { getSession, sendChatMessage, skipGap } from "../../lib/careercraft/api";
import type { Fact, Session } from "../../lib/careercraft/api";

// Phrases that signal the user wants to exit the interview
const WRAP_UP_TRIGGERS = [
  "wrap up", "wrap it up", "i'm done", "im done", "done answering",
  "skip to output", "skip the rest", "let's generate", "lets generate",
  "just generate", "enough questions", "ready to generate", "take me to output",
  "move to output", "that's enough", "thats enough", "skip remaining",
];

function isWrapUpIntent(msg: string): boolean {
  const lower = msg.toLowerCase().trim();
  // Only treat short messages as wrap-up intent — avoids false positives on long answers
  if (msg.trim().length > 80) return false;
  return WRAP_UP_TRIGGERS.some((t) => lower.includes(t));
}

export default function ChatWindow() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [gapIndex, setGapIndex] = useState(0);
  const [totalGaps, setTotalGaps] = useState(0);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  // Tracks consecutive turns without a new confirmed fact — triggers "Skip this?" nudge
  const [turnsSinceConfirm, setTurnsSinceConfirm] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setError("No session ID found. Please start over."); return; }
    setSessionId(id);

    getSession(id)
      .then((s) => {
        setSession(s);
        setMessages(s.conversationHistory);
        setFacts(s.factLedger);
        setGapIndex(s.gapIndex);
        setTotalGaps(s.gaps.length);
        if (s.phase === "review" || s.phase === "done") setIsDone(true);
      })
      .catch(() => setError("Session not found or expired. Please start over."));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function goToOutput() {
    window.location.href = `/careercraft/output?id=${sessionId}`;
  }

  async function handleSend() {
    if (!input.trim() || isLoading || isDone) return;
    const userMsg = input.trim();

    // Detect wrap-up intent before sending — navigate immediately
    if (isWrapUpIntent(userMsg)) {
      goToOutput();
      return;
    }

    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setIsLoading(true);
    setError("");

    try {
      const res = await sendChatMessage(sessionId, userMsg);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setGapIndex(res.gapIndex);
      setTotalGaps(res.totalGaps);

      if (res.confirmedFact) {
        setFacts((f) => [...f, res.confirmedFact!]);
        setTurnsSinceConfirm(0); // reset counter on new fact
      } else {
        setTurnsSinceConfirm((n) => n + 1);
      }

      if (res.done) setIsDone(true);
    } catch (err) {
      setError((err as Error).message ?? "Something went wrong. Please try again.");
      setMessages((m) => m.slice(0, -1));
      setInput(userMsg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSkip() {
    if (isSkipping || isLoading || isDone) return;
    setIsSkipping(true);
    setError("");
    setTurnsSinceConfirm(0);

    try {
      const res = await skipGap(sessionId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setGapIndex(res.gapIndex);
      setTotalGaps(res.totalGaps);
      if (res.done) setIsDone(true);
    } catch (err) {
      setError((err as Error).message ?? "Couldn't skip. Please try again.");
    } finally {
      setIsSkipping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const progress = totalGaps > 0 ? (gapIndex / totalGaps) * 100 : 0;
  const showSkipNudge = turnsSinceConfirm >= 2 && !isDone && !isLoading;
  const showWrapUp = facts.length >= 1 && !isDone;

  if (error && !session) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <p style={{ color: "var(--ink-light)", marginBottom: "1.5rem" }}>{error}</p>
        <a href="/careercraft" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
          ← Start over
        </a>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <Spinner size={24} />
        <p style={{ color: "var(--ink-faint)", marginTop: "1rem", fontSize: "0.875rem" }}>
          Loading your session…
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - var(--nav-h))",
      maxWidth: 720, margin: "0 auto", padding: "0 1.25rem",
    }}>

      {/* ── Progress bar ── */}
      <div style={{ paddingTop: "1.5rem", paddingBottom: "1rem", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{
            fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--accent)",
          }}>
            Interview
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>
              {isDone ? "All gaps covered ✓" : `${gapIndex} of ${totalGaps} gaps covered`}
            </span>
            {showWrapUp && (
              <button
                onClick={goToOutput}
                style={{
                  background: "none", border: "1px solid rgba(200,80,26,0.4)",
                  color: "var(--accent)", borderRadius: 100, padding: "0.2rem 0.7rem",
                  fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                  fontFamily: "var(--sans)", transition: "background 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-faint)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                Wrap up →
              </button>
            )}
          </div>
        </div>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${isDone ? 100 : progress}%`,
            background: "var(--accent)", borderRadius: 2,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "0.5rem" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            marginBottom: "0.875rem",
          }}>
            <div style={{
              maxWidth: "80%",
              padding: "0.75rem 1rem",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: msg.role === "user" ? "var(--accent)" : "var(--paper-warm)",
              color: msg.role === "user" ? "var(--paper)" : "var(--ink)",
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
              whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {(isLoading || isSkipping) && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "0.875rem" }}>
            <div style={{
              padding: "0.75rem 1rem",
              borderRadius: "12px 12px 12px 2px",
              background: "var(--paper-warm)",
              border: "1px solid var(--border)",
              display: "flex", gap: "4px", alignItems: "center",
            }}>
              <TypingDot delay={0} /><TypingDot delay={0.15} /><TypingDot delay={0.3} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Confirmed fact chips ── */}
      {facts.length > 0 && (
        <div style={{ paddingTop: "0.5rem", paddingBottom: "0.75rem", flexShrink: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {facts.map((f, i) => (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                background: "#eafaf1", color: "#1a7a45",
                border: "1px solid #a7dfbc", borderRadius: 100,
                padding: "0.25rem 0.65rem",
                fontSize: "0.75rem", fontWeight: 500, lineHeight: 1.4,
              }}>
                <span>✓</span>
                <span style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.claim}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom area ── */}
      <div style={{ paddingBottom: "1.5rem", flexShrink: 0 }}>
        {isDone ? (
          /* Done state — big CTA */
          <a
            href={`/careercraft/output?id=${sessionId}`}
            style={{
              display: "block", textAlign: "center",
              background: "var(--accent)", color: "var(--paper)",
              padding: "0.9375rem", borderRadius: 8,
              textDecoration: "none", fontWeight: 500, fontSize: "1rem",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Review your facts and generate →
          </a>
        ) : (
          <>
            {error && (
              <p style={{ color: "#c0392b", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{error}</p>
            )}

            {/* "Skip this question" nudge — appears after 2 stuck turns */}
            {showSkipNudge && (
              <div style={{ marginBottom: "0.625rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>
                  Don't have this number handy?
                </span>
                <button
                  onClick={handleSkip}
                  style={{
                    background: "none", border: "none", padding: 0,
                    color: "var(--accent)", fontSize: "0.8rem", fontWeight: 500,
                    cursor: "pointer", fontFamily: "var(--sans)",
                    textDecoration: "underline", textUnderlineOffset: "2px",
                  }}
                >
                  Skip this question →
                </button>
              </div>
            )}

            {/* Input row */}
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer… (Enter to send)"
                disabled={isLoading || isSkipping}
                rows={2}
                style={{
                  flex: 1, padding: "0.75rem 1rem",
                  border: "1px solid var(--border-med)", borderRadius: 8,
                  fontSize: "0.9375rem", fontFamily: "var(--sans)",
                  color: "var(--ink)", background: "var(--paper)",
                  resize: "none", outline: "none", lineHeight: 1.5,
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-med)")}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isSkipping}
                style={{
                  padding: "0 1.25rem",
                  background: input.trim() && !isLoading && !isSkipping ? "var(--accent)" : "var(--border-med)",
                  color: "var(--paper)", border: "none", borderRadius: 8,
                  fontSize: "0.875rem", fontWeight: 500, fontFamily: "var(--sans)",
                  cursor: input.trim() && !isLoading && !isSkipping ? "pointer" : "not-allowed",
                  flexShrink: 0, transition: "background 0.2s",
                }}
              >
                Send
              </button>
            </div>

            {/* Hint when no facts yet */}
            {facts.length === 0 && (
              <p style={{ fontSize: "0.75rem", color: "var(--ink-faint)", marginTop: "0.625rem", textAlign: "center" }}>
                Answer a few questions — a "Wrap up →" button appears as soon as your first fact is confirmed.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--border-med)`,
      borderTopColor: "var(--accent)",
      borderRadius: "50%",
      animation: "cc-spin 0.7s linear infinite",
      display: "inline-block",
    }} />
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <div style={{
      width: 6, height: 6, borderRadius: "50%",
      background: "var(--ink-faint)",
      animation: `cc-bounce 1.2s ${delay}s ease-in-out infinite`,
    }} />
  );
}
