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

type CargaItem = {
  viaje_id: string;
  remision_id: string;
  producto_id: string;

  cajas_cargadas: number;
  bobinas_cargadas: number;
  kilos_cargados: number;
  piezas_cargadas: number;

  remisiones:
    | {
        folio: string;
        destino: string;
        clientes: ClienteRelacion;
      }
    | null;

  productos: ProductoRelacion;
};

type EntregaExistente = {
  viaje_id: string;
  remision_id: string;
  producto_id: string;

  cajas_entregadas: number | null;
  bobinas_entregadas: number | null;
  kilos_entregados: number | null;
  piezas_entregadas: number | null;

  cajas_rechazadas: number | null;
  bobinas_rechazadas: number | null;
  kilos_rechazados: number | null;
  piezas_rechazadas: number | null;

  recibido_por: string | null;
  fecha_entrega: string | null;
  hora_entrega: string | null;
  motivo_diferencia: string | null;
  observaciones: string | null;
};

type ResultadoEntrega = "entregado" | "no_entregado" | "editado";

type CapturaEntrega = {
  key: string;
  remision_id: string;
  producto_id: string;

  remision_folio: string;
  cliente_nombre: string;
  destino: string;
  producto_nombre: string;

  cajas_cargadas: number;
  bobinas_cargadas: number;
  kilos_cargados: number;
  piezas_cargadas: number;

  cajas_entregadas: string;
  bobinas_entregadas: string;
  kilos_entregados: string;
  piezas_entregadas: string;

  cajas_no_entregadas: string;
  bobinas_no_entregadas: string;
  kilos_no_entregados: string;
  piezas_no_entregadas: string;

  resultado_entrega: ResultadoEntrega;
  recibido_por: string;
  fecha_entrega: string;
  hora_entrega: string;
  motivo_no_entrega: string;
  observaciones: string;
};

