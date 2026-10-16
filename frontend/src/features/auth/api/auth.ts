// Llamadas al backend del módulo de autenticación
import { apiClient } from "../../../shared/api/client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiClient<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export interface UserProfile {
  id: number;
  email: string;
  tenant_id: number | null;
  role: string;
  currency: string | null;
  timezone: string | null;
}

export function getProfile(): Promise<UserProfile> {
  return apiClient<UserProfile>("/auth/me");
}
