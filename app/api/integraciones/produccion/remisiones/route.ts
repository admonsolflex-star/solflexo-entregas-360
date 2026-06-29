import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildFolio() {
  const ahora = new Date();
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, "0");
  const dd = String(ahora.getDate()).padStart(2, "0");
  const hh = String(ahora.getHours()).padStart(2, "0");
  const min = String(ahora.getMinutes()).padStart(2, "0");
  const ss = String(ahora.getSeconds()).padStart(2, "0");

  return `REM-${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Solflexo Entregas 360",
    endpoint: "integracion-produccion-remisiones",
    method: "POST",
  });
}

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.INTEGRATION_API_TOKEN;
    const receivedToken = getBearerToken(request);

    if (!expectedToken || receivedToken !== expectedToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = await request.json();

    const productionOrderId = String(body.production_order_id || "").trim();
    const productionOrderFolio = String(body.production_folio || "").trim();
    const productionProductId = String(body.production_product_id || "").trim();
    const finishedGoodId = String(body.finished_good_id || "").trim();

    const entregasClienteId = String(body.entregas_cliente_id || "").trim();
    const entregasProductoId = String(body.entregas_producto_id || "").trim();
    const entregasDireccionEntregaId = String(
      body.entregas_direccion_entrega_id || ""
    ).trim();

    const fechaProgramadaEntrega = String(
      body.fecha_programada_entrega || ""
    ).trim();

    const destino = String(body.destino || "").trim();
    const direccionEntrega = String(body.direccion_entrega || "").trim();
    const ciudadEntrega = String(body.ciudad_entrega || "").trim();
    const estadoEntrega = String(body.estado_entrega || "").trim();
    const codigoPostalEntrega = String(body.codigo_postal_entrega || "").trim();
    const contactoEntrega = String(body.contacto_entrega || "").trim();
    const telefonoEntrega = String(body.telefono_entrega || "").trim();
    const referenciasEntrega = String(body.referencias_entrega || "").trim();

    const ordenCompraFolio = String(body.orden_compra_folio || "").trim();

    const cajas = toNumber(body.cajas);
    const bobinas = toNumber(body.bobinas);
    const kilos = toNumber(body.kilos);
    const piezas = toNumber(body.piezas);

    const observaciones = String(body.observaciones || "").trim();

    if (!productionOrderId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta production_order_id.",
        },
        { status: 400 }
      );
    }

    if (!productionOrderFolio) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta production_folio.",
        },
        { status: 400 }
      );
    }

    if (!entregasClienteId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta entregas_cliente_id.",
        },
        { status: 400 }
      );
    }

    if (!entregasProductoId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta entregas_producto_id.",
        },
        { status: 400 }
      );
    }

    if (!entregasDireccionEntregaId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta entregas_direccion_entrega_id.",
        },
        { status: 400 }
      );
    }

    if (cajas <= 0 && bobinas <= 0 && kilos <= 0 && piezas <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe enviarse al menos una cantidad: cajas, bobinas, kilos o piezas.",
        },
        { status: 400 }
      );
    }

    const { data: existingRemision, error: existingRemisionError } =
      await supabase
        .from("remisiones")
        .select("id, folio, estado")
        .eq("produccion_order_id", productionOrderId)
        .maybeSingle();

    if (existingRemisionError) {
      return NextResponse.json(
        {
          ok: false,
          error: existingRemisionError.message,
        },
        { status: 500 }
      );
    }

    if (existingRemision) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        message: "La OP ya tiene remisión creada en Entregas 360.",
        remision_id: existingRemision.id,
        remision_folio: existingRemision.folio,
        estado: existingRemision.estado,
      });
    }

    const folio = buildFolio();

    const { data: remisionCreada, error: remisionError } = await supabase
      .from("remisiones")
      .insert({
        folio,
        cliente_id: entregasClienteId,
        direccion_entrega_id: entregasDireccionEntregaId,
        fecha_programada_entrega: fechaProgramadaEntrega || null,
        destino: destino || "Entrega programada",

        direccion_entrega: direccionEntrega || null,
        ciudad_entrega: ciudadEntrega || null,
        estado_entrega: estadoEntrega || null,
        codigo_postal_entrega: codigoPostalEntrega || null,
        contacto_entrega: contactoEntrega || null,
        telefono_entrega: telefonoEntrega || null,

        orden_produccion_folio: productionOrderFolio,
        orden_compra_folio: ordenCompraFolio || null,
        estado: "capturada",
        observaciones:
          observaciones ||
          `Remisión generada automáticamente desde Producción 360. OP ${productionOrderFolio}.`,

        produccion_order_id: productionOrderId,
        produccion_order_folio: productionOrderFolio,
        produccion_finished_good_id: finishedGoodId || null,
        integration_source: "PRODUCCION_360",
        integration_payload: body,
        integration_created_at: new Date().toISOString(),
      })
      .select("id, folio, estado")
      .single();

    if (remisionError || !remisionCreada) {
      return NextResponse.json(
        {
          ok: false,
          error: remisionError?.message || "No se pudo crear la remisión.",
        },
        { status: 500 }
      );
    }

    const { error: itemError } = await supabase.from("remision_items").insert({
      remision_id: remisionCreada.id,
      producto_id: entregasProductoId,
      cajas,
      bobinas,
      kilos,
      piezas,
      descripcion_extra:
        referenciasEntrega ||
        `Producto terminado generado desde OP ${productionOrderFolio}.`,
      produccion_product_id: productionProductId || null,
      produccion_finished_good_id: finishedGoodId || null,
    });

    if (itemError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Se creó la remisión, pero falló la partida: ${itemError.message}`,
          remision_id: remisionCreada.id,
          remision_folio: remisionCreada.folio,
          estado: remisionCreada.estado,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      duplicated: false,
      message: "Remisión creada correctamente en Entregas 360.",
      remision_id: remisionCreada.id,
      remision_folio: remisionCreada.folio,
      estado: remisionCreada.estado,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error inesperado.",
      },
      { status: 500 }
    );
  }
}