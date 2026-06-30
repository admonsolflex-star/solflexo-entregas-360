"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ClienteDato = {
  nombre: string | null;
  codigo_cliente: string | null;
  rfc: string | null;
  direccion: string | null;
  direccion_fiscal: string | null;
  ciudad: string | null;
  estado: string | null;
  codigo_postal: string | null;
  telefono: string | null;
  correo: string | null;
  origen: string | null;
  produccion_cliente_id: string | null;
};

type ClienteRelacion = ClienteDato[] | ClienteDato | null;

type ProductoDato = {
  nombre: string | null;
  codigo_producto: string | null;
  unidad_principal: string | null;
  origen: string | null;
  produccion_producto_id: string | null;
};

type ProductoRelacion = ProductoDato[] | ProductoDato | null;

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
  orden_compra_folio: string | null;
  orden_produccion_folio: string | null;
  observaciones: string | null;

  produccion_order_id: string | null;
  produccion_order_folio: string | null;
  produccion_finished_good_id: string | null;
  integration_source: string | null;
  integration_created_at: string | null;

  clientes: ClienteRelacion;

  remision_items: {
    id: string;
    cajas: number | null;
    bobinas: number | null;
    kilos: number | null;
    piezas: number | null;
    descripcion_extra: string | null;
    produccion_product_id: string | null;
    produccion_finished_good_id: string | null;
    productos: ProductoRelacion;
  }[];
};

function obtenerParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function ImprimirRemisionPage() {
  const params = useParams();
  const remisionId = obtenerParam(params.remisionId);

  const [remision, setRemision] = useState<Remision | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

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
        orden_compra_folio,
        orden_produccion_folio,
        observaciones,
        produccion_order_id,
        produccion_order_folio,
        produccion_finished_good_id,
        integration_source,
        integration_created_at,
        clientes (
          nombre,
          codigo_cliente,
          rfc,
          direccion,
          direccion_fiscal,
          ciudad,
          estado,
          codigo_postal,
          telefono,
          correo,
          origen,
          produccion_cliente_id
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
            nombre,
            codigo_producto,
            unidad_principal,
            origen,
            produccion_producto_id
          )
        )
      `
      )
      .eq("id", remisionId)
      .maybeSingle();

    if (error || !data) {
      console.error("Error cargando remisión:", error);
      setErrorMsg("No se encontró la remisión.");
      setLoading(false);
      return;
    }

    setRemision(data as unknown as Remision);
    setLoading(false);
  }

  function imprimir() {
    window.print();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Cargando remisión...</p>
      </main>
    );
  }

  if (errorMsg || !remision) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-red-600">
            {errorMsg || "No se encontró la remisión."}
          </p>

          <Link
            href="/remisiones"
            className="mt-4 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Regresar
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Imprimir remisión
            </h1>
            <p className="text-sm text-slate-500">{remision.folio}</p>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/remisiones/${remision.id}`}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver detalle
            </Link>

            <Link
              href="/remisiones"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Regresar
            </Link>

            <button
              type="button"
              onClick={imprimir}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-5xl space-y-8 px-6 py-8 print:p-0">
        <RemisionImpresa remision={remision} copia="COPIA CLIENTE" />
        <RemisionImpresa remision={remision} copia="COPIA CHOFER" />
      </section>

      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 5mm;
          }

          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-page {
            page-break-after: always;
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            min-height: auto !important;
            transform: scale(0.94);
            transform-origin: top center;
          }

          .print-page:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </main>
  );
}

