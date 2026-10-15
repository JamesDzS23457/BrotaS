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
