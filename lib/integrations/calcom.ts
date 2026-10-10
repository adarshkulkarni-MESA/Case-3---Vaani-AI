/**
 * Cal.com integration for designer availability and booking links.
 * Uses Cal.com API v2.
 */

const CALCOM_API_BASE = "https://api.cal.com/v2";
const CALCOM_API_KEY = process.env.CALCOM_API_KEY!;

interface CalcomAvailabilitySlot {
  start: string;
  end: string;
}

interface CalcomAvailabilityResponse {
  slots: Record<string, CalcomAvailabilitySlot[]>;
}

interface CalcomUser {
  id: number;
  username: string;
  name: string;
  email: string;
}

interface CalcomEventType {
  id: number;
  slug: string;
  title: string;
  length: number;
}

async function calcomFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${CALCOM_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CALCOM_API_KEY}`,
      "Content-Type": "application/json",
      "cal-api-version": "2024-08-13",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cal.com API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function getDesignerAvailability(
  username: string,
  eventTypeSlug: string,
  startDate: string, // ISO date
  endDate: string // ISO date
): Promise<CalcomAvailabilitySlot[]> {
  try {
    const data = await calcomFetch<{ data: CalcomAvailabilityResponse }>(
      `/slots?username=${username}&eventTypeSlug=${eventTypeSlug}&startTime=${startDate}&endTime=${endDate}`
    );

    const slots = Object.values(data.data?.slots || {}).flat();
    return slots;
  } catch (error) {
    console.error("Error fetching Cal.com availability:", error);
    return [];
  }
}

export function getDesignerBookingLink(
  username: string,
  eventTypeSlug: string = "consultation"
): string {
  return `https://cal.com/${username}/${eventTypeSlug}`;
}

export async function getDesignerEventTypes(username: string): Promise<CalcomEventType[]> {
  try {
    const data = await calcomFetch<{ data: CalcomEventType[] }>(
      `/event-types?username=${username}`
    );
    return data.data || [];
  } catch (error) {
    console.error("Error fetching Cal.com event types:", error);
    return [];
  }
}

/**
 * Verify Cal.com webhook signature
 */
export function verifyCalcomWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require("crypto");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return signature === expected;
}

export interface CalcomBookingPayload {
  triggerEvent: "BOOKING_CREATED" | "BOOKING_RESCHEDULED" | "BOOKING_CANCELLED";
  payload: {
    uid: string;
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    status: "ACCEPTED" | "PENDING" | "CANCELLED";
    attendees: Array<{ name: string; email: string; timeZone: string }>;
    organizer: { name: string; email: string };
    metadata?: Record<string, string>;
  };
}
