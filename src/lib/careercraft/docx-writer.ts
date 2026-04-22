// Client-side only — generates and downloads files in the browser.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Tab,
  TabStopPosition,
  TabStopType,
  UnderlineType,
} from "docx";

// ── Colours ────────────────────────────────────────────────────────────────
const ACCENT   = "1A5276"; // deep navy — professional, ATS-safe
const GRAY     = "666666";
const DARK     = "1A1A1A";
const RULE_CLR = "CCCCCC";

// ── Font sizes (half-points) ───────────────────────────────────────────────
const SZ_NAME    = 40; // 20 pt
const SZ_CONTACT = 18; // 9 pt
const SZ_SECTION = 22; // 11 pt
const SZ_ROLE    = 22; // 11 pt
const SZ_BODY    = 20; // 10 pt

// ── Line detection helpers ─────────────────────────────────────────────────

const DATE_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{4}|\d{4})\b.*?(present|current|\d{4})/i;

function isContactLine(s: string): boolean {
  return /[@+]/.test(s) || /\|\s/.test(s) || /\b(\+\d{1,3}|\d{3}[-.\s]\d{3})/.test(s);
}

function isSectionHeader(s: string): boolean {
  // ALL-CAPS word(s), 3-30 chars, no numbers, no leading hyphen
  return (
    !s.startsWith("-") &&
    s.length >= 3 &&
    s.length <= 40 &&
    s === s.toUpperCase() &&
    /[A-Z]/.test(s) &&
    !/\d/.test(s)
  );
}

function isRoleLine(s: string): boolean {
  return DATE_RE.test(s) && !s.startsWith("-");
}

// ── Paragraph factories ────────────────────────────────────────────────────

function namePara(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: SZ_NAME,
        color: ACCENT,
        font: "Calibri",
      }),
    ],
    spacing: { after: 40 },
    border: {
      bottom: { color: ACCENT, space: 4, style: BorderStyle.SINGLE, size: 8 },
    },
  });
}

function contactPara(text: string): Paragraph {
  // Normalise separators so they display cleanly
  const formatted = text.replace(/\s*[|,]\s*/g, "  ·  ");
  return new Paragraph({
    children: [
      new TextRun({
        text: formatted,
        size: SZ_CONTACT,
        color: GRAY,
        font: "Calibri",
      }),
    ],
    spacing: { before: 40, after: 160 },
  });
}

function sectionHeaderPara(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: SZ_SECTION,
        color: ACCENT,
        font: "Calibri",
        allCaps: true,
      }),
    ],
    spacing: { before: 240, after: 60 },
    border: {
      bottom: { color: RULE_CLR, space: 2, style: BorderStyle.SINGLE, size: 4 },
    },
  });
}

/** A role line may be "Title | Company | Location | Date–Date"
 *  or "Title, Company, Location, Date–Date"
 *  We bold the title and right-align the date. */
function rolePara(text: string): Paragraph {
  // Try to split off trailing date range (after last | or last , before year/present)
  const pipeMatch = text.match(/^(.*?)\s*\|\s*([\d\/].+|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec.*)$/i);
  const dateMatch = text.match(/^(.+?)((?:\d{1,2}\/\d{4}|\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*)$/i);

  // Split role/company from date
  let mainText = text;
  let dateText = "";

  if (pipeMatch) {
    mainText = pipeMatch[1].trim();
    dateText = pipeMatch[2].trim();
  } else if (dateMatch) {
    const candidate = dateMatch[1].trimEnd().replace(/[,\s–\-]+$/, "");
    const date = dateMatch[2].trim();
    if (date.length > 4) {
      mainText = candidate;
      dateText = date;
    }
  }

  const children: TextRun[] = [
    new TextRun({
      text: mainText,
      bold: true,
      size: SZ_ROLE,
      color: DARK,
      font: "Calibri",
    }),
  ];

  if (dateText) {
    children.push(
      new TextRun({
        text: `\t${dateText}`,
        size: SZ_ROLE,
        color: GRAY,
        font: "Calibri",
      })
    );
  }

  return new Paragraph({
    children,
    spacing: { before: 160, after: 60 },
    tabStops: [
      { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
    ],
  });
}

function bulletPara(text: string): Paragraph {
  const content = text.replace(/^-\s*/, "");

  // Split "metric — rest" to bold the metric
  const dashIdx = content.indexOf("—");
  let children: TextRun[];

  if (dashIdx > 0) {
    const metric = content.slice(0, dashIdx).trim();
    const rest   = content.slice(dashIdx + 1).trim();
    children = [
      new TextRun({ text: metric + " — ", bold: true, size: SZ_BODY, color: DARK, font: "Calibri" }),
      new TextRun({ text: rest, size: SZ_BODY, color: DARK, font: "Calibri" }),
    ];
  } else {
    children = [new TextRun({ text: content, size: SZ_BODY, color: DARK, font: "Calibri" })];
  }

  return new Paragraph({
    children,
    bullet: { level: 0 },
    spacing: { after: 60 },
    indent: { left: 360, hanging: 360 },
  });
}

function bodyPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: SZ_BODY, color: DARK, font: "Calibri" })],
    spacing: { after: 80 },
  });
}

function spacerPara(): Paragraph {
  return new Paragraph({ text: "", spacing: { after: 60 } });
}

// ── Main export ────────────────────────────────────────────────────────────

export async function downloadAsDocx(
  resumeText: string,
  filename = "resume.docx"
): Promise<void> {
  if (!resumeText?.trim()) {
    throw new Error("Resume content is empty — please regenerate.");
  }

  const lines = resumeText.split("\n");
  const children: Paragraph[] = [];

  // Track whether we've emitted the name and contact lines
  let nameEmitted    = false;
  let contactEmitted = false;

  for (let i = 0; i < lines.length; i++) {
    const raw     = lines[i];
    const trimmed = raw.trim();

    // Blank line
    if (!trimmed) {
      children.push(spacerPara());
      continue;
    }

    // First non-empty, non-contact line → name
    if (!nameEmitted && !isContactLine(trimmed) && !isSectionHeader(trimmed)) {
      children.push(namePara(trimmed));
      nameEmitted = true;
      continue;
    }

    // Contact line (after name)
    if (nameEmitted && !contactEmitted && isContactLine(trimmed)) {
      children.push(contactPara(trimmed));
      contactEmitted = true;
      continue;
    }

    // Section header
    if (isSectionHeader(trimmed)) {
      children.push(sectionHeaderPara(trimmed));
      continue;
    }

    // Role / position line (contains a date)
    if (isRoleLine(trimmed)) {
      children.push(rolePara(trimmed));
      continue;
    }

    // Bullet
    if (trimmed.startsWith("-")) {
      children.push(bulletPara(trimmed));
      continue;
    }

    // Default: body paragraph (summary text, etc.)
    children.push(bodyPara(trimmed));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: SZ_BODY },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 864, right: 864 }, // 0.6" sides
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadAsMarkdown(content: string, filename: string): void {
  if (!content?.trim()) {
    throw new Error("Content is empty — please regenerate.");
  }
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
