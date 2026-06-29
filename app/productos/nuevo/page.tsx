"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function NuevoProductoPage() {
  const router = useRouter();

  const [codigoProducto, setCodigoProducto] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipoProducto, setTipoProducto] = useState("");
  const [unidadPrincipal, setUnidadPrincipal] = useState("caja");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function guardarProducto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.from("productos").insert({
      codigo_producto: codigoProducto.trim(),
      nombre: nombre.trim(),
      tipo_producto: tipoProducto.trim() || null,
      unidad_principal: unidadPrincipal,
      activo: true,
    });

    setLoading(false);

    if (error) {
      console.error("Error guardando producto:", error);

      if (error.message.includes("duplicate key")) {
        setErrorMsg("Ya existe un producto con ese código.");
        return;
      }

      setErrorMsg("No se pudo guardar el producto.");
      return;
    }

    router.push("/productos");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-sky-400 font-semibold">
              Solflexo Entregas 360
            </p>
            <h1 className="text-2xl font-bold">Nuevo producto</h1>
          </div>

          <Link
            href="/productos"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Regresar
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-8">
        <form
          onSubmit={guardarProducto}
          className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-6"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Datos del producto
            </h2>
            <p className="text-sm text-slate-500">
              El código de producto servirá después para ligarlo con Solflexo
              Producción 360.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Campo
              label="Código producto"
              value={codigoProducto}
              onChange={setCodigoProducto}
              placeholder="PROD-0001"
              required
            />

            <Campo
              label="Nombre del producto"
              value={nombre}
              onChange={setNombre}
              placeholder="Bolsa camiseta 30x40"
              required
            />

            <Campo
              label="Tipo de producto"
              value={tipoProducto}
              onChange={setTipoProducto}
              placeholder="bolsa, bobina, rollo, película..."
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unidad principal
              </label>
              <select
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                value={unidadPrincipal}
                onChange={(event) => setUnidadPrincipal(event.target.value)}
              >
                <option value="caja">Caja</option>
                <option value="bobina">Bobina</option>
                <option value="kilo">Kilo</option>
                <option value="pieza">Pieza</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/productos"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar producto"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        required={required}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}