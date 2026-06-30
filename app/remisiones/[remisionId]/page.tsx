"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppNav from "@/components/AppNav";
import { supabase } from "@/lib/supabase/client";
import { useUserRole } from "@/lib/auth/useUserRole";
import { canPrint, canReprogramRemision } from "@/lib/auth/permissions";

type ClienteRelacion =
  | {
      id: string;
      codigo_cliente: string | null;
      nombre: string | null;
      rfc: string | null;
      correo: string | null;
      telefono: string | null;
      direccion: string | null;
      ciudad: string | null;
      estado: string | null;
      codigo_postal: string | null;
      origen: string | null;
      produccion_cliente_id: string | null;
    }[]
  | {
      id: string;
      codigo_cliente: string | null;
      nombre: string | null;
      rfc: string | null;
      correo: string | null;
      telefono: string | null;
      direccion: string | null;
      ciudad: string | null;
      estado: string | null;
      codigo_postal: string | null;
      origen: string | null;
      produccion_cliente_id: string | null;
    }
  | null;

type DireccionEntregaRelacion =
  | {
      id: string;
      nombre_direccion: string | null;
      direccion: string | null;
      ciudad: string | null;
      estado: string | null;
      codigo_postal: string | null;
      contacto: string | null;
      telefono: string | null;
      referencias: string | null;
      origen: string | null;
      produccion_cliente_id: string | null;
      produccion_direccion_key: string | null;
    }[]
  | {
      id: string;
      nombre_direccion: string | null;
      direccion: string | null;
      ciudad: string | null;
      estado: string | null;
      codigo_postal: string | null;
      contacto: string | null;
      telefono: string | null;
      referencias: string | null;
      origen: string | null;
      produccion_cliente_id: string | null;
      produccion_direccion_key: string | null;
    }
  | null;

type ProductoRelacion =
  | {
      id: string;
      codigo_producto: string | null;
      nombre: string | null;
      tipo_producto: string | null;
      unidad_principal: string | null;
      origen: string | null;
      produccion_producto_id: string | null;
      produccion_customer_id: string | null;
    }[]
  | {
      id: string;
      codigo_producto: string | null;
      nombre: string | null;
      tipo_producto: string | null;
      unidad_principal: string | null;
      origen: string | null;
      produccion_producto_id: string | null;
      produccion_customer_id: string | null;
    }
  | null;

type RemisionItem = {
  id: string;
  cajas: number | null;
  bobinas: number | null;
  kilos: number | null;
  piezas: number | null;
  descripcion_extra: string | null;
  produccion_product_id: string | null;
  produccion_finished_good_id: string | null;
  productos: ProductoRelacion;
};

type Remision = {
  id: string;
  folio: string;
  fecha_remision: string | null;
  fecha_programada_entrega: string | null;
  destino: string | null;
  direccion_entrega: string | null;
  ciudad_entrega: string | null;
  estado_entrega: string | null;
  codigo_postal_entrega: string | null;
  contacto_entrega: string | null;
  telefono_entrega: string | null;
  estado: string;
  observaciones: string | null;

  orden_produccion_folio: string | null;
  orden_compra_folio: string | null;

  produccion_order_id: string | null;
  produccion_order_folio: string | null;
  produccion_finished_good_id: string | null;
  integration_source: string | null;
  integration_payload: any | null;
  integration_created_at: string | null;

  created_at: string | null;
  updated_at: string | null;

  clientes: ClienteRelacion;
  cliente_direcciones_entrega: DireccionEntregaRelacion;
  remision_items: RemisionItem[];
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatNumber(value: number | string | null | undefined) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 3,
  }).format(number);
}

