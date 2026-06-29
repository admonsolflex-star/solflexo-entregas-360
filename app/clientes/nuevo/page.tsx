"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function NuevoClientePage() {
  const router = useRouter();

  const [codigoCliente, setCodigoCliente] = useState("");
  const [nombre, setNombre] = useState("");
  const [rfc, setRfc] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [estado, setEstado] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function guardarCliente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.from("clientes").insert({
      codigo_cliente: codigoCliente.trim(),
      nombre: nombre.trim(),
      rfc: rfc.trim() || null,
      correo: correo.trim() || null,
      telefono: telefono.trim() || null,
      direccion: direccion.trim() || null,
      ciudad: ciudad.trim() || null,
      estado: estado.trim() || null,
      activo: true,
    });

    setLoading(false);

    if (error) {
      console.error("Error guardando cliente:", error);

      if (error.message.includes("duplicate key")) {
        setErrorMsg("Ya existe un cliente con ese código.");
        return;
      }

      setErrorMsg("No se pudo guardar el cliente.");
      return;
    }

    router.push("/clientes");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-sky-400 font-semibold">
              Solflexo Entregas 360
            </p>
            <h1 className="text-2xl font-bold">Nuevo cliente</h1>
          </div>

          <Link
            href="/clientes"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Regresar
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-8">
        <form
          onSubmit={guardarCliente}
          className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-6"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Datos del cliente
            </h2>
            <p className="text-sm text-slate-500">
              El código de cliente servirá después para ligarlo con Solflexo
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
              label="Código cliente"
              value={codigoCliente}
              onChange={setCodigoCliente}
              placeholder="CLI-0001"
              required
            />

            <Campo
              label="Nombre"
              value={nombre}
              onChange={setNombre}
              placeholder="Nombre del cliente"
              required
            />

            <Campo
              label="RFC"
              value={rfc}
              onChange={setRfc}
              placeholder="RFC"
            />

            <Campo
              label="Correo"
              value={correo}
              onChange={setCorreo}
              placeholder="correo@cliente.com"
              type="email"
            />

            <Campo
              label="Teléfono"
              value={telefono}
              onChange={setTelefono}
              placeholder="3510000000"
            />

            <Campo
              label="Ciudad"
              value={ciudad}
              onChange={setCiudad}
              placeholder="Zamora"
            />

            <Campo
              label="Estado"
              value={estado}
              onChange={setEstado}
              placeholder="Michoacán"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Dirección
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              placeholder="Dirección completa"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/clientes"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar cliente"}
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