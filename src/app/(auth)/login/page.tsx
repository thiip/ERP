"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou senha inválidos");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F0EDE8]">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-[#141414] p-12 rounded-r-[2.5rem] relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/3 rounded-full blur-3xl" />

        <div className="max-w-md space-y-8 relative z-10 flex flex-col items-center text-center">
          <div className="space-y-4 flex flex-col items-center">
            <img src="/projectum-erp/logo-branco.png" alt="Projectum" className="h-32 w-auto mb-6 brightness-[1.3] contrast-[1.1]" />
            <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-green-400/40 to-transparent rounded-full" />
          </div>
          <p className="text-lg text-white/45 leading-relaxed">
            Sistema integrado de gestão para decorações de Natal.
            CRM, estoque, produção e financeiro em um só lugar.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-5 backdrop-blur-sm transition-all hover:bg-white/[0.07] hover:border-white/[0.1]">
              <p className="text-lg font-semibold text-white">CRM</p>
              <p className="text-sm text-white/35 mt-1">Pipeline de vendas</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-5 backdrop-blur-sm transition-all hover:bg-white/[0.07] hover:border-white/[0.1]">
              <p className="text-lg font-semibold text-white">Estoque</p>
              <p className="text-sm text-white/35 mt-1">Controle de materiais</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-5 backdrop-blur-sm transition-all hover:bg-white/[0.07] hover:border-white/[0.1]">
              <p className="text-lg font-semibold text-white">Produção</p>
              <p className="text-sm text-white/35 mt-1">Fila unificada</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-5 backdrop-blur-sm transition-all hover:bg-white/[0.07] hover:border-white/[0.1]">
              <p className="text-lg font-semibold text-white">Financeiro</p>
              <p className="text-sm text-white/35 mt-1">Faturas e despesas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="login-form-panel flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden mb-4">
            <img src="/projectum-erp/logo-verde.png" alt="Projectum" className="h-14 w-auto" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
              Entrar na sua conta
            </h2>
            <p className="text-sm text-[#6b7280]">
              Insira suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                required
                className="h-11 rounded-xl glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="h-11 rounded-xl glass-input"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 text-center">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-medium bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] transition-colors"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
