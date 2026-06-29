"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRoleLabel, getVisibleModules } from "@/lib/auth/permissions";
import { useUserRole } from "@/lib/auth/useUserRole";

export default function AppNav() {
  const pathname = usePathname();
  const { role, loadingRole } = useUserRole();

  const navItems = getVisibleModules(role);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="no-print border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-400">
              Solflexo Entregas 360
            </p>

            <p className="text-xs text-slate-400">
              Control de remisiones, viajes, entregas y facturación
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Rol:{" "}
              <span className="font-semibold text-slate-300">
                {loadingRole ? "Cargando..." : getRoleLabel(role)}
              </span>
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm"
                      : "rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}