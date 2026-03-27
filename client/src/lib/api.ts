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
