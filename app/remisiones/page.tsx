"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";
import { useUserRole } from "@/lib/auth/useUserRole";
import {
  canCreate,
  canPrint,
  canReprogramRemision,
} from "@/lib/auth/permissions";

type ClienteRelacion =
  | {
      nombre: string;
    }[]
  | {
      nombre: string;
    }
  | null;

type ProductoRelacion =
  | {
      nombre: string;
    }[]
  | {
      nombre: string;
    }
  | null;

type DireccionEntregaRelacion =
  | {
      nombre_direccion: string;
    }[]
  | {
      nombre_direccion: string;
    }
  | null;

type Remision = {
  id: string;
  folio: string;
  fecha_remision: string;
  fecha_programada_entrega: string | null;
  destino: string;
  direccion_entrega_id: string | null;
  estado: string;
  orden_produccion_folio: string | null;
  orden_compra_folio: string | null;

  clientes: ClienteRelacion;
  cliente_direcciones_entrega: DireccionEntregaRelacion;

  remision_items: {
    cajas: number | null;
    bobinas: number | null;
    kilos: number | null;
    piezas: number | null;
    productos: ProductoRelacion;
  }[];
};

export default function RemisionesPage() {
  const { role, loadingRole } = useUserRole();

  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [reprogramandoId, setReprogramandoId] = useState<string | null>(null);

  const puedeCrearRemision = !loadingRole && canCreate(role, "remisiones");
  const puedeReprogramar = !loadingRole && canReprogramRemision(role);
  const puedeImprimir = !loadingRole && canPrint(role, "remisiones");

  useEffect(() => {
    cargarRemisiones();
  }, []);

  async function cargarRemisiones() {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("remisiones")
      .select(
        `
        id,
        folio,
        fecha_remision,
        fecha_programada_entrega,
        destino,
        direccion_entrega_id,
        estado,
        orden_produccion_folio,
        orden_compra_folio,
        clientes (
          nombre
        ),
        cliente_direcciones_entrega (
          nombre_direccion
        ),
        remision_items (
          cajas,
          bobinas,
          kilos,
          piezas,
          productos (
            nombre
          )
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando remisiones:", error);
      setErrorMsg("No se pudieron cargar las remisiones.");
      setRemisiones([]);
    } else {
      setRemisiones((data || []) as unknown as Remision[]);
    }

    setLoading(false);
  }

  async function reprogramarRemision(remision: Remision) {
    if (!puedeReprogramar) {
      setErrorMsg("No tienes permiso para reprogramar remisiones.");
      return;
    }

    const confirmado = window.confirm(
      `¿Seguro que deseas reprogramar la remisión ${remision.folio}? Volverá a estado "Preparada" y podrá asignarse a un nuevo viaje.`
    );

    if (!confirmado) return;

    setReprogramandoId(remision.id);
    setErrorMsg("");

    const { error } = await supabase
      .from("remisiones")
      .update({
        estado: "preparada",
      })
      .eq("id", remision.id);

    if (error) {
      console.error("Error reprogramando remisión:", error);
      setErrorMsg("No se pudo reprogramar la remisión.");
      setReprogramandoId(null);
      return;
    }

    setReprogramandoId(null);
    await cargarRemisiones();
  }

  function obtenerCliente(remision: Remision) {
    if (Array.isArray(remision.clientes)) {
      return remision.clientes[0]?.nombre || "-";
    }

    return remision.clientes?.nombre || "-";
  }

  function obtenerProducto(remision: Remision) {
    const items = remision.remision_items || [];

    if (items.length === 0) {
      return "-";
    }

    if (items.length > 1) {
      return "Varios";
    }

    const producto = items[0]?.productos;

    if (Array.isArray(producto)) {
      return producto[0]?.nombre || "-";
    }

    return producto?.nombre || "-";
  }

  function obtenerDestino(remision: Remision) {
    const direccion = remision.cliente_direcciones_entrega;

    if (Array.isArray(direccion)) {
      return (
        direccion[0]?.nombre_direccion || obtenerDestinoCorto(remision.destino)
      );
    }

    return direccion?.nombre_direccion || obtenerDestinoCorto(remision.destino);
  }

  function obtenerDestinoCorto(destino: string) {
    if (!destino) return "-";

    const partes = destino.split(",");

    return partes[0]?.trim() || destino;
  }

  function obtenerTotales(remision: Remision) {
    return remision.remision_items.reduce(
      (acumulado, item) => {
        acumulado.cajas += Number(item.cajas || 0);
        acumulado.bobinas += Number(item.bobinas || 0);
        acumulado.kilos += Number(item.kilos || 0);
        acumulado.piezas += Number(item.piezas || 0);
        return acumulado;
      },
      {
        cajas: 0,
        bobinas: 0,
        kilos: 0,
        piezas: 0,
      }
    );
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

  function estadoTexto(estado: string) {
    const estados: Record<string, string> = {
      capturada: "Capturada",
      enviada_almacen: "Enviada a almacén",
      preparada: "Preparada",
      cargada: "Cargada",
      en_ruta: "En ruta",
      entregada_completa: "Entregada completa",
      entregada_parcial: "Entrega parcial histórica",
      rechazada: "No entregada / rechazada",
      facturada: "Facturada",
      conciliada: "Conciliada",
      con_diferencia: "Con diferencia",
      cerrada: "Cerrada",
      cancelada: "Cancelada",
    };

    return estados[estado] || estado;
  }

  function estadoClase(estado: string) {
    if (
      estado === "con_diferencia" ||
      estado === "rechazada" ||
      estado === "cancelada"
    ) {
      return "bg-red-50 text-red-700";
    }

    if (
      estado === "entregada_parcial" ||
      estado === "preparada" ||
      estado === "capturada"
    ) {
      return "bg-yellow-50 text-yellow-700";
    }

    if (
      estado === "facturada" ||
      estado === "entregada_completa" ||
      estado === "conciliada"
    ) {
      return "bg-green-50 text-green-700";
    }

    return "bg-blue-50 text-blue-700";
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Remisiones</h1>
            <p className="text-sm text-slate-500">
              Consulta, imprime y controla las remisiones capturadas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cargarRemisiones}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>

            {puedeCrearRemision && (
              <Link
                href="/remisiones/nueva"
                className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Nueva remisión
              </Link>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Control de remisiones
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {puedeReprogramar
              ? "Si una remisión fue marcada como no entregada o rechazada, puedes reprogramarla para que vuelva a quedar disponible para un nuevo viaje."
              : "Puedes consultar e imprimir remisiones. Las modificaciones dependen del rol asignado a tu usuario."}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-slate-500">Cargando remisiones...</div>
          ) : remisiones.length === 0 ? (
            <div className="p-6 text-slate-500">
              No hay remisiones registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">
                      Folio
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Fecha entrega
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Cliente
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Producto
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Cajas
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Bobinas
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Kilos
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Piezas
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Destino
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Estado
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {remisiones.map((remision) => {
                    const totales = obtenerTotales(remision);
                    const mostrarReprogramar =
                      puedeReprogramar && remision.estado === "rechazada";

                    return (
                      <tr key={remision.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {remision.folio}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {formatearFecha(
                            remision.fecha_programada_entrega ||
                              remision.fecha_remision
                          )}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-800">
                          {obtenerCliente(remision)}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {obtenerProducto(remision)}
                        </td>

                        <td className="px-6 py-4 text-right text-slate-600">
                          {totales.cajas}
                        </td>

                        <td className="px-6 py-4 text-right text-slate-600">
                          {totales.bobinas}
                        </td>

                        <td className="px-6 py-4 text-right text-slate-600">
                          {totales.kilos}
                        </td>

                        <td className="px-6 py-4 text-right text-slate-600">
                          {totales.piezas}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {obtenerDestino(remision)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoClase(
                              remision.estado
                            )}`}
                          >
                            {estadoTexto(remision.estado)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {mostrarReprogramar && (
                              <button
                                type="button"
                                onClick={() => reprogramarRemision(remision)}
                                disabled={reprogramandoId === remision.id}
                                className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-800 hover:bg-yellow-100 disabled:opacity-60"
                              >
                                {reprogramandoId === remision.id
                                  ? "Reprogramando..."
                                  : "Reprogramar"}
                              </button>
                            )}

                            {puedeImprimir && (
                              <Link
                                href={`/remisiones/${remision.id}/imprimir`}
                                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                              >
                                Imprimir
                              </Link>
                            )}
                          </div>
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