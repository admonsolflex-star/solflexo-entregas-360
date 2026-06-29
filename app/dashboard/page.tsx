"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";

type Perfil = {
  nombre: string | null;
  rol: string | null;
};

type DashboardCounts = {
  remisionesCapturadas: number;
  viajesProgramados: number;
  viajesCargados: number;
  remisionesEntregadasSinFactura: number;
  diferenciasCarga: number;
  diferenciasEntrega: number;
  facturasRegistradas: number;
};

export default function DashboardPage() {
  const router = useRouter();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>({
    remisionesCapturadas: 0,
    viajesProgramados: 0,
    viajesCargados: 0,
    remisionesEntregadasSinFactura: 0,
    diferenciasCarga: 0,
    diferenciasEntrega: 0,
    facturasRegistradas: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDashboard();
  }, []);

  async function cargarDashboard() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      router.push("/auth/login");
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: perfilData } = await supabase
      .from("profiles")
      .select("nombre, rol")
      .eq("id", userId)
      .single();

    setPerfil((perfilData || null) as Perfil | null);

    const [
      remisionesCapturadas,
      viajesProgramados,
      viajesCargados,
      remisionesEntregadasSinFactura,
      diferenciasCarga,
      diferenciasEntrega,
      facturasRegistradas,
    ] = await Promise.all([
      contarRemisiones(["capturada", "enviada_almacen", "preparada"]),
      contarViajes(["programado", "en_carga"]),
      contarViajes(["cargado", "en_ruta"]),
      contarRemisiones(["entregada_completa", "entregada_parcial"]),
      contarDiferenciasCarga(),
      contarDiferenciasEntrega(),
      contarFacturas(),
    ]);

    setCounts({
      remisionesCapturadas,
      viajesProgramados,
      viajesCargados,
      remisionesEntregadasSinFactura,
      diferenciasCarga,
      diferenciasEntrega,
      facturasRegistradas,
    });

    setLoading(false);
  }

  async function contarRemisiones(estados: string[]) {
    const { count, error } = await supabase
      .from("remisiones")
      .select("id", { count: "exact", head: true })
      .in("estado", estados);

    if (error) {
      console.error("Error contando remisiones:", error);
      return 0;
    }

    return count || 0;
  }

  async function contarViajes(estados: string[]) {
    const { count, error } = await supabase
      .from("viajes")
      .select("id", { count: "exact", head: true })
      .in("estado", estados);

    if (error) {
      console.error("Error contando viajes:", error);
      return 0;
    }

    return count || 0;
  }

  async function contarDiferenciasCarga() {
    const { count, error } = await supabase
      .from("carga_items")
      .select("id", { count: "exact", head: true })
      .eq("diferencia_detectada", true);

    if (error) {
      console.error("Error contando diferencias de carga:", error);
      return 0;
    }

    return count || 0;
  }

  async function contarDiferenciasEntrega() {
    const { count, error } = await supabase
      .from("entrega_items")
      .select("id", { count: "exact", head: true })
      .eq("diferencia_detectada", true);

    if (error) {
      console.error("Error contando diferencias de entrega:", error);
      return 0;
    }

    return count || 0;
  }

  async function contarFacturas() {
    const { count, error } = await supabase
      .from("facturas")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Error contando facturas:", error);
      return 0;
    }

    return count || 0;
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Panel operativo
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {perfil?.nombre
                ? `Bienvenido, ${perfil.nombre}`
                : "Control de entregas, facturación y conciliación"}
              {perfil?.rol ? ` · Rol: ${perfil.rol}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={cerrarSesion}
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            Cargando dashboard...
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-5 md:grid-cols-4">
              <ResumenCard
                title="Remisiones listas"
                value={counts.remisionesCapturadas}
                description="Pendientes de viaje o carga"
                href="/viajes/nuevo"
                color="blue"
              />

              <ResumenCard
                title="Viajes por cargar"
                value={counts.viajesProgramados}
                description="Programados o en carga"
                href="/cargas"
                color="yellow"
              />

              <ResumenCard
                title="Viajes por entregar"
                value={counts.viajesCargados}
                description="Cargados o en ruta"
                href="/entregas"
                color="green"
              />

              <ResumenCard
                title="Sin factura"
                value={counts.remisionesEntregadasSinFactura}
                description="Entregadas pendientes"
                href="/facturacion/nueva"
                color="red"
              />
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Captura rápida
                  </h2>
                  <p className="text-sm text-slate-500">
                    Usa estos accesos para trabajar sin buscar rutas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cargarDashboard}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Actualizar datos
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <AccionRapida
                  title="Nueva remisión"
                  description="Captura cliente, producto, destino y cantidades."
                  href="/remisiones/nueva"
                  primary
                />

                <AccionRapida
                  title="Nuevo viaje"
                  description="Asigna remisiones a chofer, camión y ruta."
                  href="/viajes/nuevo"
                  primary
                />

                <AccionRapida
                  title="Registrar factura"
                  description="Liga el número de factura externa a remisiones."
                  href="/facturacion/nueva"
                  primary
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Flujo de trabajo
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Sigue el proceso de izquierda a derecha.
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <ModuloProceso
                      step="1"
                      title="Remisiones"
                      description="Captura la mercancía que se va a entregar."
                      href="/remisiones"
                      actionHref="/remisiones/nueva"
                      actionText="Nueva remisión"
                    />

                    <ModuloProceso
                      step="2"
                      title="Viajes"
                      description="Agrupa remisiones por chofer, camión y ruta."
                      href="/viajes"
                      actionHref="/viajes/nuevo"
                      actionText="Nuevo viaje"
                    />

                    <ModuloProceso
                      step="3"
                      title="Carga de camión"
                      description="Confirma lo que realmente subió al camión."
                      href="/cargas"
                      actionHref="/cargas"
                      actionText="Capturar carga"
                    />

                    <ModuloProceso
                      step="4"
                      title="Entregas"
                      description="Registra lo que el cliente recibió o rechazó."
                      href="/entregas"
                      actionHref="/entregas"
                      actionText="Registrar entrega"
                    />

                    <ModuloProceso
                      step="5"
                      title="Facturación"
                      description="Registra el número de factura emitida."
                      href="/facturacion"
                      actionHref="/facturacion/nueva"
                      actionText="Registrar factura"
                    />

                    <ModuloProceso
                      step="6"
                      title="Conciliación"
                      description="Revisa pendientes, diferencias y alertas."
                      href="/conciliacion"
                      actionHref="/conciliacion"
                      actionText="Ver conciliación"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Alertas
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Pendientes que requieren revisión.
                  </p>

                  <div className="mt-5 space-y-3">
                    <AlertaItem
                      title="Diferencias de carga"
                      value={counts.diferenciasCarga}
                      href="/conciliacion"
                    />

                    <AlertaItem
                      title="Diferencias de entrega"
                      value={counts.diferenciasEntrega}
                      href="/conciliacion"
                    />

                    <AlertaItem
                      title="Entregadas sin factura"
                      value={counts.remisionesEntregadasSinFactura}
                      href="/conciliacion"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Catálogos
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Datos base del sistema.
                  </p>

                  <div className="mt-5 grid gap-3">
                    <LinkItem title="Clientes" href="/clientes" />
                    <LinkItem title="Productos" href="/productos" />
                    <LinkItem title="Remisiones" href="/remisiones" />
                    <LinkItem title="Viajes" href="/viajes" />
                    <LinkItem title="Facturación" href="/facturacion" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function ResumenCard({
  title,
  value,
  description,
  href,
  color,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  color: "blue" | "yellow" | "green" | "red";
}) {
  const colorClass = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
  }[color];

  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}
      >
        {title}
      </div>

      <div className="text-3xl font-bold text-slate-900">{value}</div>

      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </Link>
  );
}

function AccionRapida({
  title,
  description,
  href,
  primary = false,
}: {
  title: string;
  description: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-2xl bg-sky-600 p-5 text-white shadow-sm transition hover:bg-sky-500"
          : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50"
      }
    >
      <h3 className="font-bold">{title}</h3>
      <p
        className={
          primary ? "mt-1 text-sm text-sky-50" : "mt-1 text-sm text-slate-500"
        }
      >
        {description}
      </p>
    </Link>
  );
}

function ModuloProceso({
  step,
  title,
  description,
  href,
  actionHref,
  actionText,
}: {
  step: string;
  title: string;
  description: string;
  href: string;
  actionHref: string;
  actionText: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {step}
        </div>

        <div className="min-w-0 flex-1">
          <Link href={href} className="font-bold text-slate-900 hover:underline">
            {title}
          </Link>

          <p className="mt-1 text-sm text-slate-500">{description}</p>

          <Link
            href={actionHref}
            className="mt-4 inline-flex rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            {actionText}
          </Link>
        </div>
      </div>
    </div>
  );
}

function AlertaItem({
  title,
  value,
  href,
}: {
  title: string;
  value: number;
  href: string;
}) {
  const hasAlert = value > 0;

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50"
    >
      <span className="text-sm font-semibold text-slate-700">{title}</span>

      <span
        className={
          hasAlert
            ? "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
            : "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
        }
      >
        {value}
      </span>
    </Link>
  );
}

function LinkItem({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {title}
    </Link>
  );
}