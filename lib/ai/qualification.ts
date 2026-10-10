/**
 * Lead qualification engine based on Nikhil's 5 criteria:
 * 1. Real project (design + execution — not just advice)
 * 2. In service area (Pune city or PCMC)
 * 3. Realistic timeline (site available within 8-10 weeks)
 * 4. Right budget band (flag obvious misalignments only)
 * 5. Decision-maker on the call or represented
 */

export interface QualificationInput {
  projectScope?: string;
  projectLocation?: string;
  timeline?: string;
  budgetMentioned?: string;
  isDecisionMaker?: boolean;
  decisionMakerNote?: string;
  squareFeet?: number;
  projectType?: string;
}

export interface QualificationCriteria {
  real_project: boolean | null;
  in_area: boolean | null;
  timeline: boolean | null;
  budget: boolean | null;
  decision_maker: boolean | null;
}

export interface QualificationResult {
  status: "qualified" | "rejected" | "pending_review";
  outcome:
    | "qualified"
    | "rejected_out_of_area"
    | "rejected_out_of_scope"
    | "rejected_timeline"
    | "rejected_budget"
    | "rejected_no_decision_maker"
    | "pending_review";
  criteria: QualificationCriteria;
  notes: string;
  rejectionReason?: string;
}

const PUNE_AREAS = [
  "pune",
  "kothrud",
  "baner",
  "aundh",
  "wakad",
  "koregaon park",
  "kalyani nagar",
  "viman nagar",
  "hadapsar",
  "magarpatta",
  "nibm",
  "kondhwa",
  "undri",
  "shivane",
  "warje",
  "erandwane",
  "deccan",
  "pimpri",
  "chinchwad",
  "pimple saudagar",
  "pimple nilakh",
  "ravet",
  "hinjewadi",
  "pcmc",
  "kharadi",
  "bund garden",
  "boat club",
  "camp",
  "shivajinagar",
  "model colony",
  "bavdhan",
  "sus",
  "pashan",
  "nanded city",
  "wanowrie",
  "mundhwa",
];

const OUT_OF_AREA = ["nashik", "mumbai", "talegaon", "lonavala", "delhi", "bangalore", "pune outskirts"];

const ADVICE_ONLY_SIGNALS = [
  "just looking for ideas",
  "just advice",
  "second opinion",
  "i'll do the execution",
  "just colours",
  "just furniture",
  "vastu only",
  "just rearrange",
  "just consult",
];

const SCOPE_OUT_SIGNALS = [
  "restaurant",
  "hotel",
  "gym",
  "retail",
  "hospital",
  "school",
  "mall",
];

const BUDGET_MISMATCH_PATTERNS: { pattern: RegExp; maxLakhs: number }[] = [
  { pattern: /(\d+)\s*(?:to|[-–])\s*(\d+)\s*(?:lakh|lac)/i, maxLakhs: 2 },
  { pattern: /(\d+)\s*(?:lakh|lac)/i, maxLakhs: 1.5 },
  { pattern: /₹\s*(\d+),?000/i, maxLakhs: 0.5 },
];

function checkInArea(location?: string): boolean | null {
  if (!location) return null;
  const loc = location.toLowerCase();
  if (OUT_OF_AREA.some((o) => loc.includes(o))) return false;
  if (PUNE_AREAS.some((a) => loc.includes(a))) return true;
  return null;
}

function checkRealProject(scope?: string): boolean | null {
  if (!scope) return null;
  const s = scope.toLowerCase();
  if (ADVICE_ONLY_SIGNALS.some((sig) => s.includes(sig))) return false;
  if (SCOPE_OUT_SIGNALS.some((sig) => s.includes(sig))) return false;
  // Positive signals: full redesign, execution, kitchen, wardrobes, bedroom, living room
  const positiveSignals = ["full", "complete", "redesign", "kitchen", "wardrobe", "bedroom", "living", "execution", "everything", "end-to-end", "office", "floor"];
  if (positiveSignals.some((sig) => s.includes(sig))) return true;
  return null;
}

