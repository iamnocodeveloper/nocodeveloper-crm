"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/client";
import { siguienteSeguro } from "@/lib/oauth-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * El formulario de entrada. K7: en el SaaS, a quien llega por primera vez se
 * le dice arriba y claro que puede crear la cuenta de su negocio gratis.
 */
export function LoginForm({ saas = false, diasPrueba = 0 }: { saas?: boolean; diasPrueba?: number }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn.email({ email, password });
    setLoading(false);
    if (err) {
      setError(
        err.status === 429
          ? "Demasiados intentos. Espera unos minutos."
          : "Correo o contraseña incorrectos."
      );
      return;
    }
    // 069 — Si el login lo pidió el OAuth del MCP, se vuelve a su pantalla de
    // consentimiento (solo rutas propias de `/oauth/`: no es un redireccionador).
    const next = siguienteSeguro(new URLSearchParams(window.location.search).get("next") ?? undefined);
    if (next) {
      window.location.assign(next);
      return;
    }
    // A la raíz, no a la Bandeja: ahí se decide si toca la guía de inicio
    // (#86) o la Bandeja de siempre.
    router.push("/");
    router.refresh();
  }

  return (
    <>
    {saas && (
      <div className="mb-5 rounded-xl border border-brand/30 bg-brand-tint p-4 text-center">
        <p className="text-[15px] font-semibold text-brand-text">¿Aún no tienes cuenta?</p>
        <p className="mt-1 text-[13px] leading-snug text-text-2">
          Crea la de tu negocio en un minuto.
          {diasPrueba > 0 ? ` ${diasPrueba} días gratis, sin tarjeta.` : " Sin tarjeta."}
        </p>
        <Link
          href="/register"
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Crear mi cuenta gratis
        </Link>
      </div>
    )}
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Primera vez aquí?{" "}
            <Link href="/register" className="text-primary hover:underline">
              {saas ? "Crea tu cuenta gratis" : "Crear la cuenta inicial"}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
    </>
  );
}
