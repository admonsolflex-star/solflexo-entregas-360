"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";

type ClienteRelacion =
  | {
      nombre: string;
    }[]
  | {
      nombre: string;
    }
  | null;

type RemisionDisponible = {
  id: string;
  folio: string;
  destino: string;
  estado: string;
  fecha_programada_entrega: string | null;
  fecha_remision: string;
  clientes: ClienteRelacion;
};

type ViajeRemisionActiva = {
  remision_id: string;
  viajes:
    | {
        estado: string;
      }[]
    | {
        estado: string;
      }
    | null;
};

export default function NuevoViajePage() {
  const router = useRouter();

  const [folio, setFolio] = useState("");
  const [fecha, setFecha] = useState("");
  const [choferNombre, setChoferNombre] = useState("");
  const [camion, setCamion] = useState("");
  const [ruta, setRuta] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [remisiones, setRemisiones] = useState<RemisionDisponible[]>([]);
  const [remisionesSeleccionadas, setRemisionesSeleccionadas] = useState<
    string[]
  >([]);

  const [loadingRemisiones, setLoadingRemisiones] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    generarFolioTemporal();
    cargarRemisionesDisponibles();

    const hoy = new Date().toISOString().slice(0, 10);
    setFecha(hoy);
  }, []);

  function generarFolioTemporal() {
    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, "0");
    const dd = String(ahora.getDate()).padStart(2, "0");
    const hh = String(ahora.getHours()).padStart(2, "0");
    const min = String(ahora.getMinutes()).padStart(2, "0");
    const ss = String(ahora.getSeconds()).padStart(2, "0");

    setFolio(`VIA-${yyyy}${mm}${dd}-${hh}${min}${ss}`);
  }

  async function cargarRemisionesDisponibles() {
    setLoadingRemisiones(true);
    setErrorMsg("");

    const { data: remisionesData, error: remisionesError } = await supabase
      .from("remisiones")
      .select(
        `
        id,
        folio,
        destino,
        estado,
        fecha_remision,
        fecha_programada_entrega,
        clientes (
          nombre
        )
      `
      )
      .in("estado", ["capturada", "enviada_almacen", "preparada"])
      .order("created_at", { ascending: false });

    if (remisionesError) {
      console.error("Error cargando remisiones disponibles:", remisionesError);
      setErrorMsg("No se pudieron cargar las remisiones disponibles.");
      setRemisiones([]);
      setLoadingRemisiones(false);
      return;
    }

    const { data: relacionesData, error: relacionesError } = await supabase
      .from("viaje_remisiones")
      .select(
        `
        remision_id,
        viajes (
          estado
        )
      `
      );

    if (relacionesError) {
      console.error("Error revisando remisiones ligadas a viajes:", relacionesError);
      setErrorMsg(
        "No se pudieron validar las remisiones ya ligadas a viajes activos."
      );
      setRemisiones((remisionesData || []) as unknown as RemisionDisponible[]);
      setLoadingRemisiones(false);
      return;
    }

    const estadosViajeActivos = [
      "programado",
      "en_carga",
      "cargado",
      "en_ruta",
    ];

    const remisionesEnViajeActivo = new Set<string>();

    ((relacionesData || []) as unknown as ViajeRemisionActiva[]).forEach(
      (relacion) => {
        const viaje = Array.isArray(relacion.viajes)
          ? relacion.viajes[0]
          : relacion.viajes;

        if (viaje && estadosViajeActivos.includes(viaje.estado)) {
          remisionesEnViajeActivo.add(relacion.remision_id);
        }
      }
    );

    const disponibles = ((remisionesData || []) as unknown as RemisionDisponible[]).filter(
      (remision) => !remisionesEnViajeActivo.has(remision.id)
    );

    setRemisiones(disponibles);
    setLoadingRemisiones(false);
  }

  function toggleRemision(id: string) {
    setRemisionesSeleccionadas((actuales) => {
      if (actuales.includes(id)) {
        return actuales.filter((item) => item !== id);
      }

      return [...actuales, id];
    });
  }

  function seleccionarTodas() {
    setRemisionesSeleccionadas(remisiones.map((remision) => remision.id));
  }

  function limpiarSeleccion() {
    setRemisionesSeleccionadas([]);
  }

  function obtenerCliente(remision: RemisionDisponible) {
    if (Array.isArray(remision.clientes)) {
      return remision.clientes[0]?.nombre || "-";
    }

    return remision.clientes?.nombre || "-";
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
      preparada: "Preparada / disponible",
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
    if (estado === "capturada") {
      return "bg-slate-100 text-slate-700";
    }

    if (estado === "enviada_almacen") {
      return "bg-blue-50 text-blue-700";
    }

    if (estado === "preparada") {
      return "bg-yellow-50 text-yellow-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  async function guardarViaje(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setErrorMsg("");

    if (!folio.trim()) {
      setErrorMsg("Captura el folio del viaje.");
      setSaving(false);
      return;
    }

    if (!fecha) {
      setErrorMsg("Selecciona la fecha del viaje.");
      setSaving(false);
      return;
    }

    if (!choferNombre.trim()) {
      setErrorMsg("Captura el nombre del chofer.");
      setSaving(false);
      return;
    }

    if (remisionesSeleccionadas.length === 0) {
      setErrorMsg("Selecciona al menos una remisión para el viaje.");
      setSaving(false);
      return;
    }

    const { data: relacionesActuales, error: relacionesActualesError } =
      await supabase
        .from("viaje_remisiones")
        .select(
          `
          remision_id,
          viajes (
            estado
          )
        `
        )
        .in("remision_id", remisionesSeleccionadas);

    if (relacionesActualesError) {
      console.error(
        "Error validando remisiones antes de guardar:",
        relacionesActualesError
      );
      setErrorMsg("No se pudieron validar las remisiones seleccionadas.");
      setSaving(false);
      return;
    }

    const estadosViajeActivos = [
      "programado",
      "en_carga",
      "cargado",
      "en_ruta",
    ];

    const remisionDuplicada = (
      (relacionesActuales || []) as unknown as ViajeRemisionActiva[]
    ).find((relacion) => {
      const viaje = Array.isArray(relacion.viajes)
        ? relacion.viajes[0]
        : relacion.viajes;

      return viaje && estadosViajeActivos.includes(viaje.estado);
    });

    if (remisionDuplicada) {
      setErrorMsg(
        "Una o más remisiones seleccionadas ya están ligadas a un viaje activo. Actualiza la pantalla e intenta de nuevo."
      );
      setSaving(false);
      return;
    }

    const { data: viajeCreado, error: viajeError } = await supabase
      .from("viajes")
      .insert({
        folio: folio.trim(),
        fecha,
        chofer_nombre: choferNombre.trim(),
        camion: camion.trim() || null,
        ruta: ruta.trim() || null,
        estado: "programado",
        observaciones: observaciones.trim() || null,
      })
      .select("id")
      .single();

    if (viajeError || !viajeCreado) {
      console.error("Error guardando viaje:", viajeError);
      setErrorMsg("No se pudo guardar el viaje.");
      setSaving(false);
      return;
    }

    const relaciones = remisionesSeleccionadas.map((remisionId) => ({
      viaje_id: viajeCreado.id,
      remision_id: remisionId,
    }));

    const { error: relacionesError } = await supabase
      .from("viaje_remisiones")
      .insert(relaciones);

    if (relacionesError) {
      console.error("Error relacionando remisiones:", relacionesError);
      setErrorMsg(
        "Se creó el viaje, pero no se pudieron ligar las remisiones."
      );
      setSaving(false);
      return;
    }

    const { error: remisionesError } = await supabase
      .from("remisiones")
      .update({
        estado: "preparada",
      })
      .in("id", remisionesSeleccionadas);

    if (remisionesError) {
      console.error("Error actualizando remisiones:", remisionesError);
    }

    setSaving(false);
    router.push("/viajes");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nuevo viaje</h1>
            <p className="text-sm text-slate-500">
              Agrupa remisiones por chofer, camión y ruta para preparar la
              carga.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cargarRemisionesDisponibles}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar remisiones
            </button>

            <Link
              href="/viajes"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Regresar a viajes
            </Link>
          </div>
        </div>

        <form
          onSubmit={guardarViaje}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Datos del viaje
            </h2>
            <p className="text-sm text-slate-500">
              Un viaje puede llevar remisiones de varios clientes y diferentes
              destinos. Las remisiones ya ligadas a un viaje activo no se
              mostrarán aquí.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <CampoTexto
              label="Folio viaje"
              value={folio}
              onChange={setFolio}
              required
            />

            <CampoTexto
              label="Fecha"
              value={fecha}
              onChange={setFecha}
              type="date"
              required
            />

            <CampoTexto
              label="Chofer"
              value={choferNombre}
              onChange={setChoferNombre}
              placeholder="Nombre del chofer"
              required
            />

            <CampoTexto
              label="Camión"
              value={camion}
              onChange={setCamion}
              placeholder="Camión 1, Torton, Camioneta..."
            />

            <CampoTexto
              label="Ruta"
              value={ruta}
              onChange={setRuta}
              placeholder="Zamora - Guadalajara"
            />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Remisiones para cargar
                </h3>
                <p className="text-sm text-slate-500">
                  Selecciona las remisiones disponibles que irán en este viaje.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={seleccionarTodas}
                  disabled={remisiones.length === 0}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Seleccionar todas
                </button>

                <button
                  type="button"
                  onClick={limpiarSeleccion}
                  disabled={remisionesSeleccionadas.length === 0}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Limpiar selección
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Remisiones seleccionadas:{" "}
              <span className="font-bold text-slate-900">
                {remisionesSeleccionadas.length}
              </span>
            </div>

            {loadingRemisiones ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Cargando remisiones disponibles...
              </div>
            ) : remisiones.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                No hay remisiones disponibles para viaje.
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">
                          Seleccionar
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Folio
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Fecha entrega
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Destino
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Estado
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {remisiones.map((remision) => {
                        const seleccionado =
                          remisionesSeleccionadas.includes(remision.id);

                        return (
                          <tr
                            key={remision.id}
                            className={
                              seleccionado
                                ? "bg-sky-50 hover:bg-sky-50"
                                : "hover:bg-slate-50"
                            }
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={seleccionado}
                                onChange={() => toggleRemision(remision.id)}
                                className="h-4 w-4"
                              />
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {remision.folio}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {formatearFecha(
                                remision.fecha_programada_entrega ||
                                  remision.fecha_remision
                              )}
                            </td>

                            <td className="px-4 py-3 text-slate-700">
                              {obtenerCliente(remision)}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {remision.destino || "-"}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoClase(
                                  remision.estado
                                )}`}
                              >
                                {estadoTexto(remision.estado)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Observaciones
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
              placeholder="Notas del viaje"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/viajes"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar viaje"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        required={required}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}