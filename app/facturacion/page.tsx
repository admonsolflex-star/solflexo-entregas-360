"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";
import { useUserRole } from "@/lib/auth/useUserRole";
import {
  canCancelFactura,
  canCreate,
  canUpdate,
} from "@/lib/auth/permissions";

type ClienteRelacion =
  | {
      nombre: string;
    }[]
  | {
      nombre: string;
    }
  | null;

type RemisionRelacion =
  | {
      id: string;
      folio: string;
      estado: string;
    }[]
  | {
      id: string;
      folio: string;
      estado: string;
    }
  | null;

type Factura = {
  id: string;
  folio_factura: string;
  serie_factura: string | null;
  uuid_fiscal: string | null;
  fecha_factura: string;
  importe_facturado: number | null;
  estado: string;
  observaciones: string | null;
  clientes: ClienteRelacion;
  factura_remisiones: {
    remisiones: RemisionRelacion;
  }[];
};

export default function FacturacionPage() {
  const { role, loadingRole } = useUserRole();

  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const puedeRegistrarFactura =
    !loadingRole && canCreate(role, "facturacion");

  const puedeCancelarFactura =
    !loadingRole &&
    canUpdate(role, "facturacion") &&
    canCancelFactura(role);

  useEffect(() => {
    cargarFacturas();
  }, []);

  async function cargarFacturas() {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("facturas")
      .select(
        `
        id,
        folio_factura,
        serie_factura,
        uuid_fiscal,
        fecha_factura,
        importe_facturado,
        estado,
        observaciones,
        clientes (
          nombre
        ),
        factura_remisiones (
          remisiones (
            id,
            folio,
            estado
          )
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando facturas:", error);
      setErrorMsg("No se pudieron cargar las facturas.");
      setFacturas([]);
    } else {
      setFacturas((data || []) as unknown as Factura[]);
    }

    setLoading(false);
  }

  function obtenerCliente(factura: Factura) {
    if (Array.isArray(factura.clientes)) {
      return factura.clientes[0]?.nombre || "-";
    }

    return factura.clientes?.nombre || "-";
  }

  function obtenerRemision(remisiones: RemisionRelacion) {
    if (Array.isArray(remisiones)) {
      return remisiones[0] || null;
    }

    return remisiones || null;
  }

  function estadoTexto(estado: string) {
    const estados: Record<string, string> = {
      registrada: "Registrada",
      cancelada: "Cancelada",
      pendiente_revision: "Pendiente revisión",
      emitida: "Emitida",
    };

    return estados[estado] || estado;
  }

  function estadoClase(estado: string) {
    if (estado === "cancelada") {
      return "bg-red-50 text-red-700";
    }

    if (estado === "pendiente_revision") {
      return "bg-yellow-50 text-yellow-700";
    }

    return "bg-green-50 text-green-700";
  }

  function estadoRemisionTexto(estado: string) {
    const estados: Record<string, string> = {
      entregada_completa: "Entregada completa",
      rechazada: "No entregada / rechazada",
      facturada: "Facturada",
      cancelada: "Cancelada",
      conciliada: "Conciliada",
      con_diferencia: "Con diferencia",
    };

    return estados[estado] || estado;
  }

  function estadoRemisionClase(estado: string) {
    if (estado === "facturada") {
      return "bg-green-50 text-green-700";
    }

    if (estado === "entregada_completa") {
      return "bg-sky-50 text-sky-700";
    }

    if (estado === "rechazada" || estado === "cancelada") {
      return "bg-red-50 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  function formatearFecha(fecha: string | null) {
    if (!fecha) return "-";

    const date = new Date(`${fecha}T00:00:00`);

    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function formatoMoneda(valor: number | null) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(valor || 0));
  }

  function folioFactura(factura: Factura) {
    if (factura.serie_factura) {
      return `${factura.serie_factura}-${factura.folio_factura}`;
    }

    return factura.folio_factura;
  }

  function remisionesFactura(factura: Factura) {
    const remisiones = factura.factura_remisiones
      .map((item) => obtenerRemision(item.remisiones))
      .filter(Boolean);

    return remisiones as {
      id: string;
      folio: string;
      estado: string;
    }[];
  }

  async function cancelarFactura(factura: Factura) {
    if (!puedeCancelarFactura) {
      setErrorMsg("No tienes permiso para cancelar facturas.");
      return;
    }

    const confirmado = window.confirm(
      `¿Seguro que deseas cancelar la factura ${folioFactura(
        factura
      )}? Las remisiones ligadas volverán a quedar como entregadas completas para poder facturarse nuevamente.`
    );

    if (!confirmado) return;

    setCancelandoId(factura.id);
    setErrorMsg("");

    const remisiones = remisionesFactura(factura);
    const remisionIds = remisiones.map((remision) => remision.id);

    const { error: facturaError } = await supabase
      .from("facturas")
      .update({
        estado: "cancelada",
      })
      .eq("id", factura.id);

    if (facturaError) {
      console.error("Error cancelando factura:", facturaError);
      setErrorMsg("No se pudo cancelar la factura.");
      setCancelandoId(null);
      return;
    }

    if (remisionIds.length > 0) {
      const { error: remisionesError } = await supabase
        .from("remisiones")
        .update({
          estado: "entregada_completa",
        })
        .in("id", remisionIds);

      if (remisionesError) {
        console.error(
          "Error regresando remisiones a entregada_completa:",
          remisionesError
        );
        setErrorMsg(
          "La factura fue cancelada, pero no se pudieron regresar las remisiones a entregada completa."
        );
        setCancelandoId(null);
        await cargarFacturas();
        return;
      }
    }

    setCancelandoId(null);
    await cargarFacturas();
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Facturación
            </h1>
            <p className="text-sm text-slate-500">
              Registra facturas externas y lígalas únicamente con remisiones
              entregadas completas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cargarFacturas}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>

            {puedeRegistrarFactura && (
              <Link
                href="/facturacion/nueva"
                className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Registrar factura
              </Link>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <ResumenCard
            titulo="Facturas registradas"
            valor={
              facturas.filter((factura) => factura.estado !== "cancelada")
                .length
            }
            descripcion="Facturas activas capturadas."
          />

          <ResumenCard
            titulo="Facturas canceladas"
            valor={
              facturas.filter((factura) => factura.estado === "cancelada")
                .length
            }
            descripcion="Facturas canceladas o corregidas."
          />

          <ResumenCard
            titulo="Total listado"
            valor={facturas.length}
            descripcion="Total de registros cargados."
          />
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Registro de facturas externas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Aquí se liga el número de factura emitida en el sistema de
            facturación con las remisiones entregadas completas. Si una factura
            se cancela, sus remisiones regresan a estado entregada completa.
          </p>

          {!puedeRegistrarFactura && (
            <p className="mt-2 text-sm font-medium text-yellow-700">
              Tu rol permite consultar esta pantalla, pero no registrar ni
              cancelar facturas.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-slate-500">Cargando facturas...</div>
          ) : facturas.length === 0 ? (
            <div className="p-6 text-slate-500">
              No hay facturas registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">
                      Factura
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Cliente
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Fecha
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Importe
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Remisiones
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      UUID
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Estado
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {facturas.map((factura) => {
                    const remisiones = remisionesFactura(factura);
                    const estaCancelada = factura.estado === "cancelada";

                    return (
                      <tr
                        key={factura.id}
                        className={
                          estaCancelada
                            ? "bg-red-50/30 hover:bg-red-50/50"
                            : "hover:bg-slate-50"
                        }
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {folioFactura(factura)}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {obtenerCliente(factura)}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {formatearFecha(factura.fecha_factura)}
                        </td>

                        <td className="px-6 py-4 text-right font-medium text-slate-700">
                          {formatoMoneda(factura.importe_facturado)}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {remisiones.length > 0 ? (
                            <div className="space-y-2">
                              {remisiones.map((remision) => (
                                <div
                                  key={`${factura.id}-${remision.id}`}
                                  className="flex flex-col gap-1"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {remision.folio}
                                  </span>

                                  <span
                                    className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${estadoRemisionClase(
                                      remision.estado
                                    )}`}
                                  >
                                    {estadoRemisionTexto(remision.estado)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="max-w-[260px] truncate px-6 py-4 text-slate-600">
                          {factura.uuid_fiscal || "-"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoClase(
                              factura.estado
                            )}`}
                          >
                            {estadoTexto(factura.estado)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {estaCancelada ? (
                            <span className="text-xs font-semibold text-slate-400">
                              Sin acción
                            </span>
                          ) : puedeCancelarFactura ? (
                            <button
                              type="button"
                              onClick={() => cancelarFactura(factura)}
                              disabled={cancelandoId === factura.id}
                              className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              {cancelandoId === factura.id
                                ? "Cancelando..."
                                : "Cancelar factura"}
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              Sólo lectura
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ResumenCard({
  titulo,
  valor,
  descripcion,
}: {
  titulo: string;
  valor: number;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{titulo}</p>

      <p className="mt-2 text-3xl font-bold text-slate-900">{valor}</p>

      <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
    </div>
  );
}