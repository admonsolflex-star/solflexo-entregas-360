"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";
import { useUserRole } from "@/lib/auth/useUserRole";
import { canCreate } from "@/lib/auth/permissions";

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

type ViajeRelacion =
  | {
      folio: string;
      chofer_nombre: string;
      camion: string | null;
      ruta: string | null;
    }[]
  | {
      folio: string;
      chofer_nombre: string;
      camion: string | null;
      ruta: string | null;
    }
  | null;

type RemisionPendienteFactura = {
  id: string;
  folio: string;
  estado: string;
  destino: string;
  created_at: string;
  clientes: ClienteRelacion;
};

type CargaDiferencia = {
  id: string;
  cajas_remision: number | null;
  cajas_cargadas: number | null;
  bobinas_remision: number | null;
  bobinas_cargadas: number | null;
  kilos_remision: number | null;
  kilos_cargados: number | null;
  piezas_remision: number | null;
  piezas_cargadas: number | null;
  diferencia_detectada: boolean;
  motivo_diferencia: string | null;
  remisiones:
    | {
        folio: string;
        estado: string;
        clientes: ClienteRelacion;
      }[]
    | {
        folio: string;
        estado: string;
        clientes: ClienteRelacion;
      }
    | null;
  viajes: ViajeRelacion;
  productos: ProductoRelacion;
};

type EntregaDiferencia = {
  id: string;
  cajas_cargadas: number | null;
  cajas_entregadas: number | null;
  cajas_rechazadas: number | null;
  bobinas_cargadas: number | null;
  bobinas_entregadas: number | null;
  bobinas_rechazadas: number | null;
  kilos_cargados: number | null;
  kilos_entregados: number | null;
  kilos_rechazados: number | null;
  piezas_cargadas: number | null;
  piezas_entregadas: number | null;
  piezas_rechazadas: number | null;
  diferencia_detectada: boolean;
  motivo_diferencia: string | null;
  recibido_por: string | null;
  fecha_entrega: string | null;
  remisiones:
    | {
        folio: string;
        estado: string;
        clientes: ClienteRelacion;
      }[]
    | {
        folio: string;
        estado: string;
        clientes: ClienteRelacion;
      }
    | null;
  viajes: ViajeRelacion;
  productos: ProductoRelacion;
};

type RemisionEstado = {
  id: string;
  folio: string;
  estado: string;
  destino: string;
  created_at: string;
  clientes: ClienteRelacion;
};

type RemisionFacturaRelacion =
  | {
      folio: string;
      estado: string;
    }[]
  | {
      folio: string;
      estado: string;
    }
  | null;

type FacturaRegistrada = {
  id: string;
  folio_factura: string;
  serie_factura: string | null;
  fecha_factura: string;
  importe_facturado: number | null;
  estado: string;
  clientes: ClienteRelacion;
  factura_remisiones: {
    remisiones: RemisionFacturaRelacion;
  }[];
};

