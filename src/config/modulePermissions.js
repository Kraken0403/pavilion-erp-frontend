export const MODULE_PERMISSION_KEYS = [
  'dashboard',
  'leads',
  'customers',
  'quotations',
  'work_orders',
  'kots',
  'deliveries',
  'invoices',
  'payment_reminders',
  'payments',
  'products',
  'vendors',
  'passbook',
  'reports',
  'users',
  'settings',
];

export const MODULE_PERMISSION_LABELS = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  customers: 'Customers',
  quotations: 'Quotations',
  work_orders: 'Work Orders',
  kots: 'KOT',
  deliveries: 'Delivery',
  invoices: 'Invoices',
  payment_reminders: 'Payment Reminders',
  payments: 'Payments',
  products: 'Products',
  vendors: 'Vendors',
  passbook: 'Passbook',
  reports: 'Reports',
  users: 'Users',
  settings: 'Settings',
};

export const MODULE_DEFAULT_ROUTES = {
  dashboard: '/dashboard',
  leads: '/leads',
  quotations: '/quotations',
  work_orders: '/workorders',
  kots: '/kots',
  deliveries: '/deliveries',
  invoices: '/invoices',
  payment_reminders: '/payment-reminders',
  payments: '/payments',
  products: '/products/list',
  vendors: '/vendors',
  passbook: '/passbook',
  reports: '/reports',
  users: '/users',
  settings: '/settings',
  customers: '/customers',
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
