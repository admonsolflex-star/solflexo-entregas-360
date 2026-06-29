"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";

type Perfil = {
  id: string;
  rol: string | null;
  nombre?: string | null;
};

type BitacoraItem = {
  id: string;
  viaje_id: string;
  remision_id: string | null;
  producto_id: string | null;
  campo_editado: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  motivo_edicion: string | null;
  editado_por: string | null;
  editado_at: string;

  remisiones:
    | {
        folio: string;
      }[]
    | {
        folio: string;
      }
    | null;

  productos:
    | {
        nombre: string;
      }[]
    | {
        nombre: string;
      }
    | null;

  viajes:
    | {
        folio: string;
      }[]
    | {
        folio: string;
      }
    | null;
};

type Viaje = {
  id: string;
  folio: string;
  fecha: string;
  chofer_nombre: string;
  camion: string | null;
  ruta: string | null;
  estado: string;
};

export default function BitacoraEntregaPage() {
  const params = useParams();
  const viajeId = params.viajeId as string;

  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [bitacora, setBitacora] = useState<BitacoraItem[]>([]);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [usuariosPorId, setUsuariosPorId] = useState<Record<string, string>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (viajeId) {
      cargarDatos();
    }
  }, [viajeId]);

  async function cargarDatos() {
    setLoading(true);
    setErrorMsg("");

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id || null;

    if (!userId) {
      setErrorMsg("No hay sesión activa.");
      setAutorizado(false);
      setLoading(false);
      return;
    }

    const { data: perfilData, error: perfilError } = await supabase
      .from("profiles")
      .select("id, rol, nombre")
      .eq("id", userId)
      .single();

    if (perfilError || !perfilData) {
      console.error("Error cargando perfil:", perfilError);
      setErrorMsg("No se pudo validar el perfil del usuario.");
      setAutorizado(false);
      setLoading(false);
      return;
    }

    const perfilActual = perfilData as Perfil;
    setPerfil(perfilActual);

    const rolNormalizado = String(perfilActual.rol || "")
      .trim()
      .toLowerCase();

    const esAdmin = [
      "admin",
      "administrador",
      "administrator",
      "superadmin",
      "super_admin",
    ].includes(rolNormalizado);

    if (!esAdmin) {
      setAutorizado(false);
      setLoading(false);
      return;
    }

    setAutorizado(true);

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

    setViaje(viajeData as Viaje);

    const { data: bitacoraData, error: bitacoraError } = await supabase
      .from("entrega_ediciones_bitacora")
      .select(
        `
        id,
        viaje_id,
        remision_id,
        producto_id,
        campo_editado,
        valor_anterior,
        valor_nuevo,
        motivo_edicion,
        editado_por,
        editado_at,
        remisiones (
          folio
        ),
        productos (
          nombre
        ),
        viajes (
          folio
        )
      `
      )
      .eq("viaje_id", viajeId)
      .order("editado_at", { ascending: false });

    if (bitacoraError) {
      console.error("Error cargando bitácora:", bitacoraError);
      setErrorMsg("No se pudo cargar la bitácora de ediciones.");
      setBitacora([]);
      setLoading(false);
      return;
    }

    const bitacoraItems = (bitacoraData || []) as unknown as BitacoraItem[];
    setBitacora(bitacoraItems);

    const usuarioIds = [
      ...new Set(
        bitacoraItems
          .map((item) => item.editado_por)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (usuarioIds.length > 0) {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from("profiles")
        .select("id, nombre")
        .in("id", usuarioIds);

      if (usuariosError) {
        console.error("Error cargando usuarios de bitácora:", usuariosError);
      } else {
        const mapaUsuarios: Record<string, string> = {};

        (usuariosData || []).forEach((usuario) => {
          mapaUsuarios[usuario.id] = usuario.nombre || usuario.id;
        });

        setUsuariosPorId(mapaUsuarios);
      }
    }

    setLoading(false);
  }

  function obtenerRemision(item: BitacoraItem) {
    if (Array.isArray(item.remisiones)) {
      return item.remisiones[0]?.folio || "-";
    }

    return item.remisiones?.folio || "-";
  }

  function obtenerProducto(item: BitacoraItem) {
    if (Array.isArray(item.productos)) {
      return item.productos[0]?.nombre || "-";
    }

    return item.productos?.nombre || "-";
  }

  function obtenerUsuario(editadoPor: string | null) {
    if (!editadoPor) return "-";

    return usuariosPorId[editadoPor] || editadoPor;
  }

  function campoTexto(campo: string) {
    const campos: Record<string, string> = {
      resultado_entrega: "Resultado de entrega",
      recibido_por: "Recibió",
      fecha_entrega: "Fecha de entrega",
      hora_entrega: "Hora de entrega",
      motivo_no_entrega: "Motivo de no entrega",
      observaciones: "Observaciones",

      cajas_entregadas: "Cajas entregadas",
      bobinas_entregadas: "Bobinas entregadas",
      kilos_entregados: "Kilos entregados",
      piezas_entregadas: "Piezas entregadas",

      cajas_no_entregadas: "Cajas no entregadas",
      bobinas_no_entregadas: "Bobinas no entregadas",
      kilos_no_entregados: "Kilos no entregados",
      piezas_no_entregadas: "Piezas no entregadas",
    };

    return campos[campo] || campo;
  }

  function valorTexto(valor: string | null) {
    if (!valor) return "-";

    if (valor === "entregado") return "Entregado";
    if (valor === "no_entregado") return "No entregado";

    return valor;
  }

  function formatearFechaHora(fecha: string | null) {
    if (!fecha) return "-";

    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fecha));
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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">
        <AppNav />

        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            Cargando bitácora...
          </div>
        </section>
      </main>
    );
  }

  if (!autorizado) {
    return (
      <main className="min-h-screen bg-slate-100">
        <AppNav />

        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <h1 className="text-xl font-bold">Acceso restringido</h1>

            <p className="mt-2 text-sm">
              Esta bitácora sólo debe ser visible para usuarios administradores.
            </p>

            {perfil && (
              <p className="mt-2 text-sm">
                Rol detectado:{" "}
                <span className="font-semibold">{perfil.rol || "-"}</span>
              </p>
            )}

            {errorMsg && <p className="mt-2 text-sm">{errorMsg}</p>}

            <Link
              href={`/entregas/${viajeId}`}
              className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Regresar a entrega
            </Link>
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
              Bitácora de edición de entrega
            </h1>

            <p className="text-sm text-slate-500">
              Consulta qué se editó, valor anterior, valor nuevo, motivo y fecha
              de modificación.
            </p>
          </div>

          <Link
            href={`/entregas/${viajeId}`}
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Regresar a entrega
          </Link>
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
                Chofer
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {viaje.chofer_nombre}
              </p>

              <p className="text-sm text-slate-500">
                Camión: {viaje.camion || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Ediciones registradas
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {bitacora.length}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              Historial de cambios
            </h2>

            <p className="text-sm text-slate-500">
              Cada renglón representa un campo modificado después de confirmar
              la entrega.
            </p>
          </div>

          {bitacora.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Esta entrega no tiene ediciones registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">
                      Fecha edición
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Remisión
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Producto
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Campo
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Valor anterior
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Valor nuevo
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Motivo edición
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Editado por
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {bitacora.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                        {formatearFechaHora(item.editado_at)}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {obtenerRemision(item)}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {obtenerProducto(item)}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {campoTexto(item.campo_editado)}
                      </td>

                      <td className="max-w-[240px] px-6 py-4 text-slate-600">
                        {valorTexto(item.valor_anterior)}
                      </td>

                      <td className="max-w-[240px] px-6 py-4 font-medium text-slate-800">
                        {valorTexto(item.valor_nuevo)}
                      </td>

                      <td className="max-w-[280px] px-6 py-4 text-slate-600">
                        {item.motivo_edicion || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {obtenerUsuario(item.editado_por)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}