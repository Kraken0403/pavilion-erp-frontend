import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import EditLead from './pages/EditLead';
import NewLead from './pages/NewLead'; // Import NewLead page
import Customers from './pages/Customers';
import CreateQuotation from './components/CreateQuotation'; // Import CreateQuotation page
import Layout from './components/Layout';
import './assets/styles/global.scss';
import LeadSettings from './pages/LeadSettings';
import Users from './pages/Users';
import Workorders from './pages/Workorders';
import Quotations from './pages/Quotations';
// import AddOrderForm from './components/AddOrderForm';
// import WorkOrderDetail from './pages/workOrderDetails';
import QuotationSettings from './pages/QuotationSettings';
// import ProductList from './pages/ProductList';
import ProductPage from './pages/ProductPage';
import CategoriesPage from './pages/CategoriesPage';
import AttributesPage from './pages/AttributesPage';
import NewQuotation from './pages/NewQuotation';
import QuotationView from './pages/QuotationView';
import WorkOrderDetail from './pages/WorkOrderDetail';
import CreateWorkOrder from './pages/CreateWorkOrder';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import InvoiceView from './pages/InvoiceView';
import InvoiceSettings from './pages/InvoiceSettings';
import 'react-quill/dist/quill.snow.css'
import CreateInvoice from './pages/CreateInvoice';
import ProformaInvoices from './pages/ProformaInvoices';
import ProformaInvoiceView from './pages/ProformaInvoiceView';
import CreateProformaInvoice from './pages/CreateProformaInvoice';
import KOTBoard from './pages/KOTBoard';
import KOTSettings from './pages/KOTSettings';
import DeliveryBoard from './pages/DeliveryBoard';
import CouponsPage from './pages/Coupons';
import Reports from './pages/Reports';
import PaymentReminders from './pages/PaymentReminders';
import PaymentReminderSettings from './pages/PaymentReminderSettings';
import Payments from './pages/Payments';
import PaymentHistory from './pages/PaymentHistory';
import OrderFeedbacks from './pages/OrderFeedbacks';
import OrderFeedbackSettings from './pages/OrderFeedbackSettings';
import { getFirstAccessibleModuleRoute } from './config/modulePermissions';
import { NotificationProvider } from './context/NotificationContext';
import { RouteHistoryProvider } from './context/RouteHistoryContext';


