"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";
import { useUserRole } from "@/lib/auth/useUserRole";
import {
  canAccessModule,
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
      folio: string;
      destino: string;
      clientes: ClienteRelacion;
    }[]
  | {
      folio: string;
      destino: string;
      clientes: ClienteRelacion;
    }
  | null;

type Viaje = {
  id: string;
  folio: string;
  fecha: string;
  chofer_nombre: string;
  camion: string | null;
  ruta: string | null;
  estado: string;
  viaje_remisiones: {
    remisiones: RemisionRelacion;
  }[];
};

export default function ViajesPage() {
  const { role, loadingRole } = useUserRole();

  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const puedeCrearViaje = !loadingRole && canCreate(role, "viajes");
  const puedeCapturarCarga = !loadingRole && canUpdate(role, "cargas");
  const puedeRegistrarEntrega = !loadingRole && canUpdate(role, "entregas");
  const puedeVerEntrega = !loadingRole && canAccessModule(role, "entregas");

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
          remisiones (
            folio,
            destino,
            clientes (
              nombre
            )
          )
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando viajes:", error);
      setErrorMsg("No se pudieron cargar los viajes.");
      setViajes([]);
    } else {
      setViajes((data || []) as unknown as Viaje[]);
    }

    setLoading(false);
  }

  function estadoTexto(estado: string) {
    const estados: Record<string, string> = {
      programado: "Programado",
      en_carga: "En carga",
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

    if (estado === "programado" || estado === "en_carga") {
      return "bg-yellow-50 text-yellow-700";
    }

    if (estado === "cerrado" || estado === "regresado") {
      return "bg-green-50 text-green-700";
    }

    return "bg-blue-50 text-blue-700";
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

  function contarRemisiones(viaje: Viaje) {
    return viaje.viaje_remisiones?.length || 0;
  }

  function obtenerClientesResumen(viaje: Viaje) {
    const nombres = new Set<string>();

    viaje.viaje_remisiones?.forEach((relacion) => {
      const remision = obtenerRemision(relacion.remisiones);
      const cliente = obtenerCliente(remision?.clientes || null);

      if (cliente) {
        nombres.add(cliente);
      }
    });

    const lista = Array.from(nombres);

    if (lista.length === 0) return "-";
    if (lista.length === 1) return lista[0];

    return `${lista.length} clientes`;
  }

  function obtenerDestinosResumen(viaje: Viaje) {
    const destinos = new Set<string>();

    viaje.viaje_remisiones?.forEach((relacion) => {
      const remision = obtenerRemision(relacion.remisiones);

      if (remision?.destino) {
        destinos.add(obtenerDestinoCorto(remision.destino));
      }
    });

    const lista = Array.from(destinos);

    if (lista.length === 0) return viaje.ruta || "-";
    if (lista.length === 1) return lista[0];

    return `${lista.length} destinos`;
  }

  function obtenerDestinoCorto(destino: string) {
    if (!destino) return "-";

    const partes = destino.split(",");

    return partes[0]?.trim() || destino;
  }

  function obtenerRemision(remisiones: RemisionRelacion) {
    if (Array.isArray(remisiones)) {
      return remisiones[0] || null;
    }

    return remisiones || null;
  }

  function obtenerCliente(clientes: ClienteRelacion) {
    if (Array.isArray(clientes)) {
      return clientes[0]?.nombre || "";
    }

    return clientes?.nombre || "";
  }

  function accionSiguiente(viaje: Viaje) {
    if (
      (viaje.estado === "programado" || viaje.estado === "en_carga") &&
      puedeCapturarCarga
    ) {
      return {
        texto: "Capturar carga",
        href: `/cargas/${viaje.id}`,
        clase: "bg-sky-600 text-white hover:bg-sky-500",
      };
    }

    if (
      (viaje.estado === "cargado" || viaje.estado === "en_ruta") &&
      puedeRegistrarEntrega
    ) {
      return {
        texto: "Registrar entrega",
        href: `/entregas/${viaje.id}`,
        clase: "bg-green-600 text-white hover:bg-green-500",
      };
    }

    if (
      (viaje.estado === "regresado" || viaje.estado === "cerrado") &&
      puedeVerEntrega
    ) {
      return {
        texto: "Ver entrega",
        href: `/entregas/${viaje.id}`,
        clase: "bg-slate-900 text-white hover:bg-slate-700",
      };
    }

    if (puedeVerEntrega) {
      return {
        texto: "Ver",
        href: `/entregas/${viaje.id}`,
        clase: "bg-slate-900 text-white hover:bg-slate-700",
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
            <h1 className="text-2xl font-bold text-slate-900">Viajes</h1>
            <p className="text-sm text-slate-500">
              Programa viajes, agrupa remisiones y controla el avance de carga y
              entrega.
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

            {puedeCrearViaje && (
              <Link
                href="/viajes/nuevo"
                className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Nuevo viaje
              </Link>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <ResumenCard
            titulo="Programados"
            valor={contarPorEstado(["programado", "en_carga"])}
            descripcion="Pendientes de carga."
          />

          <ResumenCard
            titulo="Cargados"
            valor={contarPorEstado(["cargado", "en_ruta"])}
            descripcion="Listos para entrega."
          />

          <ResumenCard
            titulo="Terminados"
            valor={contarPorEstado(["regresado", "cerrado"])}
            descripcion="Con entrega registrada."
          />

          <ResumenCard
            titulo="Cancelados"
            valor={contarPorEstado(["cancelado"])}
            descripcion="Viajes cancelados."
          />
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Control de viajes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cada viaje puede incluir remisiones de varios clientes y distintos
            destinos. El flujo normal es: programado → carga → entrega → viaje
            terminado.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-slate-500">Cargando viajes...</div>
          ) : viajes.length === 0 ? (
            <div className="p-6 text-slate-500">
              No hay viajes registrados.
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
                      Ruta / destino
                    </th>
                    <th className="px-6 py-3 text-left font-semibold">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-right font-semibold">
                      Remisiones
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
                  {viajes.map((viaje) => {
                    const accion = accionSiguiente(viaje);

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
                          {viaje.ruta || obtenerDestinosResumen(viaje)}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {obtenerClientesResumen(viaje)}
                        </td>

                        <td className="px-6 py-4 text-right text-slate-600">
                          {contarRemisiones(viaje)}
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