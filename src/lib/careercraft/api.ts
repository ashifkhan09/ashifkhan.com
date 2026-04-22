// All calls from the Astro site go through this file.
// BASE switches automatically between local dev and production.

const BASE =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ??
  "https://api.ashifkhan.com";

export interface Gap {
  section: string;
  bulletText: string;
  issue: "missing_metric" | "weak_language" | "responsibility_not_impact";
  extractionQuestion: string;
}

export interface Fact {
  claim: string;
  confirmedBy: "user";
  relatedGap: string;
}

export interface Session {
  id: string;
  phase: "upload" | "analysis" | "interview" | "review" | "generate" | "done";
  targetRole: string;
  gaps: Gap[];
  gapIndex: number;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  factLedger: Fact[];
  generatedResume: string;
  linkedinUpdate: string;
  siteContent: string;
}

export interface AtsBreakdown {
  bulletCount: number;
  metricBulletCount: number;
  metricRatio: number;
  hasImpactVerbs: boolean;
  weakVerbsFound: string[];
  hasSummary: boolean;
  hasExperience: boolean;
}

export interface AtsScore {
  score: number;
  suggestions: string[];
  breakdown: AtsBreakdown;
}

// Wraps fetch with an AbortController timeout.
// Default: 15 s for quick endpoints, longer for generation.
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 15_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(
        `Request timed out after ${timeoutMs / 1000}s. ` +
          "Check that the CareerCraft API is running and reachable."
      );
    }
    // Network error (connection refused, DNS failure, etc.)
    throw new Error(
      "Could not reach the CareerCraft API. " +
        "If you're running locally, make sure `wrangler dev` is running in the careercraft-api folder."
    );
  } finally {
    clearTimeout(timer);
  }
}

async function post<T>(
  path: string,
  body: unknown,
  timeoutMs = 15_000
): Promise<T> {
  const res = await fetchWithTimeout(
    `${BASE}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function analyzeResume(
  resumeText: string,
  targetRole: string
): Promise<Gap[]> {
  return post("/analyze", { resumeText, targetRole }, 30_000);
}

export async function createSession(
  resumeText: string,
  targetRole: string,
  gaps: Gap[]
): Promise<{ sessionId: string; firstQuestion: string; totalGaps: number }> {
  return post("/session", { resumeText, targetRole, gaps }, 20_000);
}

export async function getSession(sessionId: string): Promise<Session> {
  const res = await fetchWithTimeout(
    `${BASE}/session/${sessionId}`,
    { method: "GET" },
    12_000
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error("Session not found or expired.");
    throw new Error(`Failed to load session (HTTP ${res.status}).`);
  }
  return res.json();
}

export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<{
  reply: string;
  confirmedFact?: Fact;
  gapIndex: number;
  totalGaps: number;
  done: boolean;
}> {
  return post("/chat", { sessionId, message }, 30_000);
}

export async function skipGap(sessionId: string): Promise<{
  reply: string;
  gapIndex: number;
  totalGaps: number;
  done: boolean;
}> {
  return post("/chat/skip", { sessionId }, 15_000);
}

export async function generateOutputs(sessionId: string): Promise<{
  resume: string;
  linkedin: string;
  siteContent: string;
  atsScore: AtsScore;
  originalAtsScore: AtsScore | null;
}> {
  // Generation hits the LLM for 3 full sections — give it 90 s
  return post("/generate", { sessionId }, 90_000);
}
