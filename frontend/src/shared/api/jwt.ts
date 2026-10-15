// Lectura del contenido de un JWT (para conocer usuario, local y rol sin llamar al backend).
export interface JwtPayload {
  user_id: number;
  tenant_id: number | null;
  role: string;
  exp: number;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const parte = token.split(".")[1];
    if (!parte) return null;
    const base64 = parte.replace(/-/g, "+").replace(/_/g, "/");
    const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(base64 + relleno)) as JwtPayload;
  } catch {
    return null;
  }
}
