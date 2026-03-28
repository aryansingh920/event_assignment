const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface LoginPayload {
  userId: string;
  region: string;
}

export interface LoginResponse {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  prefix: string;
  region: string;
  created_at: string;
}

export interface RegionOption {
  region: string;
}

export interface ApiError {
  error: string;
}

// POST /api/login
export async function apiLogin(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    // Server returned { error: "..." }
    throw new Error((data as ApiError).error || "Login failed");
  }

  return data as LoginResponse;
}

// GET /allAvailableRegions
export async function apiGetRegions(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/api/allAvailableRegions`);

  if (!res.ok) {
    throw new Error("Failed to fetch regions");
  }

  const data: RegionOption[] = await res.json();
  return data.map((r) => r.region);
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  content: string;
  region: string;
  status: "available" | "claimed" | "acknowledged";
  claimed_by: string | null;
  claimed_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

// GET /api/event?region=<region>
export async function apiGetEvents(region: string): Promise<Event[]> {
  const res = await fetch(
    `${BASE_URL}/api/event?region=${encodeURIComponent(region)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

// POST /api/claim  body: { eventId, userId }
export async function apiClaimEvent(
  eventId: string,
  userId: string,
): Promise<{ message: string; eventId: string }> {
  const body = new URLSearchParams({ eventId, userId });
  const res = await fetch(`${BASE_URL}/api/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error("Failed to claim event");
  return res.json();
}

// POST /api/acknowledge  body: { eventId, userId }
export async function apiAcknowledgeEvent(
  eventId: string,
  userId: string,
): Promise<{ message: string; eventId: string }> {
  const body = new URLSearchParams({ eventId, userId });
  const res = await fetch(`${BASE_URL}/api/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error("Failed to acknowledge event");
  return res.json();
}
