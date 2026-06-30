import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { RouteHistoryProvider } from './context/RouteHistoryContext';
import { getFirstAccessibleModuleRoute } from './config/modulePermissions';
import { useSettings } from './context/SettingsContext';
import PrivateRoute from './routes/PrivateRoute';
import Layout from './components/Layout';
import Login from './components/Login';

import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import NewLead from './pages/NewLead';
import EditLead from './pages/EditLead';
import LeadSettings from './pages/LeadSettings';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Quotations from './pages/Quotations';
import QuotationView from './pages/QuotationView';
import NewQuotation from './pages/NewQuotation';
import CreateQuotation from './components/CreateQuotation';
import QuotationSettings from './pages/QuotationSettings';
import Workorders from './pages/Workorders';
import CreateWorkOrder from './pages/CreateWorkOrder';
import WorkOrderDetail from './pages/WorkOrderDetail';
import ProductPage from './pages/ProductPage';
import ProductDetail from './pages/ProductDetails';
import CategoriesPage from './pages/CategoriesPage';
import AttributesPage from './pages/AttributesPage';
import Coupons from './pages/Coupons';
import Invoices from './pages/Invoices';
import InvoiceView from './pages/InvoiceView';
import CreateInvoice from './pages/CreateInvoice';
import ProformaInvoices from './pages/ProformaInvoices';
import ProformaInvoiceView from './pages/ProformaInvoiceView';
import CreateProformaInvoice from './pages/CreateProformaInvoice';
import InvoiceSettings from './pages/InvoiceSettings';
import Payments from './pages/Payments';
import PaymentHistory from './pages/PaymentHistory';
import PaymentReminders from './pages/PaymentReminders';
import PaymentReminderSettings from './pages/PaymentReminderSettings';
import Reports from './pages/Reports';
import KOTBoard from './pages/KOTBoard';
import KOTSettings from './pages/KOTSettings';
import DeliveryBoard from './pages/DeliveryBoard';
import OrderFeedbacks from './pages/OrderFeedbacks';
import OrderFeedbackSettings from './pages/OrderFeedbackSettings';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Vendors from './pages/Vendors';
import Passbook from './pages/Passbook';

import 'react-quill/dist/quill.snow.css';
import './assets/styles/global.scss';

const HomeRoute = () => {
  const { currentUser, modulePermissions } = useAuth();
  return currentUser
    ? <Navigate to={getFirstAccessibleModuleRoute(modulePermissions)} replace />
    : <Login />;
};

const QuotationsTypoRedirect = () => {
  const location = useLocation();
  const normalizedPath = location.pathname
    .replace(/^\/qoutations(\/|$)/, '/quotations$1')
    .replace(/^\/qoutation(\/|$)/, '/quotation$1');

  return <Navigate to={`${normalizedPath}${location.search}${location.hash}`} replace />;
};

