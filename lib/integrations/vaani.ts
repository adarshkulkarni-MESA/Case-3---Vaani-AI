/**
 * VaaniVoice.ai integration
 * Handles incoming webhook payloads from VaaniVoice after a call completes.
 *
 * VaaniVoice.ai docs: https://docs.vaanivoice.ai
 * Webhook authentication: HMAC-SHA256 signature in X-Vaani-Signature header
 */

import crypto from "crypto";

export interface VaaniCallPayload {
  call_id: string;
  event_type: "call.completed" | "call.started" | "call.missed";
  timestamp: string;
  caller_number: string;
  caller_name?: string;
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  transcript_segments?: TranscriptSegment[];
  extracted_data?: ExtractedData;
  cost_usd?: number;
}

export interface TranscriptSegment {
  speaker: "ai" | "caller";
  text: string;
  start_ms: number;
  end_ms: number;
}

export interface ExtractedData {
  name?: string;
  phone?: string;
  location?: string;
  project_type?: string;
  property_type?: string;
  square_feet?: number;
  project_scope?: string;
  timeline?: string;
  budget_mentioned?: string;
  is_decision_maker?: boolean;
  decision_maker_note?: string;
  asked_about_price?: boolean;
  ai_summary?: string;
  is_escalation?: boolean;
  escalation_note?: string;
}

/**
 * Verify webhook signature from VaaniVoice.ai
 */
export function verifyVaaniSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

/**
 * VaaniVoice system prompt configuration for Aangan Studio.
 * This is sent to VaaniVoice to configure the AI agent's behavior.
 */
export const VAANI_SYSTEM_PROMPT = `You are the AI receptionist for Aangan Studio, a premium interior design firm in Pune, India.

## Your Role
You answer calls to Aangan Studio 24/7 and qualify incoming enquiries. Your tone is warm, professional, and concise — like a well-trained front desk person at a boutique studio.

## Studio Overview
Aangan Studio provides end-to-end interior design for homes and small offices in Pune and PCMC. We handle full design and execution — not advice only.

## What You Must Collect
1. Caller's name
2. Location/area of the project (city area)
3. Type of property (2BHK, 3BHK, villa, office, etc.)
4. Approximate size in square feet (if they know)
5. What work they want done (full home, kitchen, specific rooms, etc.)
6. Desired timeline or move-in date
7. Whether they are the decision-maker or representing someone who is

## Qualification Logic
An enquiry is worth forwarding to a designer when:
1. It is a REAL project (design + execution — not just advice or consultation)
2. The location is in Pune city or PCMC
3. The timeline allows at least 8-10 weeks from consultation
4. Budget is not obviously misaligned (only flag if they volunteer a very low number)
5. The caller can make the decision or is authorised to

If a criterion is unclear, ask ONE direct question. If 2 or more criteria fail, decline politely.

## CRITICAL PRICING RULE — NEVER BREAK THIS
If a caller asks about price, cost, rate, or how much it costs:
→ You MUST respond ONLY with: "Pricing depends on the site, the materials you choose, and the scope — your designer will walk you through it in detail at the consultation. I can book that for you right now if you'd like."
→ NEVER give any number, range, estimate, or approximation
→ NEVER say "around", "roughly", "typically", "starts at"
→ Flag this call as "asked_about_price": true

## Existing Client Complaints / Escalations
If a caller is an existing client with an active project complaint:
→ Say: "I'm going to make sure a senior person from our team calls you back within 15 minutes. Can I confirm the best number to reach you?"
→ Flag as "is_escalation": true
→ Do NOT try to resolve their complaint

## Service Area
We serve Pune city and PCMC. We do NOT serve Nashik, Mumbai, Talegaon, Lonavala, or other cities.

## What We Don't Do
- Architecture or structural work
- Decor/styling only (no execution)
- Standalone furniture sourcing
- Restaurants, hotels, gyms, retail stores
- Projects outside Pune/PCMC

## Closing the Call
- Qualified: Book a consultation slot or offer to have the designer confirm availability
- Not qualified: "This sounds like it may not be the right fit for us right now — but feel free to reach out if your timeline or scope changes."
- Missed info: Ask one clarifying question before deciding

Keep responses concise. Speak naturally. Do not repeat questions already answered.`;
