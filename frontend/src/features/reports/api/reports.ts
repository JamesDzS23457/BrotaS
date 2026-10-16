// Llamadas al backend: reporte del día
import { apiClient } from "../../../shared/api/client";
import type { Product } from "../../products/api/products";

export interface TopProduct {
  product_id: number;
  name: string;
  quantity: number;
  revenue: string;
}

export interface DailyReport {
  date: string;
  total_sold: string;
  sales_count: number;
  top_products: TopProduct[];
  low_stock: Product[];
}

export function getDailyReport(fechaISO: string): Promise<DailyReport> {
  return apiClient<DailyReport>(`/florist/reports/daily?date=${encodeURIComponent(fechaISO)}`);
}

// Hoy en la zona horaria del local (el backend entiende los días en esa zona)
export function hoyEnZona(zonaHoraria = "America/Bogota"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: zonaHoraria,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
}