function formatearFecha(fecha: string | null | undefined) {
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

function formatearFechaHora(fecha: string | null | undefined) {
  if (!fecha) return "-";

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return fecha;
  }

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function origenTexto(remision: Remision) {
  if (remision.integration_source === "PRODUCCION_360") {
    return "Producción 360";
  }

  return "Manual";
}

function origenClase(remision: Remision) {
  if (remision.integration_source === "PRODUCCION_360") {
    return "bg-purple-50 text-purple-700";
  }

  return "bg-slate-100 text-slate-700";
}

function obtenerRemisionIdFromParams(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}

export default function RemisionDetallePage() {
  const params = useParams();
  const remisionId = obtenerRemisionIdFromParams(params?.remisionId);

  const { role, loadingRole } = useUserRole();

  const [remision, setRemision] = useState<Remision | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [reprogramando, setReprogramando] = useState(false);

  const puedeImprimir = !loadingRole && canPrint(role, "remisiones");
  const puedeReprogramar = !loadingRole && canReprogramRemision(role);

  useEffect(() => {
    if (remisionId) {
      cargarRemision();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remisionId]);

  async function cargarRemision() {
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
        direccion_entrega,
        ciudad_entrega,
        estado_entrega,
        codigo_postal_entrega,
        contacto_entrega,
        telefono_entrega,
        estado,
        observaciones,
        orden_produccion_folio,
        orden_compra_folio,
        produccion_order_id,
        produccion_order_folio,
        produccion_finished_good_id,
        integration_source,
        integration_payload,
        integration_created_at,
        created_at,
        updated_at,
        clientes (
          id,
          codigo_cliente,
          nombre,
          rfc,
          correo,
          telefono,
          direccion,
          ciudad,
          estado,
          codigo_postal,
          origen,
          produccion_cliente_id
        ),
        cliente_direcciones_entrega (
          id,
          nombre_direccion,
          direccion,
          ciudad,
          estado,
          codigo_postal,
          contacto,
          telefono,
          referencias,
          origen,
          produccion_cliente_id,
          produccion_direccion_key
        ),
        remision_items (
          id,
          cajas,
          bobinas,
          kilos,
          piezas,
          descripcion_extra,
          produccion_product_id,
          produccion_finished_good_id,
          productos (
            id,
            codigo_producto,
            nombre,
            tipo_producto,
            unidad_principal,
            origen,
            produccion_producto_id,
            produccion_customer_id
          )
        )
      `
      )
      .eq("id", remisionId)
      .maybeSingle();

    if (error) {
      console.error("Error cargando remisión:", error);
      setErrorMsg("No se pudo cargar la remisión.");
      setRemision(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setErrorMsg("No se encontró la remisión.");
      setRemision(null);
      setLoading(false);
      return;
    }

    setRemision(data as unknown as Remision);
    setLoading(false);
  }

  async function reprogramarRemision() {
    if (!remision) return;

    if (!puedeReprogramar) {
      setErrorMsg("No tienes permiso para reprogramar remisiones.");
      return;
    }

    const confirmado = window.confirm(
      `¿Seguro que deseas reprogramar la remisión ${remision.folio}? Volverá a estado "Preparada" y podrá asignarse a un nuevo viaje.`
    );

    if (!confirmado) return;

    setReprogramando(true);
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
      setReprogramando(false);
      return;
    }

    setReprogramando(false);
    await cargarRemision();
  }

  const cliente = useMemo(
    () => normalizeRelation(remision?.clientes || null),
    [remision]
  );

  const direccion = useMemo(
    () => normalizeRelation(remision?.cliente_direcciones_entrega || null),
    [remision]
  );

  const totales = useMemo(() => {
    return (remision?.remision_items || []).reduce(
      (acc, item) => {
        acc.cajas += Number(item.cajas || 0);
        acc.bobinas += Number(item.bobinas || 0);
        acc.kilos += Number(item.kilos || 0);
        acc.piezas += Number(item.piezas || 0);
        return acc;
      },
      {
        cajas: 0,
        bobinas: 0,
        kilos: 0,
        piezas: 0,
      }
    );
  }, [remision]);

  const integrationPayload = remision?.integration_payload || null;

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/remisiones"
              className="text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              ← Volver a remisiones
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Detalle de remisión
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Consulta la información de entrega, partidas, origen e integración
              de la remisión.
            </p>
          </div>

          {remision ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={cargarRemision}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Actualizar
              </button>

              {puedeImprimir && (
                <Link
                  href={`/remisiones/${remision.id}/imprimir`}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Imprimir
                </Link>
              )}
            </div>
          ) : null}
        </div>

        {errorMsg ? (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMsg}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            Cargando remisión...
          </div>
        ) : !remision ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            No se encontró información para mostrar.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {remision.folio}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoClase(
                        remision.estado
                      )}`}
                    >
                      {estadoTexto(remision.estado)}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${origenClase(
                        remision
                      )}`}
                    >
                      {origenTexto(remision)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Creada: {formatearFechaHora(remision.created_at)}
                  </p>

                  {remision.integration_created_at ? (
                    <p className="mt-1 text-sm text-purple-700">
                      Recibida por integración:{" "}
                      {formatearFechaHora(remision.integration_created_at)}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {puedeReprogramar && remision.estado === "rechazada" ? (
                    <button
                      type="button"
                      onClick={reprogramarRemision}
                      disabled={reprogramando}
                      className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-800 hover:bg-yellow-100 disabled:opacity-60"
                    >
                      {reprogramando ? "Reprogramando..." : "Reprogramar"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <InfoRow
                  label="Fecha remisión"
                  value={formatearFecha(remision.fecha_remision)}
                />
                <InfoRow
                  label="Fecha programada entrega"
                  value={formatearFecha(remision.fecha_programada_entrega)}
                />
                <InfoRow
                  label="OP"
                  value={
                    remision.produccion_order_folio ||
                    remision.orden_produccion_folio
                  }
                />
                <InfoRow label="OC" value={remision.orden_compra_folio} />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Cliente</h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoRow
                    label="Código"
                    value={cliente?.codigo_cliente || "-"}
                  />
                  <InfoRow label="Nombre" value={cliente?.nombre || "-"} />
                  <InfoRow label="RFC" value={cliente?.rfc || "-"} />
                  <InfoRow label="Teléfono" value={cliente?.telefono || "-"} />
                  <InfoRow label="Correo" value={cliente?.correo || "-"} />
                  <InfoRow
                    label="Origen"
                    value={cliente?.origen || remision.integration_source || "-"}
                  />
                </div>

                <div className="mt-4">
                  <InfoRow
                    label="Dirección fiscal / general"
                    value={[
                      cliente?.direccion,
                      cliente?.ciudad,
                      cliente?.estado,
                      cliente?.codigo_postal,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Dirección de entrega
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoRow
                    label="Nombre"
                    value={
                      direccion?.nombre_direccion ||
                      remision.destino ||
                      "Entrega programada"
                    }
                  />
                  <InfoRow
                    label="Contacto"
                    value={direccion?.contacto || remision.contacto_entrega}
                  />
                  <InfoRow
                    label="Teléfono"
                    value={direccion?.telefono || remision.telefono_entrega}
                  />
                  <InfoRow
                    label="Origen"
                    value={direccion?.origen || remision.integration_source || "-"}
                  />
                </div>

                <div className="mt-4 space-y-4">
                  <InfoRow
                    label="Dirección"
                    value={
                      direccion?.direccion ||
                      remision.direccion_entrega ||
                      "Dirección por confirmar"
                    }
                  />

                  <InfoRow
                    label="Ciudad / Estado / CP"
                    value={[
                      direccion?.ciudad || remision.ciudad_entrega,
                      direccion?.estado || remision.estado_entrega,
                      direccion?.codigo_postal || remision.codigo_postal_entrega,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />

                  <InfoRow
                    label="Referencias"
                    value={direccion?.referencias || "-"}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-slate-900">Partidas</h2>

                <div className="grid grid-cols-4 gap-2 text-right text-xs text-slate-500">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {formatNumber(totales.cajas)}
                    </p>
                    <p>Cajas</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {formatNumber(totales.bobinas)}
                    </p>
                    <p>Bobinas</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {formatNumber(totales.kilos)}
                    </p>
                    <p>Kilos</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {formatNumber(totales.piezas)}
                    </p>
                    <p>Piezas</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Cajas
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Bobinas
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Kilos
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Piezas
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Observación
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {(remision.remision_items || []).map((item) => {
                      const producto = normalizeRelation(item.productos);

                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-4 align-top">
                            <p className="font-semibold text-slate-900">
                              {producto?.codigo_producto || "-"}
                            </p>
                            <p className="mt-1 text-slate-600">
                              {producto?.nombre || "Producto sin nombre"}
                            </p>

                            {producto?.produccion_producto_id ? (
                              <p className="mt-1 text-xs text-purple-600">
                                ID Producción:{" "}
                                {producto.produccion_producto_id.slice(0, 8)}
                                ...
                              </p>
                            ) : null}
                          </td>

                          <td className="px-4 py-4 text-right text-slate-700">
                            {formatNumber(item.cajas)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-700">
                            {formatNumber(item.bobinas)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-700">
                            {formatNumber(item.kilos)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-700">
                            {formatNumber(item.piezas)}
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {item.descripcion_extra || "-"}

                            {item.produccion_finished_good_id ? (
                              <p className="mt-1 text-xs text-purple-600">
                                PT Producción:{" "}
                                {item.produccion_finished_good_id.slice(0, 8)}
                                ...
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Datos de Producción 360
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoRow
                    label="Origen integración"
                    value={remision.integration_source || "Manual"}
                  />
                  <InfoRow
                    label="Fecha integración"
                    value={formatearFechaHora(remision.integration_created_at)}
                  />
                  <InfoRow
                    label="ID OP Producción"
                    value={remision.produccion_order_id}
                  />
                  <InfoRow
                    label="Folio OP Producción"
                    value={remision.produccion_order_folio}
                  />
                  <InfoRow
                    label="ID PT Producción"
                    value={remision.produccion_finished_good_id}
                  />
                  <InfoRow
                    label="OP visible"
                    value={remision.orden_produccion_folio}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Observaciones
                </h2>

                <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  {remision.observaciones || "Sin observaciones."}
                </p>
              </div>
            </div>

            {integrationPayload ? (
              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-purple-950">
                  Payload recibido desde Producción 360
                </h2>

                <p className="mt-1 text-sm text-purple-800">
                  Este bloque sirve para auditoría técnica de la integración.
                </p>

                <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-white p-4 text-xs text-slate-800">
                  {JSON.stringify(integrationPayload, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}