import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function upperText(value: unknown) {
  return cleanText(value).toUpperCase();
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

function buildCode(prefix: string, sourceId: string) {
  const cleanSource = sourceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);

  if (cleanSource) {
    return `${prefix}-${cleanSource}`.toUpperCase();
  }

  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}-${timestamp}`.toUpperCase();
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

async function findOrCreateCliente(supabase: any, body: any) {
  const manualClienteId = cleanText(body.entregas_cliente_id);

  if (manualClienteId) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, codigo_cliente, nombre")
      .eq("id", manualClienteId)
      .maybeSingle();

    if (error) {
      throw new Error(`Error buscando cliente manual: ${error.message}`);
    }

    if (!data) {
      throw new Error("El entregas_cliente_id enviado no existe.");
    }

    return data;
  }

  const produccionClienteId =
    cleanText(body.production_customer_id) ||
    cleanText(body.produccion_cliente_id) ||
    cleanText(body.customer_id);

  const customerName =
    cleanText(body.customer_name) ||
    cleanText(body.cliente_nombre) ||
    cleanText(body.customer_business_name) ||
    "Cliente sin nombre";

  const customerRfc =
    upperText(body.customer_rfc) ||
    upperText(body.rfc) ||
    null;

  const customerPhone =
    cleanText(body.customer_phone) ||
    cleanText(body.telefono_cliente) ||
    null;

  const customerEmail =
    cleanText(body.customer_email) ||
    cleanText(body.correo_cliente) ||
    null;

  if (!produccionClienteId) {
    throw new Error("Falta production_customer_id para crear/buscar cliente.");
  }

  const { data: existingCliente, error: existingClienteError } = await supabase
    .from("clientes")
    .select("id, codigo_cliente, nombre")
    .eq("produccion_cliente_id", produccionClienteId)
    .maybeSingle();

  if (existingClienteError) {
    throw new Error(
      `Error buscando cliente por Producción 360: ${existingClienteError.message}`
    );
  }

  if (existingCliente) {
    await supabase
      .from("clientes")
      .update({
        nombre: customerName,
        rfc: customerRfc,
        correo: customerEmail,
        telefono: customerPhone,
        activo: true,
      })
      .eq("id", existingCliente.id);

    return existingCliente;
  }

  const codigoCliente =
    upperText(body.customer_code) ||
    upperText(body.codigo_cliente) ||
    buildCode("CLI-P360", produccionClienteId);

  const { data: createdCliente, error: createdClienteError } = await supabase
    .from("clientes")
    .insert({
      codigo_cliente: codigoCliente,
      nombre: customerName,
      rfc: customerRfc,
      correo: customerEmail,
      telefono: customerPhone,
      direccion: cleanText(body.customer_address) || null,
      ciudad: cleanText(body.customer_city) || null,
      estado: cleanText(body.customer_state) || null,
      codigo_postal: cleanText(body.customer_zip_code) || null,
      activo: true,
      produccion_cliente_id: produccionClienteId,
      origen: "PRODUCCION_360",
      direccion_fiscal: cleanText(body.customer_fiscal_address) || null,
      direccion_entrega: cleanText(body.delivery_address) || null,
      referencias_entrega: cleanText(body.delivery_references) || null,
      contacto_entrega: cleanText(body.delivery_contact) || null,
      telefono_entrega: cleanText(body.delivery_phone) || null,
    })
    .select("id, codigo_cliente, nombre")
    .single();

  if (createdClienteError || !createdCliente) {
    throw new Error(
      `No se pudo crear cliente: ${
        createdClienteError?.message || "Error desconocido"
      }`
    );
  }

  return createdCliente;
}

async function findOrCreateProducto(supabase: any, body: any, clienteId: string) {
  const manualProductoId = cleanText(body.entregas_producto_id);

  if (manualProductoId) {
    const { data, error } = await supabase
      .from("productos")
      .select("id, codigo_producto, nombre")
      .eq("id", manualProductoId)
      .maybeSingle();

    if (error) {
      throw new Error(`Error buscando producto manual: ${error.message}`);
    }

    if (!data) {
      throw new Error("El entregas_producto_id enviado no existe.");
    }

    return data;
  }

  const produccionProductoId =
    cleanText(body.production_product_id) ||
    cleanText(body.produccion_producto_id) ||
    cleanText(body.product_id);

  const produccionClienteId =
    cleanText(body.production_customer_id) ||
    cleanText(body.produccion_cliente_id) ||
    cleanText(body.customer_id);

  const productName =
    cleanText(body.product_name) ||
    cleanText(body.producto_nombre) ||
    "Producto sin nombre";

  if (!produccionProductoId) {
    throw new Error("Falta production_product_id para crear/buscar producto.");
  }

  const { data: existingProducto, error: existingProductoError } =
    await supabase
      .from("productos")
      .select("id, codigo_producto, nombre")
      .eq("produccion_producto_id", produccionProductoId)
      .maybeSingle();

  if (existingProductoError) {
    throw new Error(
      `Error buscando producto por Producción 360: ${existingProductoError.message}`
    );
  }

  if (existingProducto) {
    await supabase
      .from("productos")
      .update({
        nombre: productName,
        tipo_producto: cleanText(body.product_type) || null,
        unidad_principal:
          upperText(body.product_unit) ||
          upperText(body.unit) ||
          "PIEZAS",
        activo: true,
        cliente_id: clienteId,
        produccion_customer_id: produccionClienteId || null,
      })
      .eq("id", existingProducto.id);

    return existingProducto;
  }

  const codigoProducto =
    upperText(body.product_code) ||
    upperText(body.codigo_producto) ||
    buildCode("PROD-P360", produccionProductoId);

  const { data: createdProducto, error: createdProductoError } = await supabase
    .from("productos")
    .insert({
      codigo_producto: codigoProducto,
      nombre: productName,
      tipo_producto: cleanText(body.product_type) || null,
      unidad_principal:
        upperText(body.product_unit) ||
        upperText(body.unit) ||
        "PIEZAS",
      activo: true,
      produccion_producto_id: produccionProductoId,
      produccion_customer_id: produccionClienteId || null,
      origen: "PRODUCCION_360",
      cliente_id: clienteId,
    })
    .select("id, codigo_producto, nombre")
    .single();

  if (createdProductoError || !createdProducto) {
    throw new Error(
      `No se pudo crear producto: ${
        createdProductoError?.message || "Error desconocido"
      }`
    );
  }

  return createdProducto;
}

async function findOrCreateDireccion(
  supabase: any,
  body: any,
  clienteId: string
) {
  const manualDireccionId = cleanText(body.entregas_direccion_entrega_id);

  if (manualDireccionId) {
    const { data, error } = await supabase
      .from("cliente_direcciones_entrega")
      .select("id, nombre_direccion, direccion")
      .eq("id", manualDireccionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Error buscando dirección manual: ${error.message}`);
    }

    if (!data) {
      throw new Error("El entregas_direccion_entrega_id enviado no existe.");
    }

    return data;
  }

  const produccionClienteId =
    cleanText(body.production_customer_id) ||
    cleanText(body.produccion_cliente_id) ||
    cleanText(body.customer_id);

  const addressKey =
    cleanText(body.production_address_id) ||
    cleanText(body.produccion_direccion_id) ||
    cleanText(body.delivery_address_key) ||
    produccionClienteId;

  const deliveryAddress =
    cleanText(body.delivery_address) ||
    cleanText(body.direccion_entrega) ||
    cleanText(body.customer_delivery_address) ||
    "Dirección por confirmar";

  const deliveryName =
    cleanText(body.delivery_name) ||
    cleanText(body.destino) ||
    cleanText(body.customer_name) ||
    "Dirección principal";

  if (!produccionClienteId) {
    throw new Error("Falta production_customer_id para crear/buscar dirección.");
  }

  const { data: existingDireccion, error: existingDireccionError } =
    await supabase
      .from("cliente_direcciones_entrega")
      .select("id, nombre_direccion, direccion")
      .eq("produccion_cliente_id", produccionClienteId)
      .eq("produccion_direccion_key", addressKey)
      .maybeSingle();

  if (existingDireccionError) {
    throw new Error(
      `Error buscando dirección por Producción 360: ${existingDireccionError.message}`
    );
  }

  if (existingDireccion) {
    await supabase
      .from("cliente_direcciones_entrega")
      .update({
        cliente_id: clienteId,
        nombre_direccion: deliveryName,
        direccion: deliveryAddress,
        ciudad:
          cleanText(body.delivery_city) ||
          cleanText(body.ciudad_entrega) ||
          null,
        estado:
          cleanText(body.delivery_state) ||
          cleanText(body.estado_entrega) ||
          null,
        codigo_postal:
          cleanText(body.delivery_zip_code) ||
          cleanText(body.codigo_postal_entrega) ||
          null,
        contacto:
          cleanText(body.delivery_contact) ||
          cleanText(body.contacto_entrega) ||
          null,
        telefono:
          cleanText(body.delivery_phone) ||
          cleanText(body.telefono_entrega) ||
          null,
        referencias:
          cleanText(body.delivery_references) ||
          cleanText(body.referencias_entrega) ||
          null,
        activo: true,
      })
      .eq("id", existingDireccion.id);

    return existingDireccion;
  }

  const { data: createdDireccion, error: createdDireccionError } =
    await supabase
      .from("cliente_direcciones_entrega")
      .insert({
        cliente_id: clienteId,
        nombre_direccion: deliveryName,
        direccion: deliveryAddress,
        ciudad:
          cleanText(body.delivery_city) ||
          cleanText(body.ciudad_entrega) ||
          null,
        estado:
          cleanText(body.delivery_state) ||
          cleanText(body.estado_entrega) ||
          null,
        codigo_postal:
          cleanText(body.delivery_zip_code) ||
          cleanText(body.codigo_postal_entrega) ||
          null,
        contacto:
          cleanText(body.delivery_contact) ||
          cleanText(body.contacto_entrega) ||
          null,
        telefono:
          cleanText(body.delivery_phone) ||
          cleanText(body.telefono_entrega) ||
          null,
        referencias:
          cleanText(body.delivery_references) ||
          cleanText(body.referencias_entrega) ||
          null,
        es_principal: true,
        activo: true,
        produccion_cliente_id: produccionClienteId,
        produccion_direccion_key: addressKey,
        origen: "PRODUCCION_360",
      })
      .select("id, nombre_direccion, direccion")
      .single();

  if (createdDireccionError || !createdDireccion) {
    throw new Error(
      `No se pudo crear dirección: ${
        createdDireccionError?.message || "Error desconocido"
      }`
    );
  }

  return createdDireccion;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Solflexo Entregas 360",
    endpoint: "integracion-produccion-remisiones",
    method: "POST",
    mode: "AUTO_CREATE_CLIENT_PRODUCT_ADDRESS",
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

    const productionOrderId = cleanText(body.production_order_id);
    const productionOrderFolio = cleanText(body.production_folio);
    const productionProductId = cleanText(body.production_product_id);
    const finishedGoodId = cleanText(body.finished_good_id);

    const fechaProgramadaEntrega = cleanText(body.fecha_programada_entrega);
    const destino = cleanText(body.destino) || cleanText(body.customer_name);
    const direccionEntrega =
      cleanText(body.delivery_address) || cleanText(body.direccion_entrega);
    const ciudadEntrega =
      cleanText(body.delivery_city) || cleanText(body.ciudad_entrega);
    const estadoEntrega =
      cleanText(body.delivery_state) || cleanText(body.estado_entrega);
    const codigoPostalEntrega =
      cleanText(body.delivery_zip_code) ||
      cleanText(body.codigo_postal_entrega);
    const contactoEntrega =
      cleanText(body.delivery_contact) || cleanText(body.contacto_entrega);
    const telefonoEntrega =
      cleanText(body.delivery_phone) || cleanText(body.telefono_entrega);
    const referenciasEntrega =
      cleanText(body.delivery_references) ||
      cleanText(body.referencias_entrega);

    const ordenCompraFolio = cleanText(body.orden_compra_folio);

    const cajas = toNumber(body.cajas);
    const bobinas = toNumber(body.bobinas);
    const kilos = toNumber(body.kilos);
    const piezas = toNumber(body.piezas);

    const observaciones = cleanText(body.observaciones);

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

    if (!productionProductId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta production_product_id.",
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

    const cliente = await findOrCreateCliente(supabase, body);
    const producto = await findOrCreateProducto(supabase, body, cliente.id);
    const direccion = await findOrCreateDireccion(supabase, body, cliente.id);

    const folio = buildFolio();

    const { data: remisionCreada, error: remisionError } = await supabase
      .from("remisiones")
      .insert({
        folio,
        cliente_id: cliente.id,
        direccion_entrega_id: direccion.id,
        fecha_programada_entrega: fechaProgramadaEntrega || null,
        destino: destino || direccion.nombre_direccion || "Entrega programada",

        direccion_entrega: direccionEntrega || direccion.direccion || null,
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
      producto_id: producto.id,
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
      cliente_id: cliente.id,
      producto_id: producto.id,
      direccion_entrega_id: direccion.id,
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