"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";
import { useUserRole } from "@/lib/auth/useUserRole";
import { canCreate } from "@/lib/auth/permissions";

type ClienteRelacion =
  | {
      nombre: string | null;
    }[]
  | {
      nombre: string | null;
    }
  | null;

type Producto = {
  id: string;
  codigo_producto: string | null;
  nombre: string | null;
  tipo_producto: string | null;
  unidad_principal: string | null;
  activo: boolean;
  origen: string | null;
  cliente_id: string | null;
  clientes: ClienteRelacion;
};

export default function ProductosPage() {
  const { role, loadingRole } = useUserRole();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const puedeCrearProducto = !loadingRole && canCreate(role, "productos");

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("productos")
      .select(
        `
        id,
        codigo_producto,
        nombre,
        tipo_producto,
        unidad_principal,
        activo,
        origen,
        cliente_id,
        clientes (
          nombre
        )
      `
      )
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando productos:", error);
      setErrorMsg("No se pudieron cargar los productos.");
      setProductos([]);
    } else {
      setProductos((data || []) as unknown as Producto[]);
    }

    setLoading(false);
  }

  function obtenerCliente(producto: Producto) {
    if (Array.isArray(producto.clientes)) {
      return producto.clientes[0]?.nombre || "-";
    }

    return producto.clientes?.nombre || "-";
  }

  function esOrigenProduccion(origen: string | null) {
  const valor = String(origen || "").toUpperCase();

  return (
    valor === "PRODUCCION" ||
    valor === "PRODUCCION_360" ||
    valor === "PRODUCCIÓN 360"
  );
}

function origenTexto(origen: string | null) {
  if (esOrigenProduccion(origen)) {
    return "Producción 360";
  }

  return "Manual";
}

function origenClase(origen: string | null) {
  if (esOrigenProduccion(origen)) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

  function activoClase(activo: boolean) {
    if (activo) {
      return "bg-green-50 text-green-700";
    }

    return "bg-red-50 text-red-700";
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
            <p className="text-sm text-slate-500">
              Consulta productos manuales e importados desde Solflexo Producción
              360.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cargarProductos}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>

            {puedeCrearProducto && (
              <Link
                href="/productos/nuevo"
                className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Nuevo producto
              </Link>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Catálogo de productos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Desde aquí puedes revisar producto, cliente ligado, tipo, unidad,
            origen y estado.
          </p>

          {!puedeCrearProducto && (
            <p className="mt-2 text-sm font-medium text-yellow-700">
              Tu rol permite consultar productos, pero no crear ni modificar
              registros.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-slate-500">Cargando productos...</div>
          ) : productos.length === 0 ? (
            <div className="p-6 text-slate-500">
              No hay productos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">
                      Código
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Producto
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Cliente
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Tipo
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Unidad
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Origen
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Activo
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {productos.map((producto) => (
                    <tr key={producto.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {producto.codigo_producto || "-"}
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-800">
                        {producto.nombre}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {obtenerCliente(producto)}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {producto.tipo_producto || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {producto.unidad_principal || "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${origenClase(
                            producto.origen
                          )}`}
                        >
                          {origenTexto(producto.origen)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${activoClase(
                            producto.activo
                          )}`}
                        >
                          {producto.activo ? "Sí" : "No"}
                        </span>
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