function RemisionImpresa({
  remision,
  copia,
}: {
  remision: Remision;
  copia: string;
}) {
  const cliente = obtenerCliente(remision);
  const fecha = parseFecha(
    remision.fecha_programada_entrega || remision.fecha_remision
  );

  const opFolio =
    remision.produccion_order_folio || remision.orden_produccion_folio || "-";

  return (
    <div className="print-page mx-auto max-w-[820px] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>
          {remision.integration_source === "PRODUCCION_360"
            ? "Origen: Producción 360"
            : "Origen: Manual"}
        </span>
        <span>{copia}</span>
      </div>

      <div className="grid grid-cols-[1fr_2fr_140px] gap-3">
        <div className="flex items-center">
          <div>
            <div className="text-xl font-bold text-blue-900">Soluciones</div>
            <div className="text-xl font-bold text-blue-700">
              Flexoplásticas
            </div>
            <div className="text-xs text-slate-500">S.A. de C.V.</div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold tracking-wide text-slate-900">
            SOLUCIONES FLEXOPLÁSTICAS S.A. DE C.V.
          </h2>
          <p className="text-sm text-slate-700">R.F.C. SFI 111014 BC3</p>
          <p className="text-sm text-slate-700">
            Av. Francisco I. Madero No. 1010 Int. 2
          </p>
          <p className="text-sm text-slate-700">
            Centro C.P. 59600 Zamora, Michoacán, México
          </p>
        </div>

        <div className="h-[88px] overflow-hidden rounded-xl border-2 border-blue-800 text-center">
          <div className="rounded-t-lg bg-blue-800 py-2 text-sm font-bold text-white">
            REMISIÓN
          </div>
          <div className="truncate px-2 py-3 text-base font-bold text-red-500">
            N° {remision.folio}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_150px] gap-4">
        <div className="h-[92px] overflow-hidden rounded-xl border-2 border-blue-800">
          <div className="grid grid-cols-[95px_1fr] gap-y-1 p-3 text-[12px] leading-tight">
            <div className="font-bold text-slate-700">CLIENTE:</div>
            <div className="truncate">
              {cliente?.codigo_cliente
                ? `${cliente.codigo_cliente} - ${cliente.nombre || "-"}`
                : cliente?.nombre || "-"}
            </div>

            <div className="font-bold text-slate-700">DIRECCIÓN:</div>
            <div className="truncate">{domicilioFiscalCliente(remision)}</div>

            <div className="font-bold text-slate-700">CIUDAD:</div>
            <div className="truncate">{ciudadFiscalCliente(remision)}</div>

            <div className="font-bold text-slate-700">RFC:</div>
            <div className="truncate">{cliente?.rfc || "-"}</div>
          </div>
        </div>

        <div className="h-[110px] overflow-hidden rounded-xl border-2 border-blue-800">
          <div className="grid grid-cols-3 bg-blue-800 text-center text-xs font-bold text-white">
            <div className="border-r border-white py-2">DÍA</div>
            <div className="border-r border-white py-2">MES</div>
            <div className="py-2">AÑO</div>
          </div>

          <div className="grid grid-cols-3 text-center text-sm font-bold">
            <div className="border-r border-blue-800 py-4">{fecha.dia}</div>
            <div className="border-r border-blue-800 py-4">{fecha.mes}</div>
            <div className="py-4">{fecha.anio}</div>
          </div>
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border-2 border-blue-800">
        <div className="bg-blue-800 px-3 py-2 text-center text-sm font-bold text-white">
          ENTREGAR EN:
        </div>

        <div className="h-[55px] overflow-hidden p-2 text-[11px] leading-tight">
          <div className="truncate font-semibold">{remision.destino || "-"}</div>

          <div className="truncate">{domicilioEntrega(remision)}</div>

          {(remision.contacto_entrega || remision.telefono_entrega) && (
            <div className="truncate">
              {remision.contacto_entrega
                ? `Contacto: ${remision.contacto_entrega}`
                : ""}
              {remision.telefono_entrega
                ? ` Tel: ${remision.telefono_entrega}`
                : ""}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border-2 border-blue-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="w-[110px] border-r border-white px-2 py-2 text-left">
                CONDICIONES
              </th>
              <th className="w-[110px] border-r border-white px-2 py-2 text-left">
                CANTIDAD
              </th>
              <th className="border-r border-white px-2 py-2 text-left">
                DESCRIPCIÓN
              </th>
              <th className="w-[90px] border-r border-white px-2 py-2 text-right">
                PRECIO
              </th>
              <th className="w-[90px] px-2 py-2 text-right">IMPORTE</th>
            </tr>
          </thead>

          <tbody>
            {remision.remision_items.map((item) => {
              const producto = obtenerProducto(item.productos);
              const ptId =
                item.produccion_finished_good_id ||
                remision.produccion_finished_good_id;

              return (
                <tr key={item.id} className="align-top">
                  <td className="border-r border-blue-800 px-2 py-4">
                    {cantidadTextoCondiciones(item)}
                  </td>

                  <td className="border-r border-blue-800 px-2 py-4">
                    {cantidadTexto(item)}
                  </td>

                  <td className="border-r border-blue-800 px-2 py-4">
                    <div className="font-semibold">
                      {producto?.nombre || "Producto sin nombre"}
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      Código: {producto?.codigo_producto || "-"}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-bold">OC:</span>{" "}
                        {remision.orden_compra_folio || "-"}
                      </div>

                      <div>
                        <span className="font-bold">OP:</span> {opFolio}
                      </div>
                    </div>

                    {ptId ? (
                      <div className="mt-1 text-xs text-slate-600">
                        <span className="font-bold">PT Producción:</span>{" "}
                        {ptId.slice(0, 8)}...
                      </div>
                    ) : null}

                    {item.descripcion_extra && (
                      <div className="mt-2 text-xs text-slate-600">
                        {item.descripcion_extra}
                      </div>
                    )}
                  </td>

                  <td className="border-r border-blue-800 px-2 py-4 text-right">
                    -
                  </td>

                  <td className="px-2 py-4 text-right">-</td>
                </tr>
              );
            })}

            {Array.from({
              length: Math.max(5 - remision.remision_items.length, 0),
            }).map((_, index) => (
              <tr key={`empty-${index}`} className="h-12">
                <td className="border-r border-blue-800">&nbsp;</td>
                <td className="border-r border-blue-800">&nbsp;</td>
                <td className="border-r border-blue-800">&nbsp;</td>
                <td className="border-r border-blue-800">&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {remision.observaciones && (
        <div className="mt-3 rounded-xl border border-blue-800 p-3 text-sm">
          <span className="font-bold">Observaciones:</span>{" "}
          {remision.observaciones}
        </div>
      )}

      <div className="mt-3 grid grid-cols-[1fr_170px] gap-4">
        <div className="rounded-xl border-2 border-blue-800 p-3">
          <div className="grid grid-cols-[120px_1fr_120px] items-end gap-3 text-sm">
            <div className="font-bold">ENTREGADO POR:</div>
            <div className="border-b border-slate-500 text-center text-xs">
              NOMBRE
            </div>
            <div className="border-b border-slate-500 text-center text-xs">
              FIRMA
            </div>

            <div className="font-bold">RECIBIDO POR:</div>
            <div className="border-b border-slate-500 pt-6 text-center text-xs">
              NOMBRE
            </div>
            <div className="border-b border-slate-500 pt-6 text-center text-xs">
              FIRMA
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="text-lg font-bold">TOTAL $</div>
          <div className="h-12 w-24 rounded-lg border-2 border-blue-800"></div>
        </div>
      </div>
    </div>
  );
}

function obtenerCliente(remision: Remision) {
  if (Array.isArray(remision.clientes)) {
    return remision.clientes[0] || null;
  }

  return remision.clientes || null;
}

function obtenerProducto(productos: ProductoRelacion) {
  if (Array.isArray(productos)) {
    return productos[0] || null;
  }

  return productos || null;
}

function domicilioFiscalCliente(remision: Remision) {
  const cliente = obtenerCliente(remision);

  return cliente?.direccion_fiscal || cliente?.direccion || "-";
}

function ciudadFiscalCliente(remision: Remision) {
  const cliente = obtenerCliente(remision);

  const texto = [cliente?.ciudad, cliente?.estado, cliente?.codigo_postal]
    .filter(Boolean)
    .join(", ");

  return texto || "-";
}

function domicilioEntrega(remision: Remision) {
  const texto = [
    remision.direccion_entrega,
    remision.ciudad_entrega,
    remision.estado_entrega,
    remision.codigo_postal_entrega,
  ]
    .filter(Boolean)
    .join(", ");

  return texto || "-";
}

function parseFecha(fecha: string | null) {
  if (!fecha) {
    return {
      dia: "",
      mes: "",
      anio: "",
    };
  }

  const date = new Date(`${fecha}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return {
      dia: "",
      mes: "",
      anio: "",
    };
  }

  return {
    dia: String(date.getDate()).padStart(2, "0"),
    mes: String(date.getMonth() + 1).padStart(2, "0"),
    anio: String(date.getFullYear()),
  };
}

function cantidadTexto(item: Remision["remision_items"][number]) {
  const partes = [];

  if (Number(item.cajas || 0) > 0) partes.push(`${item.cajas} CAJAS`);
  if (Number(item.bobinas || 0) > 0) partes.push(`${item.bobinas} BOBINAS`);
  if (Number(item.kilos || 0) > 0) partes.push(`${item.kilos} KG`);
  if (Number(item.piezas || 0) > 0) partes.push(`${item.piezas} PZAS`);

  return partes.length > 0 ? partes.join(" / ") : "-";
}

function cantidadTextoCondiciones(item: Remision["remision_items"][number]) {
  const partes = [];

  if (Number(item.bobinas || 0) > 0) partes.push(`${item.bobinas} BOBINAS`);
  if (Number(item.cajas || 0) > 0) partes.push(`${item.cajas} CAJAS`);

  return partes.length > 0 ? partes.join(" / ") : "-";
}