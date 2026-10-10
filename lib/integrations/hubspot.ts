/**
 * HubSpot CRM integration — founder only.
 * Syncs qualified leads after they are processed in our database.
 * Neon PostgreSQL remains the operational source of truth.
 */

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN!;

interface HubSpotContact {
  id?: string;
  properties: {
    firstname?: string;
    lastname?: string;
    phone?: string;
    email?: string;
    city?: string;
    hs_lead_status?: string;
    aangan_lead_status?: string;
    aangan_project_location?: string;
    aangan_project_type?: string;
    aangan_property_type?: string;
    aangan_square_feet?: string;
    aangan_project_scope?: string;
    aangan_timeline?: string;
    aangan_call_summary?: string;
    aangan_call_id?: string;
    aangan_call_timestamp?: string;
    aangan_asked_about_price?: string;
  };
}

interface HubSpotDeal {
  id?: string;
  properties: {
    dealname: string;
    dealstage: string;
    pipeline: string;
    amount?: string;
    closedate?: string;
    description?: string;
    aangan_call_id?: string;
    aangan_lead_status?: string;
    aangan_qualification_notes?: string;
  };
}

async function hubspotFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function findContactByPhone(phone: string): Promise<HubSpotContact | null> {
  try {
    const data = await hubspotFetch<{ results: HubSpotContact[] }>(
      `/crm/v3/objects/contacts/search`,
      {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                { propertyName: "phone", operator: "EQ", value: phone },
              ],
            },
          ],
          properties: ["firstname", "lastname", "phone", "email"],
          limit: 1,
        }),
      }
    );

    return data.results?.[0] || null;
  } catch {
    return null;
  }
}

export async function upsertContact(contact: HubSpotContact): Promise<HubSpotContact> {
  const phone = contact.properties.phone;

  if (phone) {
    const existing = await findContactByPhone(phone);
    if (existing?.id) {
      // Update existing contact
      const updated = await hubspotFetch<HubSpotContact>(
        `/crm/v3/objects/contacts/${existing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ properties: contact.properties }),
        }
      );
      return { ...updated, id: existing.id };
    }
  }

  // Create new contact
  const created = await hubspotFetch<HubSpotContact>("/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties: contact.properties }),
  });

  return created;
}

export async function createDeal(deal: HubSpotDeal, contactId: string): Promise<HubSpotDeal> {
  const created = await hubspotFetch<HubSpotDeal>("/crm/v3/objects/deals", {
    method: "POST",
    body: JSON.stringify({ properties: deal.properties }),
  });

  if (created.id) {
    // Associate deal with contact
    await hubspotFetch(
      `/crm/v3/objects/deals/${created.id}/associations/contacts/${contactId}/3`,
      { method: "PUT" }
    );
  }

  return created;
}

export interface SyncCallToHubSpotInput {
  callId: string;
  callerName?: string | null;
  callerPhone?: string | null;
  callerEmail?: string | null;
  projectLocation?: string | null;
  projectType?: string | null;
  propertyType?: string | null;
  squareFeet?: number | null;
  projectScope?: string | null;
  timeline?: string | null;
  leadStatus: string;
  aiSummary?: string | null;
  callTimestamp: Date;
  askedAboutPrice: boolean;
  qualificationNotes?: string | null;
}

export async function syncCallToHubSpot(input: SyncCallToHubSpotInput) {
  const nameParts = (input.callerName || "").split(" ");
  const firstname = nameParts[0] || "";
  const lastname = nameParts.slice(1).join(" ") || "";

  const contactProperties: HubSpotContact["properties"] = {
    firstname,
    lastname,
    phone: input.callerPhone || undefined,
    city: input.projectLocation || undefined,
    aangan_lead_status: input.leadStatus,
    aangan_project_location: input.projectLocation || undefined,
    aangan_project_type: mapProjectType(input.projectType),
    aangan_property_type: input.propertyType || undefined,
    aangan_square_feet: input.squareFeet?.toString(),
    aangan_project_scope: input.projectScope || undefined,
    aangan_timeline: input.timeline || undefined,
    aangan_call_summary: input.aiSummary || undefined,
    aangan_call_id: input.callId,
    aangan_call_timestamp: input.callTimestamp.toISOString(),
    aangan_asked_about_price: input.askedAboutPrice ? "true" : "false",
    hs_lead_status: mapLeadStatusToHubSpot(input.leadStatus),
  };

  const contact = await upsertContact({ properties: contactProperties });

  // Create a deal for qualified leads
  let dealId: string | undefined;
  if (input.leadStatus === "qualified" && contact.id) {
    const deal = await createDeal(
      {
        properties: {
          dealname: `${input.callerName || "Unknown"} — ${input.propertyType || "Interior Design"} — ${new Date(input.callTimestamp).getFullYear()}`,
          dealstage: "appointmentscheduled",
          pipeline: "default",
          description: input.aiSummary || input.qualificationNotes || "",
          aangan_call_id: input.callId,
          aangan_lead_status: input.leadStatus,
          aangan_qualification_notes: input.qualificationNotes || undefined,
        },
      },
      contact.id
    );
    dealId = deal.id;
  }

  return { contactId: contact.id, dealId };
}

function mapProjectType(projectType?: string | null): string {
  if (!projectType) return "Residential";
  const lower = projectType.toLowerCase();
  if (lower.includes("commercial") || lower.includes("office") || lower.includes("restaurant") || lower.includes("shop") || lower.includes("retail")) {
    return "Commercial";
  }
  return "Residential";
}

function mapLeadStatusToHubSpot(status: string): string {
  switch (status) {
    case "qualified":
      return "IN_PROGRESS";
    case "rejected":
      return "UNQUALIFIED";
    case "pending_review":
      return "NEW";
    default:
      return "NEW";
  }
}