const HomeRoute = () => {
    const { currentUser, modulePermissions } = useAuth();
    return currentUser
        ? <Navigate to={getFirstAccessibleModuleRoute(modulePermissions)} />
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

const App = () => {
    console.log("🚀 App rendered");
    return (
        <AuthProvider>
            <NotificationProvider>
                <Router>
                    <RouteHistoryProvider>
                        <LegacyPathNormalizer />
                        <Routes>
                            <Route path="/" element={<HomeRoute />} />
                            <Route element={<Layout />}>
                                <Route
                                    path="/dashboard"
                                    element={
                                        <PrivateRoute requiredModule="dashboard">
                                            <Dashboard />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/invoices"
                                    element={
                                        <PrivateRoute requiredModule="invoices">
                                            <Invoices />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/invoices/:id"
                                    element={
                                        <PrivateRoute requiredModule="invoices">
                                            <InvoiceView />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/invoices/create"
                                    element={
                                        <PrivateRoute requiredModule="invoices">
                                            <CreateInvoice />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/proforma-invoices"
                                    element={
                                        <PrivateRoute requiredModule="invoices">
                                            <ProformaInvoices />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/proforma-invoices/:id"
                                    element={
                                        <PrivateRoute requiredModule="invoices">
                                            <ProformaInvoiceView />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/proforma-invoices/create"
                                    element={
                                        <PrivateRoute requiredModule="invoices">
                                            <CreateProformaInvoice />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/invoice-settings"
                                    element={
                                        <PrivateRoute requiredModule="invoices">
                                            <InvoiceSettings />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/payment-reminders"
                                    element={
                                        <PrivateRoute requiredModule="payment_reminders">
                                            <PaymentReminders />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/payment-reminders/settings"
                                    element={
                                        <PrivateRoute requiredModule="payment_reminders">
                                            <PaymentReminderSettings />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/payments"
                                    element={
                                        <PrivateRoute requiredModule="payments">
                                            <Payments />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/payments/history"
                                    element={
                                        <PrivateRoute requiredModule="payments">
                                            <PaymentHistory />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/leads"
                                    element={
                                        <PrivateRoute requiredModule="leads">
                                            <Leads />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/customers"
                                    element={
                                        <PrivateRoute requiredModule="customers">
                                            <Customers />
                                        </PrivateRoute>
                                    }
                                />
                                
                                <Route
                                    path="/leads/new"  // New route for creating a lead
                                    element={
                                        <PrivateRoute requiredModule="leads">
                                            <NewLead />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/leads/:id/edit"
                                    element={
                                        <PrivateRoute requiredModule="leads">
                                            <EditLead />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/quotation/create/:leadId"  // New route for creating a quotation
                                    element={
                                        <PrivateRoute requiredModule="quotations">
                                            <CreateQuotation />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/quotation-create"  // New route for creating a quotation
                                    element={
                                        <PrivateRoute requiredModule="quotations">
                                            <NewQuotation />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/leads/settings"  // New route for creating a quotation
                                    element={
                                        <PrivateRoute requiredModule="leads">
                                            <LeadSettings />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/users"  // New route for creating a quotation
                                    element={
                                        <PrivateRoute requiredModule="users">
                                            <Users />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/workorders"  // New route for creating a quotation
                                    element={
                                        <PrivateRoute requiredModule="work_orders">
                                            <Workorders />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/workorders/create"
                                    element={
                                        <PrivateRoute requiredModule="work_orders">
                                            <CreateWorkOrder />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/workorders/:id"
                                    element={
                                        <PrivateRoute requiredModule="work_orders">
                                            <WorkOrderDetail />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/kots"
                                    element={
                                        <PrivateRoute requiredModule="kots">
                                            <KOTBoard />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/kots/settings"
                                    element={
                                        <PrivateRoute requiredModule="kots">
                                            <KOTSettings />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/deliveries"
                                    element={
                                        <PrivateRoute requiredModule="deliveries">
                                            <DeliveryBoard />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/settings"  // New route for creating a quotation
                                    element={
                                        <PrivateRoute requiredModule="settings">
                                            <Settings />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/coupons"
                                    element={
                                        <PrivateRoute requiredModule="settings">
                                            <CouponsPage />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/reports"  // Reports module
                                    element={
                                        <PrivateRoute requiredModule="reports">
                                            <Reports />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/feedbacks"
                                    element={
                                        <PrivateRoute requiredModule="reports">
                                            <OrderFeedbacks />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/feedbacks/settings"
                                    element={
                                        <PrivateRoute requiredModule="reports">
                                            <OrderFeedbackSettings />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/quotations"  // New route for creating a quotation
                                    element={
                                        <PrivateRoute requiredModule="quotations">
                                            <Quotations />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/quotations/:id"
                                    element={
                                        <PrivateRoute requiredModule="quotations">
                                            <QuotationView />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/quotations-settings"  // New route for creating a quotation
                                    element={
                                        <PrivateRoute requiredModule="quotations">
                                            <QuotationSettings />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/products/list"
                                    element={
                                        <PrivateRoute requiredModule="products">
                                            <ProductPage />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/categories"
                                    element={
                                        <PrivateRoute requiredModule="products">
                                            <CategoriesPage />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/attributes"
                                    element={
                                        <PrivateRoute requiredModule="products">
                                            <AttributesPage />
                                        </PrivateRoute>
                                    }
                                />
                            </Route>

                            <Route path="/qoutations/*" element={<QuotationsTypoRedirect />} />
                            <Route path="/qoutation/*" element={<QuotationsTypoRedirect />} />

                        </Routes>
                    </RouteHistoryProvider>
                </Router>
            </NotificationProvider>
        </AuthProvider>
    );
};

export default App;
