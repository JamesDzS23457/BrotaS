// Cliente de API: agrega el token JWT en cada petición y normaliza los errores.
import { API_URL } from "../config";

const TOKEN_KEY = "brotas_token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Content-Type", "application/json");

  // El token JWT viaja en cada petición
  const token = getToken();
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let mensaje = "Ocurrió un error. Inténtalo de nuevo.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) mensaje = data.detail;
    } catch {
      // La respuesta no traía JSON; se usa el mensaje genérico
    }
    throw new ApiError(mensaje, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
