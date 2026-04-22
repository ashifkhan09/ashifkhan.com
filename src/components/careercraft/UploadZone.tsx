import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { analyzeResume, createSession } from "../../lib/careercraft/api";
import { extractResumeText } from "../../lib/careercraft/pdf-parser";

type Phase = "idle" | "parsing" | "analyzing" | "creating" | "error";

export default function UploadZone() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [gapCount, setGapCount] = useState(0);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave() { setIsDragging(false); }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  }

  function validateAndSetFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(ext ?? "")) {
      setError("Only PDF and DOCX files are supported.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleSubmit() {
    if (!file || !targetRole.trim()) return;

    try {
      setPhase("parsing");
      const resumeText = await extractResumeText(file);

      setPhase("analyzing");
      const gaps = await analyzeResume(resumeText, targetRole.trim());
      setGapCount(gaps.length);

      setPhase("creating");
      const { sessionId } = await createSession(resumeText, targetRole.trim(), gaps);

      window.location.href = `/careercraft/session?id=${sessionId}`;
    } catch (err) {
      setError((err as Error).message ?? "Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  const canSubmit = !!file && targetRole.trim().length > 0 && phase === "idle";

  return (
    <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
      {/* Upload zone */}
      <div
        onClick={() => phase === "idle" && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? "var(--accent)" : file ? "var(--accent)" : "var(--border-med)"}`,
          borderRadius: 12,
          padding: "2.5rem 2rem",
          textAlign: "center",
          cursor: phase === "idle" ? "pointer" : "default",
          background: isDragging ? "var(--accent-faint)" : file ? "var(--accent-faint)" : "var(--paper)",
          transition: "all 0.2s",
          marginBottom: "1.25rem",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          style={{ display: "none" }}
          disabled={phase !== "idle"}
        />
        {file ? (
          <>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📄</div>
            <p style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "0.25rem" }}>
              {file.name}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>
              {(file.size / 1024).toFixed(0)} KB · click to change
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>↑</div>
            <p style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "0.25rem" }}>
              Drop your resume here
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>
              PDF or DOCX · max 5 MB
            </p>
          </>
        )}
      </div>

      {/* Role input */}
      <div style={{ marginBottom: "1.25rem" }}>
        <input
          type="text"
          placeholder='What role are you targeting? e.g. "Senior PM at an AdTech startup"'
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          disabled={phase !== "idle"}
          style={{
            width: "100%",
            padding: "0.875rem 1rem",
            border: "1px solid var(--border-med)",
            borderRadius: 8,
            fontSize: "0.9375rem",
            fontFamily: "var(--sans)",
            color: "var(--ink)",
            background: "var(--paper)",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-med)")}
        />
      </div>

      {/* Status / progress */}
      {phase === "parsing" && <StatusLine text="Reading your resume..." />}
      {phase === "analyzing" && <StatusLine text="Analyzing for gaps..." />}
      {phase === "creating" && (
        <StatusLine text={`Found ${gapCount} areas to strengthen. Setting up your interview...`} accent />
      )}

      {/* Error */}
      {(phase === "error" || error) && (
        <p style={{ color: "#c0392b", fontSize: "0.875rem", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: "100%",
          padding: "0.875rem",
          background: canSubmit ? "var(--accent)" : "var(--border-med)",
          color: "var(--paper)",
          border: "none",
          borderRadius: 8,
          fontSize: "1rem",
          fontWeight: 500,
          fontFamily: "var(--sans)",
          cursor: canSubmit ? "pointer" : "not-allowed",
          transition: "background 0.2s",
          marginBottom: "1.25rem",
        }}
      >
        {phase === "idle" || phase === "error" ? "Analyze my resume →" : "Working…"}
      </button>

      {/* Privacy note */}
      <p style={{ fontSize: "0.75rem", color: "var(--ink-faint)", textAlign: "center", lineHeight: 1.5 }}>
        Your resume is processed by an AI model and deleted after 24 hours.
        We don't store personal data.
      </p>
    </div>
  );
}

function StatusLine({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.625rem",
      marginBottom: "1rem",
      fontSize: "0.875rem",
      color: accent ? "var(--accent)" : "var(--ink-light)",
      fontWeight: accent ? 500 : 400,
    }}>
      <Spinner />
      {text}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 14,
      height: 14,
      border: "2px solid var(--border-med)",
      borderTopColor: "var(--accent)",
      borderRadius: "50%",
      animation: "cc-spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}
