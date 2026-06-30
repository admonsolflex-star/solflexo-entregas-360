"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import AppNav from "@/components/AppNav";
import { useUserRole } from "@/lib/auth/useUserRole";
import { canAccessModule, canCreate } from "@/lib/auth/permissions";

type Cliente = {
  id: string;
  codigo_cliente: string | null;
nombre: string | null;
  rfc: string | null;
  correo: string | null;
  telefono: string | null;
  ciudad: string | null;
  estado: string | null;
  activo: boolean;
  origen: string | null;
  produccion_cliente_id: string | null;
};

export default function ClientesPage() {
  const { role, loadingRole } = useUserRole();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const puedeCrearCliente = !loadingRole && canCreate(role, "clientes");
  const puedeVerDirecciones = !loadingRole && canAccessModule(role, "clientes");

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("clientes")
      .select(
        "id, codigo_cliente, nombre, rfc, correo, telefono, ciudad, estado, activo, origen, produccion_cliente_id"
      )
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando clientes:", error);
      setErrorMsg("No se pudieron cargar los clientes.");
      setClientes([]);
    } else {
      setClientes((data || []) as Cliente[]);
    }

    setLoading(false);
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
            <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
            <p className="text-sm text-slate-500">
              Consulta clientes manuales e importados desde Solflexo Producción
              360.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cargarClientes}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>

            {puedeCrearCliente && (
              <Link
                href="/clientes/nuevo"
                className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Nuevo cliente
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
            Catálogo de clientes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Desde aquí puedes revisar datos fiscales, contacto, origen del
            cliente y direcciones de entrega.
          </p>

          {!puedeCrearCliente && (
            <p className="mt-2 text-sm font-medium text-yellow-700">
              Tu rol permite consultar clientes, pero no crear ni modificar
              registros.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-slate-500">Cargando clientes...</div>
          ) : clientes.length === 0 ? (
            <div className="p-6 text-slate-500">
              No hay clientes registrados.
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
                      Cliente
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">RFC</th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Correo
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Teléfono
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Ciudad
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Origen
                    </th>

                    <th className="px-6 py-3 text-left font-semibold">
                      Activo
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {cliente.codigo_cliente || "-"}
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-800">
                        {cliente.nombre || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {cliente.rfc || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {cliente.correo || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {cliente.telefono || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {cliente.ciudad || "-"}
                        {cliente.estado ? `, ${cliente.estado}` : ""}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${origenClase(
                            cliente.origen
                          )}`}
                        >
                          {origenTexto(cliente.origen)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${activoClase(
                            cliente.activo
                          )}`}
                        >
                          {cliente.activo ? "Sí" : "No"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {puedeVerDirecciones ? (
                            <Link
                              href={`/clientes/${cliente.id}/direcciones`}
                              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                            >
                              Direcciones
                            </Link>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              Sin acceso
                            </span>
                          )}
                        </div>
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