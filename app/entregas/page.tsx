"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";
import { useUserRole } from "@/lib/auth/useUserRole";
import { canAccessModule, canUpdate } from "@/lib/auth/permissions";

type Viaje = {
  id: string;
  folio: string;
  fecha: string;
  chofer_nombre: string;
  camion: string | null;
  ruta: string | null;
  estado: string;
  viaje_remisiones: {
    remision_id: string;
  }[];
};

export default function EntregasPage() {
  const { role, loadingRole } = useUserRole();

  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const puedeRegistrarEntrega = !loadingRole && canUpdate(role, "entregas");
  const puedeVerEntrega = !loadingRole && canAccessModule(role, "entregas");
  const puedeVerCargas = !loadingRole && canAccessModule(role, "cargas");

  useEffect(() => {
    cargarViajes();
  }, []);

  async function cargarViajes() {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("viajes")
      .select(
        `
        id,
        folio,
        fecha,
        chofer_nombre,
        camion,
        ruta,
        estado,
        viaje_remisiones (
          remision_id
        )
      `
      )
      .in("estado", ["cargado", "en_ruta", "regresado", "cerrado"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando viajes para entrega:", error);
      setErrorMsg("No se pudieron cargar los viajes disponibles para entrega.");
      setViajes([]);
    } else {
      setViajes((data || []) as unknown as Viaje[]);
    }

    setLoading(false);
  }

  function estadoTexto(estado: string) {
    const estados: Record<string, string> = {
      cargado: "Cargado",
      en_ruta: "En ruta",
      regresado: "Viaje terminado",
      cerrado: "Cerrado",
      cancelado: "Cancelado",
    };

    return estados[estado] || estado;
  }

  function estadoClase(estado: string) {
    if (estado === "cancelado") {
      return "bg-red-50 text-red-700";
    }

    if (estado === "cargado") {
      return "bg-yellow-50 text-yellow-700";
    }

    if (estado === "en_ruta") {
      return "bg-blue-50 text-blue-700";
    }

    if (estado === "regresado" || estado === "cerrado") {
      return "bg-green-50 text-green-700";
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

  function accionEntrega(viaje: Viaje) {
    if (viaje.estado === "regresado" || viaje.estado === "cerrado") {
      if (puedeRegistrarEntrega) {
        return {
          texto: "Ver / editar entrega",
          href: `/entregas/${viaje.id}`,
          clase: "bg-slate-900 text-white hover:bg-slate-700",
        };
      }

      if (puedeVerEntrega) {
        return {
          texto: "Ver entrega",
          href: `/entregas/${viaje.id}`,
          clase: "bg-slate-900 text-white hover:bg-slate-700",
        };
      }

      return null;
    }

    if (puedeRegistrarEntrega) {
      return {
        texto: "Registrar entrega",
        href: `/entregas/${viaje.id}`,
        clase: "bg-sky-600 text-white hover:bg-sky-500",
      };
    }

    return null;
  }

  function contarPorEstado(estados: string[]) {
    return viajes.filter((viaje) => estados.includes(viaje.estado)).length;
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Entregas del chofer
            </h1>

            <p className="text-sm text-slate-500">
              Registra si el material fue entregado o no entregado por el
              chofer. En viajes terminados puedes revisar o editar la entrega.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cargarViajes}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>

            {puedeVerCargas && (
              <Link
                href="/cargas"
                className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver cargas
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
            titulo="Listos para entrega"
            valor={contarPorEstado(["cargado"])}
            descripcion="Viajes cargados pendientes de registrar entrega."
          />

          <ResumenCard
            titulo="En ruta"
            valor={contarPorEstado(["en_ruta"])}
            descripcion="Viajes que están en proceso de entrega."
          />

          <ResumenCard
            titulo="Terminados"
            valor={contarPorEstado(["regresado"])}
            descripcion="Viajes con entrega registrada."
          />
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Viajes para registrar entrega
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Aquí aparecen los viajes cargados, en ruta o terminados. El flujo de
            entrega no maneja parcialidades como estado final: el material se
            registra como entregado o no entregado.
          </p>

          {!puedeRegistrarEntrega && (
            <p className="mt-2 text-sm font-medium text-yellow-700">
              Tu rol permite consultar esta pantalla, pero no registrar ni
              editar entregas.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-slate-500">Cargando viajes...</div>
          ) : viajes.length === 0 ? (
            <div className="p-6 text-slate-500">
              No hay viajes disponibles para registrar entrega.
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
                      Fecha
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Chofer
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Camión
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Ruta
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Remisiones
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
                  {viajes.map((viaje) => {
                    const accion = accionEntrega(viaje);

                    return (
                      <tr key={viaje.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {viaje.folio}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {formatearFecha(viaje.fecha)}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-800">
                          {viaje.chofer_nombre}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {viaje.camion || "-"}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {viaje.ruta || "-"}
                        </td>

                        <td className="px-6 py-4 text-right text-slate-600">
                          {viaje.viaje_remisiones?.length || 0}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoClase(
                              viaje.estado
                            )}`}
                          >
                            {estadoTexto(viaje.estado)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {accion ? (
                            <Link
                              href={accion.href}
                              className={`inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${accion.clase}`}
                            >
                              {accion.texto}
                            </Link>
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