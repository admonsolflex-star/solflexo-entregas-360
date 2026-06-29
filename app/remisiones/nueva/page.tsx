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

type Producto = {
  id: string;
  codigo_producto: string;
  nombre: string;
  unidad_principal: string;
  cliente_id: string | null;
};

type DireccionEntrega = {
  id: string;
  cliente_id: string;
  nombre_direccion: string;
  direccion: string;
  ciudad: string | null;
  estado: string | null;
  codigo_postal: string | null;
  contacto: string | null;
  telefono: string | null;
  referencias: string | null;
  es_principal: boolean;
};

export default function NuevaRemisionPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [direcciones, setDirecciones] = useState<DireccionEntrega[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [productoId, setProductoId] = useState("");
  const [direccionEntregaId, setDireccionEntregaId] = useState("");

  const [folio, setFolio] = useState("");
  const [fechaProgramada, setFechaProgramada] = useState("");

  const [destino, setDestino] = useState("");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [ciudadEntrega, setCiudadEntrega] = useState("");
  const [estadoEntrega, setEstadoEntrega] = useState("");
  const [codigoPostalEntrega, setCodigoPostalEntrega] = useState("");
  const [contactoEntrega, setContactoEntrega] = useState("");
  const [telefonoEntrega, setTelefonoEntrega] = useState("");
  const [referenciasEntrega, setReferenciasEntrega] = useState("");

  const [op, setOp] = useState("");
  const [oc, setOc] = useState("");

  const [cajas, setCajas] = useState("");
  const [bobinas, setBobinas] = useState("");
  const [kilos, setKilos] = useState("");
  const [piezas, setPiezas] = useState("");

  const [observaciones, setObservaciones] = useState("");
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [loadingDirecciones, setLoadingDirecciones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    cargarCatalogos();
    generarFolioTemporal();
  }, []);

  const productosFiltrados = useMemo(() => {
    if (!clienteId) return [];

    return productos.filter((producto) => producto.cliente_id === clienteId);
  }, [productos, clienteId]);

  async function cargarCatalogos() {
    setLoadingCatalogos(true);

    const [
      { data: clientesData, error: clientesError },
      { data: productosData, error: productosError },
    ] = await Promise.all([
      supabase
        .from("clientes")
        .select("id, codigo_cliente, nombre")
        .eq("activo", true)
        .order("nombre", { ascending: true }),

      supabase
        .from("productos")
        .select("id, codigo_producto, nombre, unidad_principal, cliente_id")
        .eq("activo", true)
        .order("nombre", { ascending: true }),
    ]);

    if (clientesError) {
      console.error("Error cargando clientes:", clientesError);
    }

    if (productosError) {
      console.error("Error cargando productos:", productosError);
    }

    setClientes((clientesData || []) as Cliente[]);
    setProductos((productosData || []) as Producto[]);
    setLoadingCatalogos(false);
  }

  async function cargarDireccionesCliente(idCliente: string) {
    setLoadingDirecciones(true);

    const { data, error } = await supabase
      .from("cliente_direcciones_entrega")
      .select(
        `
        id,
        cliente_id,
        nombre_direccion,
        direccion,
        ciudad,
        estado,
        codigo_postal,
        contacto,
        telefono,
        referencias,
        es_principal
      `
      )
      .eq("cliente_id", idCliente)
      .eq("activo", true)
      .order("es_principal", { ascending: false })
      .order("nombre_direccion", { ascending: true });

    if (error) {
      console.error("Error cargando direcciones de entrega:", error);
      setDirecciones([]);
      limpiarDatosEntrega();
      setLoadingDirecciones(false);
      return;
    }

    const lista = (data || []) as DireccionEntrega[];
    setDirecciones(lista);

    const direccionPrincipal =
      lista.find((item) => item.es_principal) || lista[0];

    if (direccionPrincipal) {
      seleccionarDireccion(direccionPrincipal.id, lista);
    } else {
      limpiarDatosEntrega();
    }

    setLoadingDirecciones(false);
  }

  function generarFolioTemporal() {
    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, "0");
    const dd = String(ahora.getDate()).padStart(2, "0");
    const hh = String(ahora.getHours()).padStart(2, "0");
    const min = String(ahora.getMinutes()).padStart(2, "0");
    const ss = String(ahora.getSeconds()).padStart(2, "0");

    setFolio(`REM-${yyyy}${mm}${dd}-${hh}${min}${ss}`);
  }

  function limpiarDatosEntrega() {
    setDireccionEntregaId("");
    setDestino("");
    setDireccionEntrega("");
    setCiudadEntrega("");
    setEstadoEntrega("");
    setCodigoPostalEntrega("");
    setContactoEntrega("");
    setTelefonoEntrega("");
    setReferenciasEntrega("");
  }

  function limpiarCantidades() {
    setCajas("");
    setBobinas("");
    setKilos("");
    setPiezas("");
  }

  function seleccionarCliente(id: string) {
    setClienteId(id);
    setProductoId("");
    setDirecciones([]);
    limpiarDatosEntrega();
    limpiarCantidades();

    if (id) {
      cargarDireccionesCliente(id);
    }
  }

  function seleccionarDireccion(id: string, listaOpcional?: DireccionEntrega[]) {
    const lista = listaOpcional || direcciones;
    const direccion = lista.find((item) => item.id === id);

    setDireccionEntregaId(id);

    if (!direccion) {
      limpiarDatosEntrega();
      return;
    }

    setDestino(direccion.nombre_direccion || "");
    setDireccionEntrega(direccion.direccion || "");
    setCiudadEntrega(direccion.ciudad || "");
    setEstadoEntrega(direccion.estado || "");
    setCodigoPostalEntrega(direccion.codigo_postal || "");
    setContactoEntrega(direccion.contacto || "");
    setTelefonoEntrega(direccion.telefono || "");
    setReferenciasEntrega(direccion.referencias || "");
  }

  function seleccionarProducto(id: string) {
    setProductoId(id);
    limpiarCantidades();
  }

  function toNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async function guardarRemision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setErrorMsg("");

    if (!clienteId) {
      setErrorMsg("Selecciona un cliente.");
      setSaving(false);
      return;
    }

    if (!productoId) {
      setErrorMsg("Selecciona un producto.");
      setSaving(false);
      return;
    }

    if (!direccionEntregaId) {
      setErrorMsg("Selecciona el lugar de entrega.");
      setSaving(false);
      return;
    }

    if (!destino.trim()) {
      setErrorMsg("Captura el destino de entrega.");
      setSaving(false);
      return;
    }

    const cajasNum = toNumber(cajas);
    const bobinasNum = toNumber(bobinas);
    const kilosNum = toNumber(kilos);
    const piezasNum = toNumber(piezas);

    if (cajasNum <= 0 && bobinasNum <= 0 && kilosNum <= 0 && piezasNum <= 0) {
      setErrorMsg(
        "Captura al menos una cantidad: cajas, bobinas, kilos o piezas."
      );
      setSaving(false);
      return;
    }

    const { data: remisionCreada, error: remisionError } = await supabase
      .from("remisiones")
      .insert({
        folio: folio.trim(),
        cliente_id: clienteId,
        direccion_entrega_id: direccionEntregaId || null,
        fecha_programada_entrega: fechaProgramada || null,
        destino: destino.trim(),

        direccion_entrega: direccionEntrega.trim() || null,
        ciudad_entrega: ciudadEntrega.trim() || null,
        estado_entrega: estadoEntrega.trim() || null,
        codigo_postal_entrega: codigoPostalEntrega.trim() || null,
        contacto_entrega: contactoEntrega.trim() || null,
        telefono_entrega: telefonoEntrega.trim() || null,

        orden_produccion_folio: op.trim() || null,
        orden_compra_folio: oc.trim() || null,
        estado: "capturada",
        observaciones: observaciones.trim() || null,
      })
      .select("id")
      .single();

    if (remisionError || !remisionCreada) {
      console.error("Error guardando remisión:", remisionError);
      setErrorMsg("No se pudo guardar la remisión.");
      setSaving(false);
      return;
    }

    const { error: itemError } = await supabase.from("remision_items").insert({
      remision_id: remisionCreada.id,
      producto_id: productoId,
      cajas: cajasNum,
      bobinas: bobinasNum,
      kilos: kilosNum,
      piezas: piezasNum,
      descripcion_extra: referenciasEntrega.trim() || null,
    });

    if (itemError) {
      console.error("Error guardando partida de remisión:", itemError);
      setErrorMsg(
        "Se creó la remisión, pero no se pudo guardar el producto. Revisa Supabase."
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/remisiones");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Nueva remisión
            </h1>
            <p className="text-sm text-slate-500">
              Captura cliente, producto, lugar de entrega y cantidades.
            </p>
          </div>

          <Link
            href="/remisiones"
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Regresar a remisiones
          </Link>
        </div>

        <form
          onSubmit={guardarRemision}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Datos generales
            </h2>
            <p className="text-sm text-slate-500">
              Primero selecciona el cliente. Después sólo aparecerán los
              productos ligados a ese cliente.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {loadingCatalogos ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Cargando clientes y productos...
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <CampoTexto
                  label="Folio remisión"
                  value={folio}
                  onChange={setFolio}
                  required
                />

                <CampoTexto
                  label="Fecha programada de entrega"
                  value={fechaProgramada}
                  onChange={setFechaProgramada}
                  type="date"
                />

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

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Producto
                  </label>
                  <select
                    required
                    disabled={!clienteId || productosFiltrados.length === 0}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-400"
                    value={productoId}
                    onChange={(event) => seleccionarProducto(event.target.value)}
                  >
                    <option value="">
                      {!clienteId
                        ? "Primero selecciona un cliente"
                        : productosFiltrados.length === 0
                        ? "Este cliente no tiene productos ligados"
                        : "Selecciona producto"}
                    </option>

                    {productosFiltrados.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.codigo_producto} - {producto.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <CampoTexto
                  label="Orden de producción OP opcional"
                  value={op}
                  onChange={setOp}
                  placeholder="OP-0001"
                />

                <CampoTexto
                  label="Orden de compra OC opcional"
                  value={oc}
                  onChange={setOc}
                  placeholder="OC-0001"
                />
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Datos de entrega
                </h3>
                <p className="text-sm text-slate-500">
                  Selecciona el lugar de entrega del cliente. El destino será
                  sólo el nombre del lugar, y la dirección se guardará por
                  separado.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Lugar de entrega
                    </label>
                    <select
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-400"
                      value={direccionEntregaId}
                      onChange={(event) =>
                        seleccionarDireccion(event.target.value)
                      }
                      disabled={!clienteId || loadingDirecciones}
                    >
                      <option value="">
                        {!clienteId
                          ? "Primero selecciona un cliente"
                          : loadingDirecciones
                          ? "Cargando direcciones..."
                          : direcciones.length === 0
                          ? "Este cliente no tiene direcciones"
                          : "Selecciona lugar de entrega"}
                      </option>

                      {direcciones.map((direccion) => (
                        <option key={direccion.id} value={direccion.id}>
                          {direccion.nombre_direccion}
                          {direccion.es_principal ? " - Principal" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <CampoTexto
                    label="Destino"
                    value={destino}
                    onChange={setDestino}
                    placeholder="Ejemplo: Bodega Guadalajara"
                    required
                  />

                  <CampoTexto
                    label="Dirección de entrega"
                    value={direccionEntrega}
                    onChange={setDireccionEntrega}
                    placeholder="Domicilio de entrega"
                  />

                  <CampoTexto
                    label="Ciudad"
                    value={ciudadEntrega}
                    onChange={setCiudadEntrega}
                    placeholder="Ciudad"
                  />

                  <CampoTexto
                    label="Estado"
                    value={estadoEntrega}
                    onChange={setEstadoEntrega}
                    placeholder="Estado"
                  />

                  <CampoTexto
                    label="Código postal"
                    value={codigoPostalEntrega}
                    onChange={setCodigoPostalEntrega}
                    placeholder="CP"
                  />

                  <CampoTexto
                    label="Contacto de entrega"
                    value={contactoEntrega}
                    onChange={setContactoEntrega}
                    placeholder="Persona que recibe"
                  />

                  <CampoTexto
                    label="Teléfono de entrega"
                    value={telefonoEntrega}
                    onChange={setTelefonoEntrega}
                    placeholder="Teléfono"
                  />
                </div>

                <div className="mt-5">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Referencias de entrega
                  </label>
                  <textarea
                    className="min-h-20 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    value={referenciasEntrega}
                    onChange={(event) =>
                      setReferenciasEntrega(event.target.value)
                    }
                    placeholder="Referencias para el chofer"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Cantidades
                </h3>
                <p className="text-sm text-slate-500">
                  Captura las unidades que apliquen para el producto.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-4">
                  <CampoTexto
                    label="Cajas"
                    value={cajas}
                    onChange={setCajas}
                    type="number"
                    placeholder="0"
                  />

                  <CampoTexto
                    label="Bobinas"
                    value={bobinas}
                    onChange={setBobinas}
                    type="number"
                    placeholder="0"
                  />

                  <CampoTexto
                    label="Kilos"
                    value={kilos}
                    onChange={setKilos}
                    type="number"
                    step="0.01"
                    placeholder="0"
                  />

                  <CampoTexto
                    label="Piezas"
                    value={piezas}
                    onChange={setPiezas}
                    type="number"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Observaciones generales
                </label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  value={observaciones}
                  onChange={(event) => setObservaciones(event.target.value)}
                  placeholder="Notas adicionales de la entrega"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Link
                  href="/remisiones"
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar remisión"}
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