"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";

type Viaje = {
  id: string;
  folio: string;
  fecha: string;
  chofer_nombre: string;
  camion: string | null;
  ruta: string | null;
  estado: string;
};

type RemisionCarga = {
  remision_id: string;
  remision_folio: string;
  cliente_nombre: string;
  destino: string;
  item_id: string;
  producto_id: string;
  producto_nombre: string;
  cajas: number;
  bobinas: number;
  kilos: number;
  piezas: number;
};

type CapturaCarga = {
  key: string;
  remision_id: string;
  item_id: string;
  producto_id: string;
  cajas_remision: number;
  bobinas_remision: number;
  kilos_remision: number;
  piezas_remision: number;
  cajas_cargadas: string;
  bobinas_cargadas: string;
  kilos_cargados: string;
  piezas_cargadas: string;
  motivo_diferencia: string;
};

type CargaExistente = {
  viaje_id: string;
  remision_id: string;
  producto_id: string;

  cajas_remision: number | null;
  bobinas_remision: number | null;
  kilos_remision: number | null;
  piezas_remision: number | null;

  cajas_cargadas: number | null;
  bobinas_cargadas: number | null;
  kilos_cargados: number | null;
  piezas_cargadas: number | null;

  diferencia_detectada: boolean | null;
  motivo_diferencia: string | null;
};

type RelacionViajeRemision = {
  remision_id: string;
  remisiones:
    | {
        id: string;
        folio: string;
        destino: string | null;
        clientes: { nombre: string | null }[] | { nombre: string | null } | null;
        remision_items: {
          id: string;
          producto_id: string;
          cajas: number | null;
          bobinas: number | null;
          kilos: number | null;
          piezas: number | null;
          productos:
            | { nombre: string | null }[]
            | { nombre: string | null }
            | null;
        }[];
      }
    | null;
};

function obtenerParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function CapturaCargaPage() {
  const router = useRouter();
  const params = useParams();

  const viajeId = obtenerParam(params.viajeId);

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [remisiones, setRemisiones] = useState<RemisionCarga[]>([]);
  const [capturas, setCapturas] = useState<CapturaCarga[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const esEdicion = viaje?.estado === "cargado";

  useEffect(() => {
    if (viajeId) {
      cargarDatos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viajeId]);

  async function cargarDatos() {
    setLoading(true);
    setErrorMsg("");

    const { data: viajeData, error: viajeError } = await supabase
      .from("viajes")
      .select("id, folio, fecha, chofer_nombre, camion, ruta, estado")
      .eq("id", viajeId)
      .maybeSingle();

    if (viajeError || !viajeData) {
      console.error("Error cargando viaje:", viajeError);
      setErrorMsg("No se encontró el viaje.");
      setViaje(null);
      setRemisiones([]);
      setCapturas([]);
      setLoading(false);
      return;
    }

    setViaje(viajeData as Viaje);

    const { data: relacionesData, error: relacionesError } = await supabase
      .from("viaje_remisiones")
      .select(
        `
        remision_id,
        remisiones!inner (
          id,
          folio,
          destino,
          clientes (
            nombre
          ),
          remision_items (
            id,
            producto_id,
            cajas,
            bobinas,
            kilos,
            piezas,
            productos (
              nombre
            )
          )
        )
      `
      )
      .eq("viaje_id", viajeId);

    if (relacionesError) {
      console.error("Error cargando remisiones del viaje:", relacionesError);
      setErrorMsg("No se pudieron cargar las remisiones del viaje.");
      setRemisiones([]);
      setCapturas([]);
      setLoading(false);
      return;
    }

    const { data: cargaExistenteData, error: cargaExistenteError } =
      await supabase
        .from("carga_items")
        .select(
          `
          viaje_id,
          remision_id,
          producto_id,
          cajas_remision,
          bobinas_remision,
          kilos_remision,
          piezas_remision,
          cajas_cargadas,
          bobinas_cargadas,
          kilos_cargados,
          piezas_cargadas,
          diferencia_detectada,
          motivo_diferencia
        `
        )
        .eq("viaje_id", viajeId);

    if (cargaExistenteError) {
      console.error("Error cargando carga existente:", cargaExistenteError);
    }

    const cargasExistentes = (cargaExistenteData ||
      []) as unknown as CargaExistente[];

    const relaciones = (relacionesData ||
      []) as unknown as RelacionViajeRemision[];

    const filas: RemisionCarga[] = [];

    relaciones.forEach((relacion) => {
      const remision = relacion.remisiones;

      if (!remision) return;

      remision.remision_items.forEach((item) => {
        filas.push({
          remision_id: remision.id,
          remision_folio: remision.folio,
          cliente_nombre: obtenerCliente(remision.clientes),
          destino: remision.destino || "-",
          item_id: item.id,
          producto_id: item.producto_id,
          producto_nombre: obtenerProducto(item.productos),
          cajas: Number(item.cajas || 0),
          bobinas: Number(item.bobinas || 0),
          kilos: Number(item.kilos || 0),
          piezas: Number(item.piezas || 0),
        });
      });
    });

    setRemisiones(filas);

    setCapturas(
      filas.map((fila) => {
        const cargaExistente = cargasExistentes.find(
          (item) =>
            item.remision_id === fila.remision_id &&
            item.producto_id === fila.producto_id
        );

        return {
          key: `${fila.remision_id}-${fila.item_id}-${fila.producto_id}`,
          remision_id: fila.remision_id,
          item_id: fila.item_id,
          producto_id: fila.producto_id,

          cajas_remision: cargaExistente
            ? Number(cargaExistente.cajas_remision || 0)
            : fila.cajas,
          bobinas_remision: cargaExistente
            ? Number(cargaExistente.bobinas_remision || 0)
            : fila.bobinas,
          kilos_remision: cargaExistente
            ? Number(cargaExistente.kilos_remision || 0)
            : fila.kilos,
          piezas_remision: cargaExistente
            ? Number(cargaExistente.piezas_remision || 0)
            : fila.piezas,

          cajas_cargadas: cargaExistente
            ? String(Number(cargaExistente.cajas_cargadas || 0))
            : String(fila.cajas),
          bobinas_cargadas: cargaExistente
            ? String(Number(cargaExistente.bobinas_cargadas || 0))
            : String(fila.bobinas),
          kilos_cargados: cargaExistente
            ? String(Number(cargaExistente.kilos_cargados || 0))
            : String(fila.kilos),
          piezas_cargadas: cargaExistente
            ? String(Number(cargaExistente.piezas_cargadas || 0))
            : String(fila.piezas),

          motivo_diferencia: cargaExistente?.motivo_diferencia || "",
        };
      })
    );

    setLoading(false);
  }

  function obtenerCliente(
    clientes: { nombre: string | null }[] | { nombre: string | null } | null
  ) {
    if (Array.isArray(clientes)) {
      return clientes[0]?.nombre || "-";
    }

    return clientes?.nombre || "-";
  }

  function obtenerProducto(
    productos: { nombre: string | null }[] | { nombre: string | null } | null
  ) {
    if (Array.isArray(productos)) {
      return productos[0]?.nombre || "-";
    }

    return productos?.nombre || "-";
  }

  function actualizarCaptura(
    key: string,
    campo:
      | "cajas_cargadas"
      | "bobinas_cargadas"
      | "kilos_cargados"
      | "piezas_cargadas"
      | "motivo_diferencia",
    valor: string
  ) {
    setCapturas((actuales) =>
      actuales.map((item) =>
        item.key === key
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  }

  function toNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function tieneDiferencia(captura: CapturaCarga) {
    return (
      toNumber(captura.cajas_cargadas) !== captura.cajas_remision ||
      toNumber(captura.bobinas_cargadas) !== captura.bobinas_remision ||
      toNumber(captura.kilos_cargados) !== captura.kilos_remision ||
      toNumber(captura.piezas_cargadas) !== captura.piezas_remision
    );
  }

  function tieneNegativos(captura: CapturaCarga) {
    return (
      toNumber(captura.cajas_cargadas) < 0 ||
      toNumber(captura.bobinas_cargadas) < 0 ||
      toNumber(captura.kilos_cargados) < 0 ||
      toNumber(captura.piezas_cargadas) < 0
    );
  }

  function formatearFecha(fecha: string | null) {
    if (!fecha) return "-";

    const date = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return fecha;
    }

    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function formatNumber(value: number | string | null | undefined) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("es-MX", {
      maximumFractionDigits: 3,
    }).format(number);
  }

  function totalDiferencias() {
    return capturas.filter((captura) => tieneDiferencia(captura)).length;
  }

  function totalRemisionesUnicas() {
    return new Set(remisiones.map((item) => item.remision_id)).size;
  }

  async function confirmarCarga(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setErrorMsg("");

    if (!viajeId) {
      setErrorMsg("No se encontró el identificador del viaje.");
      setSaving(false);
      return;
    }

    if (capturas.length === 0) {
      setErrorMsg("Este viaje no tiene mercancía para cargar.");
      setSaving(false);
      return;
    }

    const capturaConNegativos = capturas.find((captura) =>
      tieneNegativos(captura)
    );

    if (capturaConNegativos) {
      setErrorMsg("No puedes capturar cantidades negativas en la carga.");
      setSaving(false);
      return;
    }

    const capturaConDiferenciaSinMotivo = capturas.find(
      (captura) =>
        tieneDiferencia(captura) && !captura.motivo_diferencia.trim()
    );

    if (capturaConDiferenciaSinMotivo) {
      setErrorMsg(
        "Hay diferencias de carga. Captura el motivo de la diferencia."
      );
      setSaving(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id || null;

    const registros = capturas.map((captura) => ({
      viaje_id: viajeId,
      remision_id: captura.remision_id,
      producto_id: captura.producto_id,

      cajas_remision: captura.cajas_remision,
      bobinas_remision: captura.bobinas_remision,
      kilos_remision: captura.kilos_remision,
      piezas_remision: captura.piezas_remision,

      cajas_cargadas: toNumber(captura.cajas_cargadas),
      bobinas_cargadas: toNumber(captura.bobinas_cargadas),
      kilos_cargados: toNumber(captura.kilos_cargados),
      piezas_cargadas: toNumber(captura.piezas_cargadas),

      diferencia_detectada: tieneDiferencia(captura),
      motivo_diferencia: captura.motivo_diferencia.trim() || null,
      confirmado_por: userId,
      confirmado_at: new Date().toISOString(),
    }));

    const { error: cargaError } = await supabase
      .from("carga_items")
      .upsert(registros, {
        onConflict: "viaje_id,remision_id,producto_id",
      });

    if (cargaError) {
      console.error("Error guardando carga:", cargaError);
      setErrorMsg("No se pudo guardar la carga.");
      setSaving(false);
      return;
    }

    const remisionIds = [...new Set(capturas.map((item) => item.remision_id))];

    const { error: viajeError } = await supabase
      .from("viajes")
      .update({
        estado: "cargado",
      })
      .eq("id", viajeId);

    if (viajeError) {
      console.error("Error actualizando viaje:", viajeError);
      setErrorMsg(
        "Se guardó la carga, pero no se pudo actualizar el estado del viaje."
      );
      setSaving(false);
      return;
    }

    for (const remisionId of remisionIds) {
      const capturasRemision = capturas.filter(
        (item) => item.remision_id === remisionId
      );

      const remisionTieneDiferencia = capturasRemision.some((item) =>
        tieneDiferencia(item)
      );

      const { error: remisionError } = await supabase
        .from("remisiones")
        .update({
          estado: remisionTieneDiferencia ? "con_diferencia" : "cargada",
        })
        .eq("id", remisionId);

      if (remisionError) {
        console.error("Error actualizando remisión:", remisionError);
        setErrorMsg(
          "Se guardó la carga, pero no se pudo actualizar el estado de una o más remisiones."
        );
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push("/cargas");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">
        <AppNav />

        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            Cargando carga del viaje...
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {esEdicion ? "Ver / editar carga" : "Capturar carga"}
            </h1>
            <p className="text-sm text-slate-500">
              Confirma las cantidades reales que se suben al camión.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {viaje?.estado === "cargado" && (
              <Link
                href={`/entregas/${viajeId}`}
                className="inline-flex rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
              >
                Registrar entrega
              </Link>
            )}

            <Link
              href="/cargas"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Regresar a cargas
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {viaje && (
          <div className="mb-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Viaje
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {viaje.folio}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Fecha: {formatearFecha(viaje.fecha)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Chofer / camión
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {viaje.chofer_nombre}
              </p>
              <p className="text-sm text-slate-500">{viaje.camion || "-"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Resumen
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Remisiones:{" "}
                <span className="font-bold">{totalRemisionesUnicas()}</span>
              </p>
              <p className="text-sm text-slate-700">
                Productos:{" "}
                <span className="font-bold">{remisiones.length}</span>
              </p>
              <p className="text-sm text-slate-700">
                Diferencias:{" "}
                <span
                  className={
                    totalDiferencias() > 0
                      ? "font-bold text-red-600"
                      : "font-bold text-green-600"
                  }
                >
                  {totalDiferencias()}
                </span>
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={confirmarCarga}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-900">
              Mercancía a cargar
            </h3>
            <p className="text-sm text-slate-500">
              Las cantidades cargadas vienen inicialmente iguales a la remisión.
              Si cambia algo, captura la diferencia y el motivo.
            </p>
          </div>

          {remisiones.length === 0 ? (
            <div className="p-6 text-slate-500">
              Este viaje no tiene remisiones asignadas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      Remisión
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Cajas rem.
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Cajas carg.
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Bobinas rem.
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Bobinas carg.
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Kilos rem.
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Kilos carg.
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Piezas rem.
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Piezas carg.
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Motivo diferencia
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {remisiones.map((fila) => {
                    const key = `${fila.remision_id}-${fila.item_id}-${fila.producto_id}`;

                    const captura = capturas.find((item) => item.key === key);

                    if (!captura) return null;

                    const diferencia = tieneDiferencia(captura);

                    return (
                      <tr
                        key={key}
                        className={
                          diferencia ? "bg-red-50/50" : "hover:bg-slate-50"
                        }
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div>{fila.remision_folio}</div>
                          <div className="mt-1 text-xs font-normal text-slate-500">
                            {fila.destino}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {fila.cliente_nombre}
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {fila.producto_nombre}
                        </td>

                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(captura.cajas_remision)}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-right"
                            value={captura.cajas_cargadas}
                            onChange={(event) =>
                              actualizarCaptura(
                                captura.key,
                                "cajas_cargadas",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(captura.bobinas_remision)}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-right"
                            value={captura.bobinas_cargadas}
                            onChange={(event) =>
                              actualizarCaptura(
                                captura.key,
                                "bobinas_cargadas",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(captura.kilos_remision)}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-right"
                            value={captura.kilos_cargados}
                            onChange={(event) =>
                              actualizarCaptura(
                                captura.key,
                                "kilos_cargados",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatNumber(captura.piezas_remision)}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-right"
                            value={captura.piezas_cargadas}
                            onChange={(event) =>
                              actualizarCaptura(
                                captura.key,
                                "piezas_cargadas",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className={
                              diferencia
                                ? "w-64 rounded-lg border border-red-300 bg-white px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                : "w-64 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            }
                            placeholder={
                              diferencia
                                ? "Motivo obligatorio"
                                : "Sin diferencia"
                            }
                            value={captura.motivo_diferencia}
                            onChange={(event) =>
                              actualizarCaptura(
                                captura.key,
                                "motivo_diferencia",
                                event.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
            <Link
              href="/cargas"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving || remisiones.length === 0}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {saving
                ? "Guardando..."
                : esEdicion
                  ? "Guardar cambios"
                  : "Confirmar carga"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}