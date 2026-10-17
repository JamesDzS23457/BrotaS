// Llamadas al backend: productos, categorías, fotos y stock
import { ApiError, apiClient, getToken } from "../../../shared/api/client";
import { API_URL } from "../../../shared/config";

export interface Category {
  id: number;
  tenant_id: number;
  name: string;
  is_active: boolean;
}

export interface Product {
  id: number;
  tenant_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  min_stock: number;
  image_url: string | null;
  is_published: boolean;
  is_active: boolean;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  quantity_change: number;
  reason: string;
  created_at: string;
  stock_after: number;
}

export interface ProductForm {
  name: string;
  description?: string | null;
  price: string;
  category_id?: number | null;
  min_stock?: number;
  image_url?: string | null;
  is_published?: boolean;
}

function query(params: Record<string, string | number | undefined>): string {
  const limpios = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== "") limpios.set(clave, String(valor));
  }
  const texto = limpios.toString();
  return texto ? `?${texto}` : "";
}

export function listProducts(opciones: {
  search?: string;
  category_id?: number;
  page?: number;
  page_size?: number;
}): Promise<ProductPage> {
  return apiClient<ProductPage>(`/florist/products${query(opciones)}`);
}

// Productos activos con stock menor o igual a su mínimo (sin paginar)
export function listLowStock(): Promise<Product[]> {
  return apiClient<Product[]>("/florist/products/low-stock");
}

export function listCategories(): Promise<Category[]> {
  return apiClient<Category[]>("/florist/categories");
}

export function createProduct(data: ProductForm): Promise<Product> {
  return apiClient<Product>("/florist/products", { method: "POST", body: data });
}

export function updateProduct(id: number, data: Partial<ProductForm>): Promise<Product> {
  return apiClient<Product>(`/florist/products/${id}`, { method: "PATCH", body: data });
}

export function moveStock(id: number, change: number, reason: string): Promise<StockMovement> {
  return apiClient<StockMovement>(`/florist/products/${id}/stock`, {
    method: "POST",
    body: { change, reason },
  });
}

// La subida va con FormData: no usa apiClient (que siempre manda JSON)
export async function uploadProductImage(id: number, file: File): Promise<Product> {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const response = await fetch(`${API_URL}/florist/products/${id}/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!response.ok) {
    let mensaje = "No se pudo subir la foto. Inténtalo de nuevo.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) mensaje = data.detail;
    } catch {
      // La respuesta no traía JSON; se usa el mensaje genérico
    }
    throw new ApiError(mensaje, response.status);
  }
  return (await response.json()) as Product;
}
