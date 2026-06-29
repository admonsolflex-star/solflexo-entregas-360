"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";

type Cliente = {
  id: string;
  codigo_cliente: string;
  nombre: string;
};

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
  estado: string;
  destino: string;
  cliente_id: string;
  fecha_programada_entrega: string | null;
  created_at: string;
  clientes: ClienteRelacion;
};

export default function NuevaFacturacionPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [remisiones, setRemisiones] = useState<RemisionDisponible[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [remisionesSeleccionadas, setRemisionesSeleccionadas] = useState<
    string[]
  >([]);

  const [serieFactura, setSerieFactura] = useState("");
  const [folioFactura, setFolioFactura] = useState("");
  const [uuidFiscal, setUuidFiscal] = useState("");
  const [fechaFactura, setFechaFactura] = useState("");
  const [importeFacturado, setImporteFacturado] = useState("");
  const [estado, setEstado] = useState("registrada");
  const [observaciones, setObservaciones] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    cargarDatosIniciales();

    const hoy = new Date().toISOString().slice(0, 10);
    setFechaFactura(hoy);
  }, []);

  const remisionesFiltradas = useMemo(() => {
    if (!clienteId) return remisiones;

    return remisiones.filter((remision) => remision.cliente_id === clienteId);
  }, [remisiones, clienteId]);

  async function cargarDatosIniciales() {
    setLoading(true);

    const [
      { data: clientesData, error: clientesError },
      { data: remisionesData, error: remisionesError },
    ] = await Promise.all([
      supabase
        .from("clientes")
        .select("id, codigo_cliente, nombre")
        .eq("activo", true)
        .order("nombre", { ascending: true }),

      supabase
        .from("remisiones")
        .select(
          `
          id,
          folio,
          estado,
          destino,
          cliente_id,
          fecha_programada_entrega,
          created_at,
          clientes (
            nombre
          )
        `
        )
        .in("estado", ["entregada_completa"])
        .order("created_at", { ascending: false }),
    ]);

    if (clientesError) {
      console.error("Error cargando clientes:", clientesError);
    }

    if (remisionesError) {
      console.error("Error cargando remisiones para facturar:", remisionesError);
    }

    setClientes((clientesData || []) as Cliente[]);
    setRemisiones((remisionesData || []) as unknown as RemisionDisponible[]);
    setLoading(false);
  }

  function seleccionarCliente(id: string) {
    setClienteId(id);
    setRemisionesSeleccionadas([]);
  }

  function toggleRemision(id: string) {
    setRemisionesSeleccionadas((actuales) => {
      if (actuales.includes(id)) {
        return actuales.filter((item) => item !== id);
      }

      return [...actuales, id];
    });
  }

  function seleccionarTodasFiltradas() {
    setRemisionesSeleccionadas(
      remisionesFiltradas.map((remision) => remision.id)
    );
  }

  function limpiarSeleccion() {
    setRemisionesSeleccionadas([]);
  }

  function toNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function clienteNombre(remision: RemisionDisponible) {
    if (Array.isArray(remision.clientes)) {
      return remision.clientes[0]?.nombre || "-";
    }

    return remision.clientes?.nombre || "-";
  }

  function estadoRemisionTexto(estadoRemision: string) {
    const estados: Record<string, string> = {
      entregada_completa: "Entregada completa",
    };

    return estados[estadoRemision] || estadoRemision;
  }

  function estadoRemisionClase() {
    return "bg-green-50 text-green-700";
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

  async function guardarFactura(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setErrorMsg("");

    if (!clienteId) {
      setErrorMsg("Selecciona un cliente.");
      setSaving(false);
      return;
    }

    if (!folioFactura.trim()) {
      setErrorMsg("Captura el número de factura.");
      setSaving(false);
      return;
    }

    if (!fechaFactura) {
      setErrorMsg("Captura la fecha de factura.");
      setSaving(false);
      return;
    }

    if (remisionesSeleccionadas.length === 0) {
      setErrorMsg("Selecciona al menos una remisión entregada.");
      setSaving(false);
      return;
    }

    const remisionesDeOtroCliente = remisionesSeleccionadas.some((id) => {
      const remision = remisiones.find((item) => item.id === id);
      return remision && remision.cliente_id !== clienteId;
    });

    if (remisionesDeOtroCliente) {
      setErrorMsg(
        "Todas las remisiones seleccionadas deben ser del mismo cliente."
      );
      setSaving(false);
      return;
    }

    const remisionesNoFacturables = remisionesSeleccionadas.some((id) => {
      const remision = remisiones.find((item) => item.id === id);
      return remision && remision.estado !== "entregada_completa";
    });

    if (remisionesNoFacturables) {
      setErrorMsg("Sólo se pueden facturar remisiones entregadas completas.");
      setSaving(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id || null;

    const importe = toNumber(importeFacturado);

    const { data: facturaCreada, error: facturaError } = await supabase
      .from("facturas")
      .insert({
        folio_factura: folioFactura.trim(),
        serie_factura: serieFactura.trim() || null,
        uuid_fiscal: uuidFiscal.trim() || null,
        cliente_id: clienteId,
        fecha_factura: fechaFactura,
        importe_facturado: importe,
        subtotal: 0,
        iva: 0,
        total: importe,
        estado,
        observaciones: observaciones.trim() || null,
        registrado_por: userId,
        registrado_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (facturaError || !facturaCreada) {
      console.error("Error registrando factura:", facturaError);
      setErrorMsg(
        "No se pudo registrar la factura. Revisa si el folio ya existe."
      );
      setSaving(false);
      return;
    }

    const relaciones = remisionesSeleccionadas.map((remisionId) => ({
      factura_id: facturaCreada.id,
      remision_id: remisionId,
    }));

    const { error: relacionError } = await supabase
      .from("factura_remisiones")
      .insert(relaciones);

    if (relacionError) {
      console.error("Error ligando remisiones a factura:", relacionError);
      setErrorMsg(
        "Se registró la factura, pero no se pudieron ligar las remisiones."
      );
      setSaving(false);
      return;
    }

    const nuevoEstadoRemision =
      estado === "cancelada" ? "entregada_completa" : "facturada";

    const { error: remisionesError } = await supabase
      .from("remisiones")
      .update({
        estado: nuevoEstadoRemision,
      })
      .in("id", remisionesSeleccionadas);

    if (remisionesError) {
      console.error("Error actualizando remisiones:", remisionesError);
    }

    setSaving(false);
    router.push("/facturacion");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Registrar factura
            </h1>
            <p className="text-sm text-slate-500">
              Liga una factura externa con una o varias remisiones entregadas.
            </p>
          </div>

          <Link
            href="/facturacion"
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Regresar a facturación
          </Link>
        </div>

        <form
          onSubmit={guardarFactura}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Datos de factura externa
            </h2>
            <p className="text-sm text-slate-500">
              Captura el número de factura emitida en el sistema de facturación
              y relaciónala con remisiones entregadas completas.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Cargando clientes y remisiones...
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Cliente
                  </label>

                  <select
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    value={clienteId}
                    onChange={(event) => seleccionarCliente(event.target.value)}
                  >
                    <option value="">Selecciona cliente</option>

                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.codigo_cliente} - {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <CampoTexto
                  label="Fecha factura"
                  value={fechaFactura}
                  onChange={setFechaFactura}
                  type="date"
                  required
                />

                <CampoTexto
                  label="Serie factura opcional"
                  value={serieFactura}
                  onChange={setSerieFactura}
                  placeholder="Ejemplo: A"
                />

                <CampoTexto
                  label="Número de factura"
                  value={folioFactura}
                  onChange={setFolioFactura}
                  placeholder="Ejemplo: 12345"
                  required
                />

                <CampoTexto
                  label="UUID fiscal opcional"
                  value={uuidFiscal}
                  onChange={setUuidFiscal}
                  placeholder="UUID del CFDI si se desea capturar"
                />

                <CampoTexto
                  label="Importe facturado"
                  value={importeFacturado}
                  onChange={setImporteFacturado}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Estado
                  </label>

                  <select
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    value={estado}
                    onChange={(event) => setEstado(event.target.value)}
                  >
                    <option value="registrada">Registrada</option>
                    <option value="pendiente_revision">
                      Pendiente revisión
                    </option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Remisiones entregadas
                    </h3>
                    <p className="text-sm text-slate-500">
                      Sólo aparecen remisiones entregadas completas que todavía
                      no han sido facturadas.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={seleccionarTodasFiltradas}
                      disabled={remisionesFiltradas.length === 0}
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

                {!clienteId ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    Selecciona un cliente para ver sus remisiones disponibles.
                  </div>
                ) : remisionesFiltradas.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    No hay remisiones entregadas completas disponibles para este
                    cliente.
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
                              Remisión
                            </th>

                            <th className="px-4 py-3 text-left font-semibold">
                              Cliente
                            </th>

                            <th className="px-4 py-3 text-left font-semibold">
                              Fecha entrega
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
                          {remisionesFiltradas.map((remision) => {
                            const seleccionada =
                              remisionesSeleccionadas.includes(remision.id);

                            return (
                              <tr
                                key={remision.id}
                                className={
                                  seleccionada
                                    ? "bg-sky-50 hover:bg-sky-50"
                                    : "hover:bg-slate-50"
                                }
                              >
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={seleccionada}
                                    onChange={() => toggleRemision(remision.id)}
                                    className="h-4 w-4"
                                  />
                                </td>

                                <td className="px-4 py-3 font-semibold text-slate-900">
                                  {remision.folio}
                                </td>

                                <td className="px-4 py-3 text-slate-700">
                                  {clienteNombre(remision)}
                                </td>

                                <td className="px-4 py-3 text-slate-600">
                                  {formatearFecha(
                                    remision.fecha_programada_entrega ||
                                      remision.created_at?.slice(0, 10)
                                  )}
                                </td>

                                <td className="px-4 py-3 text-slate-600">
                                  {remision.destino || "-"}
                                </td>

                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoRemisionClase()}`}
                                  >
                                    {estadoRemisionTexto(remision.estado)}
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
                  placeholder="Notas internas sobre la factura o la remisión"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Link
                  href="/facturacion"
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar factura"}
                </button>
              </div>
            </>
          )}
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
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        step={step}
        required={required}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}