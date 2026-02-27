export const MODULE_PERMISSION_KEYS = [
  'dashboard',
  'leads',
  'products',
  'quotations',
  'work_orders',
  'kots',
  'deliveries',
  'invoices',
  'settings',
  'reports',
  'users',
];

export const MODULE_PERMISSION_LABELS = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  products: 'Products',
  quotations: 'Quotations',
  work_orders: 'Work Orders',
  kots: 'KOT',
  deliveries: 'Delivery',
  invoices: 'Invoices',
  settings: 'Settings',
  reports: 'Reports',
  users: 'Users',
};

export const MODULE_DEFAULT_ROUTES = {
  dashboard: '/dashboard',
  leads: '/leads',
  products: '/products/list',
  quotations: '/quotations',
  work_orders: '/workorders',
  kots: '/kots',
  deliveries: '/deliveries',
  invoices: '/invoices',
  settings: '/settings',
  reports: '/reports',
  users: '/users',
};

export const getDefaultModulePermissions = () => {
  return MODULE_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
};

export const normalizeModulePermissions = (permissions) => {
  const defaults = getDefaultModulePermissions();

  if (!permissions || typeof permissions !== 'object') {
    return defaults;
  }

  return MODULE_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Object.prototype.hasOwnProperty.call(permissions, key)
      ? Boolean(permissions[key])
      : defaults[key];
    return acc;
  }, {});
};

export const getFirstAccessibleModuleRoute = (permissions) => {
  const normalized = normalizeModulePermissions(permissions);

  for (const key of MODULE_PERMISSION_KEYS) {
    if (normalized[key]) {
      return MODULE_DEFAULT_ROUTES[key] || '/dashboard';
    }
  }

  return '/dashboard';
};