export default function ConciliacionPage() {
  const { role, loadingRole } = useUserRole();

  const [pendientesFactura, setPendientesFactura] = useState<
    RemisionPendienteFactura[]
  >([]);
  const [diferenciasCarga, setDiferenciasCarga] = useState<CargaDiferencia[]>(
    []
  );
  const [diferenciasEntrega, setDiferenciasEntrega] = useState<
    EntregaDiferencia[]
  >([]);
  const [rechazadas, setRechazadas] = useState<RemisionEstado[]>([]);
  const [facturadas, setFacturadas] = useState<FacturaRegistrada[]>([]);

  const [loading, setLoading] = useState(true);

  const puedeRegistrarFactura = !loadingRole && canCreate(role, "facturacion");

  useEffect(() => {
    cargarConciliacion();
  }, []);

  async function cargarConciliacion() {
    setLoading(true);

    await Promise.all([
      cargarPendientesFactura(),
      cargarDiferenciasCarga(),
      cargarDiferenciasEntrega(),
      cargarRechazadas(),
      cargarFacturadas(),
    ]);

    setLoading(false);
  }

  async function cargarPendientesFactura() {
    const { data, error } = await supabase
      .from("remisiones")
      .select(
        `
        id,
        folio,
        estado,
        destino,
        created_at,
        clientes (
          nombre
        )
      `
      )
      .eq("estado", "entregada_completa")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando pendientes de factura:", error);
      setPendientesFactura([]);
      return;
    }

    setPendientesFactura((data || []) as unknown as RemisionPendienteFactura[]);
  }

  async function cargarDiferenciasCarga() {
    const { data, error } = await supabase
      .from("carga_items")
      .select(
        `
        id,
        cajas_remision,
        cajas_cargadas,
        bobinas_remision,
        bobinas_cargadas,
        kilos_remision,
        kilos_cargados,
        piezas_remision,
        piezas_cargadas,
        diferencia_detectada,
        motivo_diferencia,
        remisiones (
          folio,
          estado,
          clientes (
            nombre
          )
        ),
        viajes (
          folio,
          chofer_nombre,
          camion,
          ruta
        ),
        productos (
          nombre
        )
      `
      )
      .eq("diferencia_detectada", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando diferencias de carga:", error);
      setDiferenciasCarga([]);
      return;
    }

    setDiferenciasCarga((data || []) as unknown as CargaDiferencia[]);
  }

  async function cargarDiferenciasEntrega() {
    const { data, error } = await supabase
      .from("entrega_items")
      .select(
        `
        id,
        cajas_cargadas,
        cajas_entregadas,
        cajas_rechazadas,
        bobinas_cargadas,
        bobinas_entregadas,
        bobinas_rechazadas,
        kilos_cargados,
        kilos_entregados,
        kilos_rechazados,
        piezas_cargadas,
        piezas_entregadas,
        piezas_rechazadas,
        diferencia_detectada,
        motivo_diferencia,
        recibido_por,
        fecha_entrega,
        remisiones (
          folio,
          estado,
          clientes (
            nombre
          )
        ),
        viajes (
          folio,
          chofer_nombre,
          camion,
          ruta
        ),
        productos (
          nombre
        )
      `
      )
      .eq("diferencia_detectada", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando material no entregado:", error);
      setDiferenciasEntrega([]);
      return;
    }

    setDiferenciasEntrega((data || []) as unknown as EntregaDiferencia[]);
  }

  async function cargarRechazadas() {
    const { data, error } = await supabase
      .from("remisiones")
      .select(
        `
        id,
        folio,
        estado,
        destino,
        created_at,
        clientes (
          nombre
        )
      `
      )
      .eq("estado", "rechazada")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando remisiones no entregadas:", error);
      setRechazadas([]);
      return;
    }

    setRechazadas((data || []) as unknown as RemisionEstado[]);
  }

  async function cargarFacturadas() {
    const { data, error } = await supabase
      .from("facturas")
      .select(
        `
        id,
        folio_factura,
        serie_factura,
        fecha_factura,
        importe_facturado,
        estado,
        clientes (
          nombre
        ),
        factura_remisiones (
          remisiones (
            folio,
            estado
          )
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error cargando facturas registradas:", error);
      setFacturadas([]);
      return;
    }

    setFacturadas((data || []) as unknown as FacturaRegistrada[]);
  }

  function obtenerCliente(cliente: ClienteRelacion) {
    if (Array.isArray(cliente)) {
      return cliente[0]?.nombre || "-";
    }

    return cliente?.nombre || "-";
  }

  function obtenerProducto(producto: ProductoRelacion) {
    if (Array.isArray(producto)) {
      return producto[0]?.nombre || "-";
    }

    return producto?.nombre || "-";
  }

  function obtenerViaje(viaje: ViajeRelacion) {
    if (Array.isArray(viaje)) {
      return viaje[0] || null;
    }

    return viaje || null;
  }

  function obtenerRemisionFactura(remision: RemisionFacturaRelacion) {
    if (Array.isArray(remision)) {
      return remision[0] || null;
    }

    return remision || null;
  }

  function formatoMoneda(valor: number | null) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(valor || 0));
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

  function facturaTexto(factura: FacturaRegistrada) {
    return factura.serie_factura
      ? `${factura.serie_factura}-${factura.folio_factura}`
      : factura.folio_factura;
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Conciliación
            </h1>
            <p className="text-sm text-slate-500">
              Revisa entregas pendientes de facturar, diferencias de carga,
              material no entregado, remisiones rechazadas y facturas
              registradas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cargarConciliacion}
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

        {!puedeRegistrarFactura && (
          <div className="mb-5 rounded-xl bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-700">
            Tu rol permite consultar conciliación, pero no registrar facturas ni
            realizar cambios operativos desde esta pantalla.
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            Cargando conciliación...
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-3">
              <ResumenCard
                titulo="Entregadas sin factura"
                valor={pendientesFactura.length}
                descripcion="Remisiones entregadas completas pendientes de ligar a factura."
                color="yellow"
              />

              <ResumenCard
                titulo="Diferencias de carga"
                valor={diferenciasCarga.length}
                descripcion="Lo cargado no coincide con la remisión."
                color="red"
              />

              <ResumenCard
                titulo="Material no entregado"
                valor={diferenciasEntrega.length}
                descripcion="Productos con cantidad no entregada o rechazada."
                color="red"
              />

              <ResumenCard
                titulo="No entregadas / rechazadas"
                valor={rechazadas.length}
                descripcion="Remisiones marcadas como rechazadas."
                color="red"
              />

              <ResumenCard
                titulo="Facturas registradas"
                valor={facturadas.length}
                descripcion="Últimos registros de facturación externa."
                color="green"
              />

              <ResumenCard
                titulo="Total incidencias"
                valor={
                  diferenciasCarga.length +
                  diferenciasEntrega.length +
                  rechazadas.length
                }
                descripcion="Suma de carga, entrega y remisiones rechazadas."
                color="yellow"
              />
            </div>

            <SeccionRemisiones
              titulo="Remisiones entregadas sin factura"
              descripcion="Estas remisiones ya fueron entregadas completas, pero todavía no tienen factura registrada."
              remisiones={pendientesFactura}
              obtenerCliente={obtenerCliente}
              formatearFecha={formatearFecha}
            />

            <SeccionDiferenciasCarga
              diferencias={diferenciasCarga}
              obtenerCliente={obtenerCliente}
              obtenerProducto={obtenerProducto}
              obtenerViaje={obtenerViaje}
            />

            <SeccionDiferenciasEntrega
              diferencias={diferenciasEntrega}
              obtenerCliente={obtenerCliente}
              obtenerProducto={obtenerProducto}
              obtenerViaje={obtenerViaje}
              formatearFecha={formatearFecha}
            />

            <SeccionRemisiones
              titulo="Remisiones no entregadas / rechazadas"
              descripcion="Remisiones que no fueron entregadas al cliente o fueron rechazadas."
              remisiones={rechazadas}
              obtenerCliente={obtenerCliente}
              formatearFecha={formatearFecha}
            />

            <SeccionFacturas
              facturas={facturadas}
              obtenerCliente={obtenerCliente}
              obtenerRemisionFactura={obtenerRemisionFactura}
              formatoMoneda={formatoMoneda}
              facturaTexto={facturaTexto}
              formatearFecha={formatearFecha}
            />
          </>
        )}
      </section>
    </main>
  );
}

function ResumenCard({
  titulo,
  valor,
  descripcion,
  color,
}: {
  titulo: string;
  valor: number;
  descripcion: string;
  color: "red" | "yellow" | "green";
}) {
  const colorClase = {
    red: "bg-red-50 text-red-700",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-green-50 text-green-700",
  }[color];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorClase}`}
      >
        {titulo}
      </div>

      <div className="text-3xl font-bold text-slate-900">{valor}</div>

      <p className="mt-2 text-sm text-slate-500">{descripcion}</p>
    </div>
  );
}

