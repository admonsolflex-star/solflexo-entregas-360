export type UserRole =
  | "administrador"
  | "almacen"
  | "logistica"
  | "chofer"
  | "facturacion"
  | "lectura";

export type AppModule =
  | "dashboard"
  | "clientes"
  | "productos"
  | "remisiones"
  | "viajes"
  | "cargas"
  | "entregas"
  | "facturacion"
  | "conciliacion"
  | "bitacora";

export type AppAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "print"
  | "reprogram"
  | "cancel";

export type PermissionCheck = {
  role: string | null | undefined;
  module: AppModule;
  action?: AppAction;
};

export const DEFAULT_ROLE: UserRole = "lectura";

export function normalizeRole(role: string | null | undefined): UserRole {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();

  if (normalized === "administrador") return "administrador";
  if (normalized === "almacen") return "almacen";
  if (normalized === "logistica") return "logistica";
  if (normalized === "chofer") return "chofer";
  if (normalized === "facturacion") return "facturacion";
  if (normalized === "lectura") return "lectura";

  return DEFAULT_ROLE;
}

export function isAdministrador(role: string | null | undefined) {
  return normalizeRole(role) === "administrador";
}

export function canAccessModule(role: string | null | undefined, module: AppModule) {
  const userRole = normalizeRole(role);

  if (userRole === "administrador") return true;

  if (module === "dashboard") return true;

  if (userRole === "lectura") {
    return true;
  }

  if (userRole === "almacen") {
    return [
      "dashboard",
      "clientes",
      "productos",
      "remisiones",
      "viajes",
      "cargas",
      "entregas",
      "facturacion",
      "conciliacion",
    ].includes(module);
  }

  if (userRole === "logistica") {
    return [
      "dashboard",
      "clientes",
      "productos",
      "remisiones",
      "viajes",
      "cargas",
      "entregas",
      "facturacion",
      "conciliacion",
    ].includes(module);
  }

  if (userRole === "chofer") {
    return [
      "dashboard",
      "clientes",
      "productos",
      "remisiones",
      "viajes",
      "cargas",
      "entregas",
    ].includes(module);
  }

  if (userRole === "facturacion") {
    return [
      "dashboard",
      "clientes",
      "productos",
      "remisiones",
      "viajes",
      "cargas",
      "entregas",
      "facturacion",
      "conciliacion",
    ].includes(module);
  }

  return false;
}

export function canModifyModule(role: string | null | undefined, module: AppModule) {
  const userRole = normalizeRole(role);

  if (userRole === "administrador") return true;

  if (userRole === "lectura") return false;

  if (userRole === "almacen") {
    return module === "cargas";
  }

  if (userRole === "logistica") {
    return module === "remisiones" || module === "viajes";
  }

  if (userRole === "chofer") {
    return module === "entregas";
  }

  if (userRole === "facturacion") {
    return module === "facturacion" || module === "conciliacion";
  }

  return false;
}

export function canCreate(role: string | null | undefined, module: AppModule) {
  return canModifyModule(role, module);
}

export function canUpdate(role: string | null | undefined, module: AppModule) {
  return canModifyModule(role, module);
}

export function canDelete(role: string | null | undefined, module: AppModule) {
  return isAdministrador(role);
}

export function canPrint(role: string | null | undefined, module: AppModule) {
  return canAccessModule(role, module);
}

export function canReprogramRemision(role: string | null | undefined) {
  const userRole = normalizeRole(role);

  return userRole === "administrador" || userRole === "logistica";
}

export function canCancelFactura(role: string | null | undefined) {
  const userRole = normalizeRole(role);

  return userRole === "administrador" || userRole === "facturacion";
}

export function canViewBitacora(role: string | null | undefined) {
  return isAdministrador(role);
}

export function canInsertBitacoraEntrega(role: string | null | undefined) {
  const userRole = normalizeRole(role);

  return userRole === "administrador" || userRole === "chofer";
}

export function canAccessRoute(role: string | null | undefined, pathname: string) {
  const cleanPath = pathname.toLowerCase();

  if (cleanPath === "/" || cleanPath.startsWith("/auth")) {
    return true;
  }

  if (cleanPath.startsWith("/dashboard")) {
    return canAccessModule(role, "dashboard");
  }

  if (cleanPath.startsWith("/clientes")) {
    return canAccessModule(role, "clientes");
  }

  if (cleanPath.startsWith("/productos")) {
    return canAccessModule(role, "productos");
  }

  if (cleanPath.startsWith("/remisiones")) {
    return canAccessModule(role, "remisiones");
  }

  if (cleanPath.startsWith("/viajes")) {
    return canAccessModule(role, "viajes");
  }

  if (cleanPath.startsWith("/cargas")) {
    return canAccessModule(role, "cargas");
  }

  if (cleanPath.startsWith("/entregas")) {
    return canAccessModule(role, "entregas");
  }

  if (cleanPath.startsWith("/facturacion")) {
    return canAccessModule(role, "facturacion");
  }

  if (cleanPath.startsWith("/conciliacion")) {
    return canAccessModule(role, "conciliacion");
  }

  return isAdministrador(role);
}

export function getVisibleModules(role: string | null | undefined) {
  const modules: {
    label: string;
    href: string;
    module: AppModule;
  }[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      module: "dashboard",
    },
    {
      label: "Remisiones",
      href: "/remisiones",
      module: "remisiones",
    },
    {
      label: "Viajes",
      href: "/viajes",
      module: "viajes",
    },
    {
      label: "Cargas",
      href: "/cargas",
      module: "cargas",
    },
    {
      label: "Entregas",
      href: "/entregas",
      module: "entregas",
    },
    {
      label: "Facturación",
      href: "/facturacion",
      module: "facturacion",
    },
    {
      label: "Conciliación",
      href: "/conciliacion",
      module: "conciliacion",
    },
    {
      label: "Clientes",
      href: "/clientes",
      module: "clientes",
    },
    {
      label: "Productos",
      href: "/productos",
      module: "productos",
    },
  ];

  return modules.filter((item) => canAccessModule(role, item.module));
}

export function getRoleLabel(role: string | null | undefined) {
  const userRole = normalizeRole(role);

  const labels: Record<UserRole, string> = {
    administrador: "Administrador",
    almacen: "Almacén",
    logistica: "Logística",
    chofer: "Chofer",
    facturacion: "Facturación",
    lectura: "Lectura",
  };

  return labels[userRole];
}