export default function RegistrarEntregaPage() {
  const router = useRouter();
  const params = useParams();

  const viajeId = params.viajeId as string;

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [capturas, setCapturas] = useState<CapturaEntrega[]>([]);
  const [entregasOriginales, setEntregasOriginales] = useState<
    EntregaExistente[]
  >([]);

  const [motivoEdicion, setMotivoEdicion] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const esEdicion = viaje?.estado === "regresado";

  useEffect(() => {
    if (viajeId) {
      cargarDatos();
    }
  }, [viajeId]);

  async function cargarDatos() {
    setLoading(true);
    setErrorMsg("");

    const { data: viajeData, error: viajeError } = await supabase
      .from("viajes")
      .select("id, folio, fecha, chofer_nombre, camion, ruta, estado")
      .eq("id", viajeId)
      .single();

    if (viajeError || !viajeData) {
      console.error("Error cargando viaje:", viajeError);
      setErrorMsg("No se encontró el viaje.");
      setLoading(false);
      return;
    }

    const viajeActual = viajeData as Viaje;
    setViaje(viajeActual);

    const { data: cargaData, error: cargaError } = await supabase
      .from("carga_items")
      .select(
        `
        viaje_id,
        remision_id,
        producto_id,
        cajas_cargadas,
        bobinas_cargadas,
        kilos_cargados,
        piezas_cargadas,
        remisiones (
          folio,
          destino,
          clientes (
            nombre
          )
        ),
        productos (
          nombre
        )
      `
      )
      .eq("viaje_id", viajeId)
      .order("created_at", { ascending: true });

    if (cargaError) {
      console.error("Error cargando carga del viaje:", cargaError);
      setErrorMsg("No se pudo cargar la mercancía cargada del viaje.");
      setLoading(false);
      return;
    }

    const { data: entregaData, error: entregaError } = await supabase
      .from("entrega_items")
      .select(
        `
        viaje_id,
        remision_id,
        producto_id,
        cajas_entregadas,
        bobinas_entregadas,
        kilos_entregados,
        piezas_entregadas,
        cajas_rechazadas,
        bobinas_rechazadas,
        kilos_rechazados,
        piezas_rechazadas,
        recibido_por,
        fecha_entrega,
        hora_entrega,
        motivo_diferencia,
        observaciones
      `
      )
      .eq("viaje_id", viajeId);

    if (entregaError) {
      console.error("Error cargando entrega existente:", entregaError);
    }

    const entregas = (entregaData || []) as unknown as EntregaExistente[];
    setEntregasOriginales(entregas);

    const hoy = new Date().toISOString().slice(0, 10);
    const hora = new Date().toTimeString().slice(0, 5);

    const filas = ((cargaData || []) as unknown as CargaItem[]).map((item) => {
      const key = `${item.remision_id}-${item.producto_id}`;

      const entregaExistente = entregas.find(
        (entrega) =>
          entrega.remision_id === item.remision_id &&
          entrega.producto_id === item.producto_id
      );

      const cajasCargadas = Number(item.cajas_cargadas || 0);
      const bobinasCargadas = Number(item.bobinas_cargadas || 0);
      const kilosCargados = Number(item.kilos_cargados || 0);
      const piezasCargadas = Number(item.piezas_cargadas || 0);

      const cajasEntregadas = entregaExistente
        ? Number(entregaExistente.cajas_entregadas || 0)
        : cajasCargadas;

      const bobinasEntregadas = entregaExistente
        ? Number(entregaExistente.bobinas_entregadas || 0)
        : bobinasCargadas;

      const kilosEntregados = entregaExistente
        ? Number(entregaExistente.kilos_entregados || 0)
        : kilosCargados;

      const piezasEntregadas = entregaExistente
        ? Number(entregaExistente.piezas_entregadas || 0)
        : piezasCargadas;

      const cajasNoEntregadas = entregaExistente
        ? Number(entregaExistente.cajas_rechazadas || 0)
        : 0;

      const bobinasNoEntregadas = entregaExistente
        ? Number(entregaExistente.bobinas_rechazadas || 0)
        : 0;

      const kilosNoEntregados = entregaExistente
        ? Number(entregaExistente.kilos_rechazados || 0)
        : 0;

      const piezasNoEntregadas = entregaExistente
        ? Number(entregaExistente.piezas_rechazadas || 0)
        : 0;

      const totalEntregado =
        cajasEntregadas + bobinasEntregadas + kilosEntregados + piezasEntregadas;

      const totalNoEntregado =
        cajasNoEntregadas +
        bobinasNoEntregadas +
        kilosNoEntregados +
        piezasNoEntregadas;

      let resultadoEntrega: ResultadoEntrega = "entregado";

      if (entregaExistente) {
        if (totalEntregado > 0 && totalNoEntregado > 0) {
          resultadoEntrega = "editado";
        } else if (totalEntregado > 0) {
          resultadoEntrega = "entregado";
        } else {
          resultadoEntrega = "no_entregado";
        }
      }

      return {
        key,
        remision_id: item.remision_id,
        producto_id: item.producto_id,

        remision_folio: item.remisiones?.folio || "-",
        cliente_nombre: obtenerCliente(item.remisiones?.clientes || null),
        destino: item.remisiones?.destino || "-",
        producto_nombre: obtenerProducto(item.productos),

        cajas_cargadas: cajasCargadas,
        bobinas_cargadas: bobinasCargadas,
        kilos_cargados: kilosCargados,
        piezas_cargadas: piezasCargadas,

        cajas_entregadas: String(cajasEntregadas),
        bobinas_entregadas: String(bobinasEntregadas),
        kilos_entregados: String(kilosEntregados),
        piezas_entregadas: String(piezasEntregadas),

        cajas_no_entregadas: String(cajasNoEntregadas),
        bobinas_no_entregadas: String(bobinasNoEntregadas),
        kilos_no_entregados: String(kilosNoEntregados),
        piezas_no_entregadas: String(piezasNoEntregadas),

        resultado_entrega: resultadoEntrega,
        recibido_por: entregaExistente?.recibido_por || "",
        fecha_entrega: entregaExistente?.fecha_entrega || hoy,
        hora_entrega: entregaExistente?.hora_entrega || hora,
        motivo_no_entrega: entregaExistente?.motivo_diferencia || "",
        observaciones: entregaExistente?.observaciones || "",
      };
    });

    setCapturas(filas);
    setLoading(false);
  }

  function obtenerCliente(clientes: ClienteRelacion) {
    if (Array.isArray(clientes)) {
      return clientes[0]?.nombre || "-";
    }

    return clientes?.nombre || "-";
  }

  function obtenerProducto(productos: ProductoRelacion) {
    if (Array.isArray(productos)) {
      return productos[0]?.nombre || "-";
    }

    return productos?.nombre || "-";
  }

  function actualizarCaptura(
    key: string,
    campo:
      | "resultado_entrega"
      | "recibido_por"
      | "fecha_entrega"
      | "hora_entrega"
      | "motivo_no_entrega"
      | "observaciones"
      | "cajas_entregadas"
      | "bobinas_entregadas"
      | "kilos_entregados"
      | "piezas_entregadas"
      | "cajas_no_entregadas"
      | "bobinas_no_entregadas"
      | "kilos_no_entregados"
      | "piezas_no_entregadas",
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

  function actualizarTodas(
    campo: "fecha_entrega" | "hora_entrega" | "observaciones",
    valor: string
  ) {
    setCapturas((actuales) =>
      actuales.map((item) => ({
        ...item,
        [campo]: valor,
      }))
    );
  }

  function toNumber(valor: string) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
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

  function totalRemisionesUnicas() {
    return new Set(capturas.map((item) => item.remision_id)).size;
  }

  function capturaTieneAlgoNoEntregado(captura: CapturaEntrega) {
    return (
      toNumber(captura.cajas_no_entregadas) > 0 ||
      toNumber(captura.bobinas_no_entregadas) > 0 ||
      toNumber(captura.kilos_no_entregados) > 0 ||
      toNumber(captura.piezas_no_entregadas) > 0
    );
  }

  function totalEntregados() {
    return capturas.filter((item) => !capturaTieneAlgoNoEntregado(item)).length;
  }

  function totalNoEntregados() {
    return capturas.filter((item) => capturaTieneAlgoNoEntregado(item)).length;
  }

  function resumenCantidad(captura: CapturaEntrega) {
    const partes = [];

    if (captura.cajas_cargadas > 0) {
      partes.push(`${captura.cajas_cargadas} cajas`);
    }

    if (captura.bobinas_cargadas > 0) {
      partes.push(`${captura.bobinas_cargadas} bobinas`);
    }

    if (captura.kilos_cargados > 0) {
      partes.push(`${captura.kilos_cargados} kg`);
    }

    if (captura.piezas_cargadas > 0) {
      partes.push(`${captura.piezas_cargadas} piezas`);
    }

    return partes.length > 0 ? partes.join(" / ") : "Sin cantidad";
  }

  function marcarEntregado(key: string) {
    setCapturas((actuales) =>
      actuales.map((captura) => {
        if (captura.key !== key) return captura;

        return {
          ...captura,
          resultado_entrega: "entregado",
          cajas_entregadas: String(captura.cajas_cargadas),
          bobinas_entregadas: String(captura.bobinas_cargadas),
          kilos_entregados: String(captura.kilos_cargados),
          piezas_entregadas: String(captura.piezas_cargadas),
          cajas_no_entregadas: "0",
          bobinas_no_entregadas: "0",
          kilos_no_entregados: "0",
          piezas_no_entregadas: "0",
          motivo_no_entrega: "",
        };
      })
    );
  }

  function marcarNoEntregado(key: string) {
    setCapturas((actuales) =>
      actuales.map((captura) => {
        if (captura.key !== key) return captura;

        return {
          ...captura,
          resultado_entrega: "no_entregado",
          cajas_entregadas: "0",
          bobinas_entregadas: "0",
          kilos_entregados: "0",
          piezas_entregadas: "0",
          cajas_no_entregadas: String(captura.cajas_cargadas),
          bobinas_no_entregadas: String(captura.bobinas_cargadas),
          kilos_no_entregados: String(captura.kilos_cargados),
          piezas_no_entregadas: String(captura.piezas_cargadas),
          recibido_por: "",
        };
      })
    );
  }

  function ponerModoEditado(key: string) {
    setCapturas((actuales) =>
      actuales.map((captura) =>
        captura.key === key
          ? {
              ...captura,
              resultado_entrega: "editado",
            }
          : captura
      )
    );
  }

  function buscarEntregaOriginal(captura: CapturaEntrega) {
    return entregasOriginales.find(
      (item) =>
        item.remision_id === captura.remision_id &&
        item.producto_id === captura.producto_id
    );
  }

  function validarCuadre(captura: CapturaEntrega) {
    const cajas =
      toNumber(captura.cajas_entregadas) +
      toNumber(captura.cajas_no_entregadas);

    const bobinas =
      toNumber(captura.bobinas_entregadas) +
      toNumber(captura.bobinas_no_entregadas);

    const kilos =
      toNumber(captura.kilos_entregados) +
      toNumber(captura.kilos_no_entregados);

    const piezas =
      toNumber(captura.piezas_entregadas) +
      toNumber(captura.piezas_no_entregadas);

    return (
      cajas === captura.cajas_cargadas &&
      bobinas === captura.bobinas_cargadas &&
      kilos === captura.kilos_cargados &&
      piezas === captura.piezas_cargadas
    );
  }

  function prepararRegistrosBitacora(
    capturasActuales: CapturaEntrega[],
    userId: string | null
  ) {
    if (!esEdicion) return [];

    const registros: {
      viaje_id: string;
      remision_id: string;
      producto_id: string;
      campo_editado: string;
      valor_anterior: string | null;
      valor_nuevo: string | null;
      motivo_edicion: string | null;
      editado_por: string | null;
    }[] = [];

    capturasActuales.forEach((captura) => {
      const original = buscarEntregaOriginal(captura);

      const comparaciones = [
        {
          campo: "cajas_entregadas",
          anterior: String(Number(original?.cajas_entregadas || 0)),
          nuevo: String(toNumber(captura.cajas_entregadas)),
        },
        {
          campo: "bobinas_entregadas",
          anterior: String(Number(original?.bobinas_entregadas || 0)),
          nuevo: String(toNumber(captura.bobinas_entregadas)),
        },
        {
          campo: "kilos_entregados",
          anterior: String(Number(original?.kilos_entregados || 0)),
          nuevo: String(toNumber(captura.kilos_entregados)),
        },
        {
          campo: "piezas_entregadas",
          anterior: String(Number(original?.piezas_entregadas || 0)),
          nuevo: String(toNumber(captura.piezas_entregadas)),
        },
        {
          campo: "cajas_no_entregadas",
          anterior: String(Number(original?.cajas_rechazadas || 0)),
          nuevo: String(toNumber(captura.cajas_no_entregadas)),
        },
        {
          campo: "bobinas_no_entregadas",
          anterior: String(Number(original?.bobinas_rechazadas || 0)),
          nuevo: String(toNumber(captura.bobinas_no_entregadas)),
        },
        {
          campo: "kilos_no_entregados",
          anterior: String(Number(original?.kilos_rechazados || 0)),
          nuevo: String(toNumber(captura.kilos_no_entregados)),
        },
        {
          campo: "piezas_no_entregadas",
          anterior: String(Number(original?.piezas_rechazadas || 0)),
          nuevo: String(toNumber(captura.piezas_no_entregadas)),
        },
        {
          campo: "recibido_por",
          anterior: original?.recibido_por || "",
          nuevo: captura.recibido_por.trim(),
        },
        {
          campo: "fecha_entrega",
          anterior: original?.fecha_entrega || "",
          nuevo: captura.fecha_entrega || "",
        },
        {
          campo: "hora_entrega",
          anterior: original?.hora_entrega || "",
          nuevo: captura.hora_entrega || "",
        },
        {
          campo: "motivo_no_entrega",
          anterior: original?.motivo_diferencia || "",
          nuevo: captura.motivo_no_entrega.trim(),
        },
        {
          campo: "observaciones",
          anterior: original?.observaciones || "",
          nuevo: captura.observaciones.trim(),
        },
      ];

      comparaciones.forEach((item) => {
        if (item.anterior !== item.nuevo) {
          registros.push({
            viaje_id: viajeId,
            remision_id: captura.remision_id,
            producto_id: captura.producto_id,
            campo_editado: item.campo,
            valor_anterior: item.anterior || null,
            valor_nuevo: item.nuevo || null,
            motivo_edicion: motivoEdicion.trim() || null,
            editado_por: userId,
          });
        }
      });
    });

    return registros;
  }

  async function confirmarEntrega(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setErrorMsg("");

    const capturaSinCuadrar = capturas.find((captura) => !validarCuadre(captura));

    if (capturaSinCuadrar) {
      setErrorMsg(
        `Hay cantidades sin cuadrar en la remisión ${capturaSinCuadrar.remision_folio}. La suma de entregado más no entregado debe ser igual a lo cargado.`
      );
      setSaving(false);
      return;
    }

    const entregadoSinRecibio = capturas.find(
      (captura) =>
        !capturaTieneAlgoNoEntregado(captura) && !captura.recibido_por.trim()
    );

    if (entregadoSinRecibio) {
      setErrorMsg("Captura quién recibió el material entregado.");
      setSaving(false);
      return;
    }

    const noEntregadoSinMotivo = capturas.find(
      (captura) =>
        capturaTieneAlgoNoEntregado(captura) && !captura.motivo_no_entrega.trim()
    );

    if (noEntregadoSinMotivo) {
      setErrorMsg(
        "Captura el motivo cuando exista material no entregado o rechazado."
      );
      setSaving(false);
      return;
    }

    if (esEdicion && !motivoEdicion.trim()) {
      setErrorMsg("Captura el motivo de la edición para guardar la bitácora.");
      setSaving(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id || null;

    const registros = capturas.map((captura) => {
      const hayNoEntregado = capturaTieneAlgoNoEntregado(captura);

      return {
        viaje_id: viajeId,
        remision_id: captura.remision_id,
        producto_id: captura.producto_id,

        cajas_cargadas: captura.cajas_cargadas,
        bobinas_cargadas: captura.bobinas_cargadas,
        kilos_cargados: captura.kilos_cargados,
        piezas_cargadas: captura.piezas_cargadas,

        cajas_entregadas: toNumber(captura.cajas_entregadas),
        bobinas_entregadas: toNumber(captura.bobinas_entregadas),
        kilos_entregados: toNumber(captura.kilos_entregados),
        piezas_entregadas: toNumber(captura.piezas_entregadas),

        cajas_rechazadas: toNumber(captura.cajas_no_entregadas),
        bobinas_rechazadas: toNumber(captura.bobinas_no_entregadas),
        kilos_rechazados: toNumber(captura.kilos_no_entregados),
        piezas_rechazadas: toNumber(captura.piezas_no_entregadas),

        diferencia_detectada: hayNoEntregado,
        motivo_diferencia: hayNoEntregado
          ? captura.motivo_no_entrega.trim() || null
          : null,

        recibido_por: captura.recibido_por.trim() || null,
        fecha_entrega: captura.fecha_entrega || null,
        hora_entrega: captura.hora_entrega || null,
        observaciones: captura.observaciones.trim() || null,

        confirmado_por: userId,
        confirmado_at: new Date().toISOString(),
      };
    });

    const registrosBitacora = prepararRegistrosBitacora(capturas, userId);

    const { error: entregaError } = await supabase
      .from("entrega_items")
      .upsert(registros, {
        onConflict: "viaje_id,remision_id,producto_id",
      });

    if (entregaError) {
      console.error("Error guardando entrega:", entregaError);
      setErrorMsg("No se pudo guardar la entrega.");
      setSaving(false);
      return;
    }

    if (registrosBitacora.length > 0) {
      const { error: bitacoraError } = await supabase
        .from("entrega_ediciones_bitacora")
        .insert(registrosBitacora);

      if (bitacoraError) {
        console.error("Error guardando bitácora de edición:", bitacoraError);
      }
    }

    const remisionIds = [...new Set(capturas.map((item) => item.remision_id))];

    for (const remisionId of remisionIds) {
      const itemsRemision = capturas.filter(
        (item) => item.remision_id === remisionId
      );

      const tieneNoEntregado = itemsRemision.some((item) =>
        capturaTieneAlgoNoEntregado(item)
      );

      const nuevoEstado = tieneNoEntregado
        ? "rechazada"
        : "entregada_completa";

      const { error: remisionError } = await supabase
        .from("remisiones")
        .update({
          estado: nuevoEstado,
        })
        .eq("id", remisionId);

      if (remisionError) {
        console.error("Error actualizando remisión:", remisionError);
      }
    }

    const { error: viajeError } = await supabase
      .from("viajes")
      .update({
        estado: "regresado",
      })
      .eq("id", viajeId);

    if (viajeError) {
      console.error("Error actualizando viaje:", viajeError);
    }

    setSaving(false);
    router.push("/entregas");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">
        <AppNav />

        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            Cargando entrega del viaje...
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
              {esEdicion ? "Ver / editar entrega" : "Registrar entrega"}
            </h1>
            <p className="text-sm text-slate-500">
              Marca si el material fue entregado o no entregado. En edición
              puedes corregir cajas, bobinas, kilos y piezas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {esEdicion && (
              <Link
                href={`/entregas/${viajeId}/bitacora`}
                className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Ver bitácora
              </Link>
            )}

            <Link
              href="/entregas"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Regresar a entregas
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
                Materiales: <span className="font-bold">{capturas.length}</span>
              </p>

              <p className="text-sm text-slate-700">
                Entregados completos:{" "}
                <span className="font-bold text-green-600">
                  {totalEntregados()}
                </span>
              </p>

              <p className="text-sm text-slate-700">
                Con material no entregado:{" "}
                <span className="font-bold text-red-600">
                  {totalNoEntregados()}
                </span>
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={confirmarEntrega}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-900">
              Resultado de entrega
            </h3>

            <p className="text-sm text-slate-500">
              Para cada producto confirma si se entregó todo o registra la
              cantidad que no fue entregada.
            </p>
          </div>

          {esEdicion && (
            <div className="border-b border-yellow-200 bg-yellow-50 px-6 py-4">
              <label className="mb-1 block text-sm font-semibold text-yellow-800">
                Motivo de edición
              </label>

              <textarea
                className="min-h-20 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                value={motivoEdicion}
                onChange={(event) => setMotivoEdicion(event.target.value)}
                placeholder="Ejemplo: Se corrigieron kilos entregados por aclaración del chofer."
              />

              <p className="mt-2 text-xs text-yellow-700">
                Este motivo se guardará en la bitácora de cambios de la entrega.
              </p>
            </div>
          )}

          {capturas.length === 0 ? (
            <div className="p-6 text-slate-500">
              Este viaje no tiene mercancía cargada. Primero confirma la carga
              del camión.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {capturas.map((captura) => {
                const cuadreCorrecto = validarCuadre(captura);

                return (
                  <div
                    key={captura.key}
                    className={cuadreCorrecto ? "p-6" : "bg-red-50/50 p-6"}
                  >
                    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr_1fr]">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Remisión
                        </p>

                        <h4 className="mt-1 text-lg font-bold text-slate-900">
                          {captura.remision_folio}
                        </h4>

                        <p className="mt-1 text-sm text-slate-600">
                          Cliente:{" "}
                          <span className="font-medium text-slate-800">
                            {captura.cliente_nombre}
                          </span>
                        </p>

                        <p className="text-sm text-slate-600">
                          Destino: {captura.destino}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Producto
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {captura.producto_nombre}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          Cargado:{" "}
                          <span className="font-semibold">
                            {resumenCantidad(captura)}
                          </span>
                        </p>

                        {!cuadreCorrecto && (
                          <p className="mt-2 text-xs font-semibold text-red-600">
                            La suma de entregado + no entregado no cuadra con lo
                            cargado.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Resultado rápido
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => marcarEntregado(captura.key)}
                            className={
                              !capturaTieneAlgoNoEntregado(captura)
                                ? "rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                                : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            }
                          >
                            Entregado completo
                          </button>

                          <button
                            type="button"
                            onClick={() => marcarNoEntregado(captura.key)}
                            className={
                              capturaTieneAlgoNoEntregado(captura)
                                ? "rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                                : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            }
                          >
                            No entregado
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">
                              Concepto
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Cargado
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Entregado
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              No entregado
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          <FilaCantidad
                            label="Cajas"
                            cargado={captura.cajas_cargadas}
                            entregado={captura.cajas_entregadas}
                            noEntregado={captura.cajas_no_entregadas}
                            onEntregado={(valor) => {
                              ponerModoEditado(captura.key);
                              actualizarCaptura(
                                captura.key,
                                "cajas_entregadas",
                                valor
                              );
                            }}
                            onNoEntregado={(valor) => {
                              ponerModoEditado(captura.key);
                              actualizarCaptura(
                                captura.key,
                                "cajas_no_entregadas",
                                valor
                              );
                            }}
                          />

                          <FilaCantidad
                            label="Bobinas"
                            cargado={captura.bobinas_cargadas}
                            entregado={captura.bobinas_entregadas}
                            noEntregado={captura.bobinas_no_entregadas}
                            onEntregado={(valor) => {
                              ponerModoEditado(captura.key);
                              actualizarCaptura(
                                captura.key,
                                "bobinas_entregadas",
                                valor
                              );
                            }}
                            onNoEntregado={(valor) => {
                              ponerModoEditado(captura.key);
                              actualizarCaptura(
                                captura.key,
                                "bobinas_no_entregadas",
                                valor
                              );
                            }}
                          />

                          <FilaCantidad
                            label="Kilos"
                            cargado={captura.kilos_cargados}
                            entregado={captura.kilos_entregados}
                            noEntregado={captura.kilos_no_entregados}
                            step="0.01"
                            onEntregado={(valor) => {
                              ponerModoEditado(captura.key);
                              actualizarCaptura(
                                captura.key,
                                "kilos_entregados",
                                valor
                              );
                            }}
                            onNoEntregado={(valor) => {
                              ponerModoEditado(captura.key);
                              actualizarCaptura(
                                captura.key,
                                "kilos_no_entregados",
                                valor
                              );
                            }}
                          />

                          <FilaCantidad
                            label="Piezas"
                            cargado={captura.piezas_cargadas}
                            entregado={captura.piezas_entregadas}
                            noEntregado={captura.piezas_no_entregadas}
                            onEntregado={(valor) => {
                              ponerModoEditado(captura.key);
                              actualizarCaptura(
                                captura.key,
                                "piezas_entregadas",
                                valor
                              );
                            }}
                            onNoEntregado={(valor) => {
                              ponerModoEditado(captura.key);
                              actualizarCaptura(
                                captura.key,
                                "piezas_no_entregadas",
                                valor
                              );
                            }}
                          />
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      {!capturaTieneAlgoNoEntregado(captura) ? (
                        <CampoTexto
                          label="Recibió"
                          value={captura.recibido_por}
                          onChange={(valor) =>
                            actualizarCaptura(
                              captura.key,
                              "recibido_por",
                              valor
                            )
                          }
                          placeholder="Nombre de quien recibió"
                        />
                      ) : (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Motivo de no entrega
                          </label>

                          <input
                            type="text"
                            className="w-full rounded-xl border border-red-300 px-4 py-3 text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                            value={captura.motivo_no_entrega}
                            onChange={(event) =>
                              actualizarCaptura(
                                captura.key,
                                "motivo_no_entrega",
                                event.target.value
                              )
                            }
                            placeholder="Ejemplo: cliente cerrado, rechazo, dirección incorrecta..."
                          />
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Observaciones del material
                        </label>

                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                          value={captura.observaciones}
                          onChange={(event) =>
                            actualizarCaptura(
                              captura.key,
                              "observaciones",
                              event.target.value
                            )
                          }
                          placeholder="Notas adicionales"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {capturas.length > 0 && (
            <div className="grid gap-5 border-t border-slate-200 px-6 py-5 md:grid-cols-2">
              <CampoTexto
                label="Fecha de entrega"
                value={capturas[0]?.fecha_entrega || ""}
                onChange={(valor) => actualizarTodas("fecha_entrega", valor)}
                type="date"
              />

              <CampoTexto
                label="Hora de entrega"
                value={capturas[0]?.hora_entrega || ""}
                onChange={(valor) => actualizarTodas("hora_entrega", valor)}
                type="time"
              />

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Observaciones generales de entrega
                </label>

                <textarea
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  value={capturas[0]?.observaciones || ""}
                  onChange={(event) =>
                    actualizarTodas("observaciones", event.target.value)
                  }
                  placeholder="Notas del chofer, incidencias, devolución, etc."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
            <Link
              href="/entregas"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving || capturas.length === 0}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {saving
                ? "Guardando..."
                : esEdicion
                  ? "Guardar cambios"
                  : "Confirmar entrega"}
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

function FilaCantidad({
  label,
  cargado,
  entregado,
  noEntregado,
  onEntregado,
  onNoEntregado,
  step = "1",
}: {
  label: string;
  cargado: number;
  entregado: string;
  noEntregado: string;
  onEntregado: (value: string) => void;
  onNoEntregado: (value: string) => void;
  step?: string;
}) {
  return (
    <tr>
      <td className="px-3 py-2 font-semibold text-slate-700">{label}</td>

      <td className="px-3 py-2 text-right text-slate-600">{cargado}</td>

      <td className="px-3 py-2 text-right">
        <input
          type="number"
          min="0"
          step={step}
          className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-right text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          value={entregado}
          onChange={(event) => onEntregado(event.target.value)}
        />
      </td>

      <td className="px-3 py-2 text-right">
        <input
          type="number"
          min="0"
          step={step}
          className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-right text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          value={noEntregado}
          onChange={(event) => onNoEntregado(event.target.value)}
        />
      </td>
    </tr>
  );
}