const LegacyPathNormalizer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const { pathname, search, hash } = location;
    let normalizedPath = pathname;

    normalizedPath = normalizedPath.replace(/^\/qoutations(\/|$)/, '/quotations$1');
    normalizedPath = normalizedPath.replace(/^\/qoutation(\/|$)/, '/quotation$1');

    if (normalizedPath !== pathname) {
      navigate(`${normalizedPath}${search}${hash}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
};

const Protected = ({ requiredModule, children }) => (
  <PrivateRoute requiredModule={requiredModule}>{children}</PrivateRoute>
);

const CateringProtected = ({ requiredModule, children }) => {
  const { settings } = useSettings() || {};
  const businessType = String(settings?.business_type || 'GENERAL').toUpperCase();
  if (businessType !== 'CATERING' && businessType !== 'HYBRID') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Protected requiredModule={requiredModule}>{children}</Protected>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomeRoute />} />
    <Route element={<Layout />}>
      <Route path="/dashboard" element={<Protected requiredModule="dashboard"><Dashboard /></Protected>} />

      <Route path="/leads" element={<Protected requiredModule="leads"><Leads /></Protected>} />
      <Route path="/leads/new" element={<Protected requiredModule="leads"><NewLead /></Protected>} />
      <Route path="/leads/:id/edit" element={<Protected requiredModule="leads"><EditLead /></Protected>} />
      <Route path="/leads/settings" element={<Protected requiredModule="leads"><LeadSettings /></Protected>} />

      <Route path="/customers" element={<Protected requiredModule="customers"><Customers /></Protected>} />
      <Route path="/customers/:id" element={<Protected requiredModule="customers"><CustomerDetail /></Protected>} />

      <Route path="/quotation-create" element={<Protected requiredModule="quotations"><NewQuotation /></Protected>} />
      <Route path="/quotation/create/:leadId" element={<Protected requiredModule="quotations"><CreateQuotation /></Protected>} />
      <Route path="/quotations" element={<Protected requiredModule="quotations"><Quotations /></Protected>} />
      <Route path="/quotations/:id" element={<Protected requiredModule="quotations"><QuotationView /></Protected>} />
      <Route path="/quotations-settings" element={<Protected requiredModule="quotations"><QuotationSettings /></Protected>} />

      <Route path="/proforma-invoices" element={<Protected requiredModule="invoices"><ProformaInvoices /></Protected>} />
      <Route path="/proforma-invoices/create" element={<Protected requiredModule="invoices"><CreateProformaInvoice /></Protected>} />
      <Route path="/proforma-invoices/:id" element={<Protected requiredModule="invoices"><ProformaInvoiceView /></Protected>} />
      <Route path="/invoices" element={<Protected requiredModule="invoices"><Invoices /></Protected>} />
      <Route path="/invoices/create" element={<Protected requiredModule="invoices"><CreateInvoice /></Protected>} />
      <Route path="/invoices/:id" element={<Protected requiredModule="invoices"><InvoiceView /></Protected>} />
      <Route path="/invoice-settings" element={<Protected requiredModule="invoices"><InvoiceSettings /></Protected>} />

      <Route path="/payments" element={<Protected requiredModule="payments"><Payments /></Protected>} />
      <Route path="/payments/history" element={<Protected requiredModule="payments"><PaymentHistory /></Protected>} />
      <Route path="/payment-history" element={<Navigate to="/payments/history" replace />} />

      <Route path="/payment-reminders" element={<Protected requiredModule="payment_reminders"><PaymentReminders /></Protected>} />
      <Route path="/payment-reminders/settings" element={<Protected requiredModule="payment_reminders"><PaymentReminderSettings /></Protected>} />

      <Route path="/reports" element={<Protected requiredModule="reports"><Reports /></Protected>} />

      <Route path="/workorders" element={<Protected requiredModule="work_orders"><Workorders /></Protected>} />
      <Route path="/workorders/create" element={<Protected requiredModule="work_orders"><CreateWorkOrder /></Protected>} />
      <Route path="/workorders/:id" element={<Protected requiredModule="work_orders"><WorkOrderDetail /></Protected>} />

      <Route path="/products" element={<Navigate to="/products/list" replace />} />
      <Route path="/products/list" element={<Protected requiredModule="products"><ProductPage /></Protected>} />
      <Route path="/products/categories" element={<Protected requiredModule="products"><CategoriesPage /></Protected>} />
      <Route path="/products/attributes" element={<Protected requiredModule="products"><AttributesPage /></Protected>} />
      <Route path="/vendors" element={<Protected requiredModule="vendors"><Vendors /></Protected>} />
      <Route path="/passbook" element={<Protected requiredModule="passbook"><Passbook /></Protected>} />
      <Route path="/products/:id" element={<Protected requiredModule="products"><ProductDetail /></Protected>} />
      <Route path="/categories" element={<Navigate to="/products/categories" replace />} />
      <Route path="/attributes" element={<Navigate to="/products/attributes" replace />} />

      <Route path="/kots" element={<CateringProtected requiredModule="kots"><KOTBoard /></CateringProtected>} />
      <Route path="/kots/settings" element={<CateringProtected requiredModule="kots"><KOTSettings /></CateringProtected>} />
      <Route path="/deliveries" element={<CateringProtected requiredModule="deliveries"><DeliveryBoard /></CateringProtected>} />
      <Route path="/order-feedbacks" element={<CateringProtected requiredModule="reports"><OrderFeedbacks /></CateringProtected>} />
      <Route path="/order-feedbacks/settings" element={<CateringProtected requiredModule="reports"><OrderFeedbackSettings /></CateringProtected>} />
      <Route path="/feedbacks" element={<Navigate to="/order-feedbacks" replace />} />
      <Route path="/feedbacks/settings" element={<Navigate to="/order-feedbacks/settings" replace />} />

      <Route path="/coupons" element={<CateringProtected requiredModule="settings"><Coupons /></CateringProtected>} />
      <Route path="/users" element={<Protected requiredModule="users"><Users /></Protected>} />
      <Route path="/settings" element={<Protected requiredModule="settings"><Settings /></Protected>} />
    </Route>

    <Route path="/qoutations/*" element={<QuotationsTypoRedirect />} />
    <Route path="/qoutation/*" element={<QuotationsTypoRedirect />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <RouteHistoryProvider>
            <LegacyPathNormalizer />
            <AppRoutes />
          </RouteHistoryProvider>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