function checkTimeline(timeline?: string): boolean | null {
  if (!timeline) return null;
  const t = timeline.toLowerCase();
  // Immediate or very short timelines
  const urgentPatterns = [
    /(\d+)\s*week/i,
    /next\s*(week|month)/i,
    /immediately/i,
    /urgent/i,
    /asap/i,
    /diwali/i, // ~3 weeks typically
  ];
  for (const pattern of urgentPatterns) {
    const match = t.match(pattern);
    if (match) {
      const weeks = parseInt(match[1] || "3");
      if (t.includes("week") && weeks < 8) return false;
      if (t.includes("diwali") || t.includes("immediately") || t.includes("asap")) return false;
    }
  }
  // Good timelines
  const goodPatterns = [/november/i, /december/i, /january/i, /february/i, /march/i, /\d+\s*months?/i, /no rush/i, /flexible/i];
  if (goodPatterns.some((p) => p.test(t))) return true;
  return null;
}

function checkBudget(budget?: string, squareFeet?: number): boolean | null {
  if (!budget) return null; // No budget mentioned → treat as qualified per Nikhil's rules
  const b = budget.toLowerCase();

  // Extract mentioned lakh amount
  let mentionedLakhs: number | null = null;
  const match = b.match(/(\d+(?:\.\d+)?)\s*(?:to|[-–])\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
  if (match) {
    mentionedLakhs = parseFloat(match[2]); // Use upper bound
  } else {
    const singleMatch = b.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
    if (singleMatch) {
      mentionedLakhs = parseFloat(singleMatch[1]);
    }
  }

  if (!mentionedLakhs) return null;

  // Obvious misalignment: ₹1-1.5L for a full flat
  if (mentionedLakhs <= 2) return false;
  return true;
}

function checkDecisionMaker(isDecisionMaker?: boolean, note?: string): boolean | null {
  if (isDecisionMaker === true) return true;
  if (isDecisionMaker === false) {
    // "I'm just doing initial research for my in-laws" — not sufficient
    if (note && note.toLowerCase().includes("initial research")) return false;
    // "My spouse wants to do this but they're not available" — fine if authorised
    if (note && (note.toLowerCase().includes("authorised") || note.toLowerCase().includes("authorized") || note.toLowerCase().includes("go ahead"))) return true;
    return null;
  }
  return null;
}

export function qualifyLead(input: QualificationInput): QualificationResult {
  const criteria: QualificationCriteria = {
    real_project: checkRealProject(input.projectScope),
    in_area: checkInArea(input.projectLocation),
    timeline: checkTimeline(input.timeline),
    budget: checkBudget(input.budgetMentioned, input.squareFeet),
    decision_maker: checkDecisionMaker(input.isDecisionMaker, input.decisionMakerNote),
  };

  const notes: string[] = [];

  // Hard failures → reject
  if (criteria.in_area === false) {
    notes.push("Location outside Pune/PCMC service area.");
    return {
      status: "rejected",
      outcome: "rejected_out_of_area",
      criteria,
      notes: notes.join(" "),
      rejectionReason: "Location is outside our service area (Pune/PCMC).",
    };
  }

  if (criteria.real_project === false) {
    notes.push("Project is outside scope — advice only, no execution, or excluded project type.");
    return {
      status: "rejected",
      outcome: "rejected_out_of_scope",
      criteria,
      notes: notes.join(" "),
      rejectionReason: "Project scope doesn't match our services — we require design + execution.",
    };
  }

  if (criteria.timeline === false) {
    notes.push("Timeline too short for our minimum execution period.");
    return {
      status: "rejected",
      outcome: "rejected_timeline",
      criteria,
      notes: notes.join(" "),
      rejectionReason: "Timeline is too short — we cannot begin execution within the required timeframe.",
    };
  }

  if (criteria.budget === false) {
    notes.push("Budget clearly below minimum for stated scope.");
    return {
      status: "rejected",
      outcome: "rejected_budget",
      criteria,
      notes: notes.join(" "),
      rejectionReason: "Budget is significantly below the minimum for the stated scope.",
    };
  }

  // Count unknowns
  const unknowns = Object.values(criteria).filter((v) => v === null).length;

  // Two or more unknowns (or a hard unknown on criteria 1-3) → pending review
  if (unknowns >= 2) {
    notes.push("Insufficient information on multiple criteria — flagged for review.");
    return {
      status: "pending_review",
      outcome: "pending_review",
      criteria,
      notes: notes.join(" "),
    };
  }

  if (criteria.in_area === null) {
    notes.push("Location not confirmed in service area — flagged for review.");
    return {
      status: "pending_review",
      outcome: "pending_review",
      criteria,
      notes: notes.join(" "),
    };
  }

  if (criteria.real_project === null) {
    notes.push("Project scope unclear — flagged for review.");
    return {
      status: "pending_review",
      outcome: "pending_review",
      criteria,
      notes: notes.join(" "),
    };
  }

  // Note uncertainties on criteria 4 and 5 but still qualify
  if (criteria.decision_maker === null) {
    notes.push("Decision-maker status unclear — noted in handoff.");
  }
  if (criteria.budget === null) {
    notes.push("No budget mentioned — designer to confirm at consultation.");
  }
  if (criteria.timeline === null) {
    notes.push("Timeline not specified — designer to confirm.");
  }

  notes.push("Lead passes qualification criteria.");
  return {
    status: "qualified",
    outcome: "qualified",
    criteria,
    notes: notes.join(" "),
  };
}

export function generateHandoffNote(
  customerName: string | null | undefined,
  input: QualificationInput,
  qualification: QualificationResult,
  aiSummary?: string
): string {
  const name = customerName || "Unknown caller";
  const lines: string[] = [
    `# Handoff Note — ${name}`,
    "",
    `**Lead Status:** ${qualification.status.toUpperCase().replace("_", " ")}`,
    "",
    "## Project Details",
    `- **Name:** ${name}`,
    `- **Location:** ${input.projectLocation || "Not specified"}`,
    `- **Property Type:** ${input.projectType || "Not specified"}`,
    `- **Size:** ${input.squareFeet ? `${input.squareFeet} sq ft` : "Not specified"}`,
    `- **Scope:** ${input.projectScope || "Not specified"}`,
    `- **Timeline:** ${input.timeline || "Not specified"}`,
    `- **Budget:** ${input.budgetMentioned || "Not mentioned"}`,
    `- **Decision-maker:** ${input.isDecisionMaker === true ? "Yes" : input.isDecisionMaker === false ? "No — see note" : "Not confirmed"}`,
    input.decisionMakerNote ? `- **Decision-maker note:** ${input.decisionMakerNote}` : "",
    input.askedAboutPrice ? "- **⚠️ Asked about pricing** — standard response given, no numbers disclosed" : "",
    "",
    "## Qualification",
    `- **Real project:** ${formatCriteria(qualification.criteria.real_project)}`,
    `- **In service area:** ${formatCriteria(qualification.criteria.in_area)}`,
    `- **Timeline:** ${formatCriteria(qualification.criteria.timeline)}`,
    `- **Budget:** ${formatCriteria(qualification.criteria.budget)}`,
    `- **Decision-maker:** ${formatCriteria(qualification.criteria.decision_maker)}`,
    "",
    qualification.rejectionReason ? `**Rejection reason:** ${qualification.rejectionReason}` : "",
    "",
    "## Call Summary",
    aiSummary || "No AI summary available.",
    "",
    "## Qualification Notes",
    qualification.notes,
    "",
    `*Generated by Aangan AI · ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}*`,
  ];

  return lines.filter((l) => l !== "").join("\n");
}

function formatCriteria(value: boolean | null): string {
  if (value === true) return "✅ Pass";
  if (value === false) return "❌ Fail";
  return "⚠️ Unclear";
}
