// Llamadas al backend: registrar ventas
import { apiClient } from "../../../shared/api/client";

export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
];

export interface SaleItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: string;
}

export interface Sale {
  id: number;
  tenant_id: number;
  user_id: number;
  total: string;
  payment_method: string | null;
  created_at: string;
  items: SaleItem[];
}

export function createSale(items: { product_id: number; quantity: number }[], paymentMethod: PaymentMethod): Promise<Sale> {
  return apiClient<Sale>("/sales", {
    method: "POST",
    body: { items, payment_method: paymentMethod },
  });
}