function SeccionRemisiones({
  titulo,
  descripcion,
  remisiones,
  obtenerCliente,
  formatearFecha,
}: {
  titulo: string;
  descripcion: string;
  remisiones: {
    id: string;
    folio: string;
    estado: string;
    destino: string;
    created_at: string;
    clientes: ClienteRelacion;
  }[];
  obtenerCliente: (cliente: ClienteRelacion) => string;
  formatearFecha: (fecha: string | null) => string;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
        <p className="text-sm text-slate-500">{descripcion}</p>
      </div>

      {remisiones.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">Sin registros.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">
                  Remisión
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left font-semibold">Fecha</th>
                <th className="px-6 py-3 text-left font-semibold">
                  Destino
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Estado
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {remisiones.map((remision) => (
                <tr key={remision.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {remision.folio}
                  </td>

                  <td className="px-6 py-4 text-slate-700">
                    {obtenerCliente(remision.clientes)}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {formatearFecha(remision.created_at?.slice(0, 10))}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {remision.destino || "-"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {estadoRemisionTexto(remision.estado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SeccionDiferenciasCarga({
  diferencias,
  obtenerCliente,
  obtenerProducto,
  obtenerViaje,
}: {
  diferencias: CargaDiferencia[];
  obtenerCliente: (cliente: ClienteRelacion) => string;
  obtenerProducto: (producto: ProductoRelacion) => string;
  obtenerViaje: (viaje: ViajeRelacion) =>
    | {
        folio: string;
        chofer_nombre: string;
        camion: string | null;
        ruta: string | null;
      }
    | null;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">
          Diferencias de carga
        </h2>
        <p className="text-sm text-slate-500">
          Casos donde la cantidad cargada no coincidió contra la remisión.
        </p>
      </div>

      {diferencias.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">Sin diferencias.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Viaje</th>
                <th className="px-6 py-3 text-left font-semibold">
                  Remisión
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Producto
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Cajas rem./carg.
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Bobinas rem./carg.
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Kilos rem./carg.
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Piezas rem./carg.
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Motivo
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {diferencias.map((item) => {
                const viaje = obtenerViaje(item.viajes);
                const remision = Array.isArray(item.remisiones)
                  ? item.remisiones[0]
                  : item.remisiones;

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">
                      {viaje?.folio || "-"}
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {remision?.folio || "-"}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {obtenerCliente(remision?.clientes || null)}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {obtenerProducto(item.productos)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-600">
                      {Number(item.cajas_remision || 0)} /{" "}
                      {Number(item.cajas_cargadas || 0)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-600">
                      {Number(item.bobinas_remision || 0)} /{" "}
                      {Number(item.bobinas_cargadas || 0)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-600">
                      {Number(item.kilos_remision || 0)} /{" "}
                      {Number(item.kilos_cargados || 0)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-600">
                      {Number(item.piezas_remision || 0)} /{" "}
                      {Number(item.piezas_cargadas || 0)}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {item.motivo_diferencia || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SeccionDiferenciasEntrega({
  diferencias,
  obtenerCliente,
  obtenerProducto,
  obtenerViaje,
  formatearFecha,
}: {
  diferencias: EntregaDiferencia[];
  obtenerCliente: (cliente: ClienteRelacion) => string;
  obtenerProducto: (producto: ProductoRelacion) => string;
  obtenerViaje: (viaje: ViajeRelacion) =>
    | {
        folio: string;
        chofer_nombre: string;
        camion: string | null;
        ruta: string | null;
      }
    | null;
  formatearFecha: (fecha: string | null) => string;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">
          Material no entregado
        </h2>
        <p className="text-sm text-slate-500">
          Productos donde una parte o la totalidad del material cargado no fue
          entregado al cliente.
        </p>
      </div>

      {diferencias.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">
          Sin material no entregado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Viaje</th>
                <th className="px-6 py-3 text-left font-semibold">
                  Remisión
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Producto
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Cajas carg./ent./no ent.
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Bobinas carg./ent./no ent.
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Kilos carg./ent./no ent.
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Piezas carg./ent./no ent.
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Recibió
                </th>
                <th className="px-6 py-3 text-left font-semibold">Fecha</th>
                <th className="px-6 py-3 text-left font-semibold">
                  Motivo
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {diferencias.map((item) => {
                const viaje = obtenerViaje(item.viajes);
                const remision = Array.isArray(item.remisiones)
                  ? item.remisiones[0]
                  : item.remisiones;

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">
                      {viaje?.folio || "-"}
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {remision?.folio || "-"}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {obtenerCliente(remision?.clientes || null)}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {obtenerProducto(item.productos)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-600">
                      {Number(item.cajas_cargadas || 0)} /{" "}
                      {Number(item.cajas_entregadas || 0)} /{" "}
                      {Number(item.cajas_rechazadas || 0)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-600">
                      {Number(item.bobinas_cargadas || 0)} /{" "}
                      {Number(item.bobinas_entregadas || 0)} /{" "}
                      {Number(item.bobinas_rechazadas || 0)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-600">
                      {Number(item.kilos_cargados || 0)} /{" "}
                      {Number(item.kilos_entregados || 0)} /{" "}
                      {Number(item.kilos_rechazados || 0)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-600">
                      {Number(item.piezas_cargadas || 0)} /{" "}
                      {Number(item.piezas_entregadas || 0)} /{" "}
                      {Number(item.piezas_rechazadas || 0)}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {item.recibido_por || "-"}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {formatearFecha(item.fecha_entrega)}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {item.motivo_diferencia || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SeccionFacturas({
  facturas,
  obtenerCliente,
  obtenerRemisionFactura,
  formatoMoneda,
  facturaTexto,
  formatearFecha,
}: {
  facturas: FacturaRegistrada[];
  obtenerCliente: (cliente: ClienteRelacion) => string;
  obtenerRemisionFactura: (remision: RemisionFacturaRelacion) =>
    | {
        folio: string;
        estado: string;
      }
    | null;
  formatoMoneda: (valor: number | null) => string;
  facturaTexto: (factura: FacturaRegistrada) => string;
  formatearFecha: (fecha: string | null) => string;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">
          Facturas registradas
        </h2>
        <p className="text-sm text-slate-500">
          Últimas facturas externas ligadas a remisiones.
        </p>
      </div>

      {facturas.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">Sin facturas.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Factura</th>
                <th className="px-6 py-3 text-left font-semibold">Cliente</th>
                <th className="px-6 py-3 text-left font-semibold">Fecha</th>
                <th className="px-6 py-3 text-right font-semibold">
                  Importe
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Remisiones
                </th>
                <th className="px-6 py-3 text-left font-semibold">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {facturas.map((factura) => {
                const remisiones = factura.factura_remisiones
                  .map((item) => obtenerRemisionFactura(item.remisiones))
                  .filter(Boolean) as {
                  folio: string;
                  estado: string;
                }[];

                return (
                  <tr key={factura.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {facturaTexto(factura)}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {obtenerCliente(factura.clientes)}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {formatearFecha(factura.fecha_factura)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-700">
                      {formatoMoneda(factura.importe_facturado)}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {remisiones.length > 0
                        ? remisiones
                            .map(
                              (item) =>
                                `${item.folio} (${estadoRemisionTexto(
                                  item.estado
                                )})`
                            )
                            .join(", ")
                        : "-"}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {estadoFacturaTexto(factura.estado)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function estadoRemisionTexto(estado: string) {
  const estados: Record<string, string> = {
    capturada: "Capturada",
    enviada_almacen: "Enviada a almacén",
    preparada: "Preparada",
    cargada: "Cargada",
    en_ruta: "En ruta",
    entregada_completa: "Entregada completa",
    rechazada: "No entregada / rechazada",
    facturada: "Facturada",
    conciliada: "Conciliada",
    con_diferencia: "Con diferencia",
    cerrada: "Cerrada",
    cancelada: "Cancelada",
  };

  return estados[estado] || estado;
}

function estadoFacturaTexto(estado: string) {
  const estados: Record<string, string> = {
    registrada: "Registrada",
    cancelada: "Cancelada",
    pendiente_revision: "Pendiente revisión",
    emitida: "Emitida",
  };

  return estados[estado] || estado;
}