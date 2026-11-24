import { notFound } from "next/navigation";
import { WoocommerceClient } from "@/components/settings/woocommerce-client";
import { apiV1Enabled } from "@/server/api-v1/flag";

export const dynamic = "force-dynamic";

export default function WoocommerceSettingsPage() {
  // K6 — La tienda habla por la API v1: sin ella no hay a dónde mandar pedidos.
  if (!apiV1Enabled()) notFound();
  return <WoocommerceClient />;
}
