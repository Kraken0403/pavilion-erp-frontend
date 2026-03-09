import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import EditLead from './pages/EditLead';
import NewLead from './pages/NewLead'; // Import NewLead page
import CreateQuotation from './components/CreateQuotation'; // Import CreateQuotation page
import Layout from './components/Layout';
import './assets/styles/global.scss';
import LeadSettings from './pages/LeadSettings';
import Users from './pages/Users';
import Workorders from './pages/Workorders';
import Quotations from './pages/Quotations';
// import AddOrderForm from './components/AddOrderForm';
import ProductDetail from './pages/ProductDetails';
// import WorkOrderDetail from './pages/workOrderDetails';
import QuotationSettings from './pages/QuotationSettings';
// import ProductList from './pages/ProductList';
import CategoriesPage from './pages/CategoriesPage';
import AttributesPage from './pages/AttributesPage';
import ProductPage from './pages/ProductPage';
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
import KOTBoard from './pages/KOTBoard';
import KOTSettings from './pages/KOTSettings';
import DeliveryBoard from './pages/DeliveryBoard';
import Reports from './pages/Reports';
import PaymentReminders from './pages/PaymentReminders';
import PaymentReminderSettings from './pages/PaymentReminderSettings';
import Payments from './pages/Payments';
import PaymentHistory from './pages/PaymentHistory';
import OrderFeedbacks from './pages/OrderFeedbacks';
import OrderFeedbackSettings from './pages/OrderFeedbackSettings';
import { getFirstAccessibleModuleRoute } from './config/modulePermissions';
import { NotificationProvider } from './context/NotificationContext';


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
                    <LegacyPathNormalizer />
                    <Routes>
                        <Route path="/" element={<HomeRoute />} />
                        <Route
                            path="/dashboard"
                            element={
                                <PrivateRoute requiredModule="dashboard">
                                    <Layout>
                                        <Dashboard />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/invoices"
                            element={
                                <PrivateRoute requiredModule="invoices">
                                    <Layout>
                                        <Invoices />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/invoices/:id"
                            element={
                                <PrivateRoute requiredModule="invoices">
                                    <Layout>
                                        <InvoiceView />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/invoices/create"
                            element={
                                <PrivateRoute requiredModule="invoices">
                                    <Layout>
                                        <CreateInvoice />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/invoice-settings"
                            element={
                                <PrivateRoute requiredModule="invoices">
                                    <Layout>
                                        <InvoiceSettings />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/payment-reminders"
                            element={
                                <PrivateRoute requiredModule="payment_reminders">
                                    <Layout>
                                        <PaymentReminders />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/payment-reminders/settings"
                            element={
                                <PrivateRoute requiredModule="payment_reminders">
                                    <Layout>
                                        <PaymentReminderSettings />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/payments"
                            element={
                                <PrivateRoute requiredModule="payments">
                                    <Layout>
                                        <Payments />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/payments/history"
                            element={
                                <PrivateRoute requiredModule="payments">
                                    <Layout>
                                        <PaymentHistory />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/leads"
                            element={
                                <PrivateRoute requiredModule="leads">
                                    <Layout>
                                        <Leads />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/leads/new"  // New route for creating a lead
                            element={
                                <PrivateRoute requiredModule="leads">
                                    <Layout>
                                        <NewLead />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/leads/:id/edit"
                            element={
                                <PrivateRoute requiredModule="leads">
                                    <Layout>
                                        <EditLead />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/quotation/create/:leadId"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="quotations">
                                    <Layout>
                                        <CreateQuotation />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/quotation-create"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="quotations">
                                    <Layout>
                                        <NewQuotation />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/leads/settings"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="leads">
                                    <Layout>
                                        <LeadSettings />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/users"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="users">
                                    <Layout>
                                        <Users />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/workorders"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="work_orders">
                                    <Layout>
                                        <Workorders />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/workorders/create"
                            element={
                                <PrivateRoute requiredModule="work_orders">
                                    <Layout>
                                        <CreateWorkOrder />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/workorders/:id"
                            element={
                                <PrivateRoute requiredModule="work_orders">
                                    <Layout>
                                        <WorkOrderDetail />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/kots"
                            element={
                                <PrivateRoute requiredModule="kots">
                                    <Layout>
                                        <KOTBoard />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/kots/settings"
                            element={
                                <PrivateRoute requiredModule="kots">
                                    <Layout>
                                        <KOTSettings />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/deliveries"
                            element={
                                <PrivateRoute requiredModule="deliveries">
                                    <Layout>
                                        <DeliveryBoard />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/products"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="products">
                                    <Layout>
                                        <ProductPage />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/settings"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="settings">
                                    <Layout>
                                        <Settings />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/reports"  // Reports module
                            element={
                                <PrivateRoute requiredModule="reports">
                                    <Layout>
                                        <Reports />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/feedbacks"
                            element={
                                <PrivateRoute requiredModule="reports">
                                    <Layout>
                                        <OrderFeedbacks />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/feedbacks/settings"
                            element={
                                <PrivateRoute requiredModule="reports">
                                    <Layout>
                                        <OrderFeedbackSettings />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/products/list"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="products">
                                    <Layout>
                                        <ProductPage />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/products/categories"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="products">
                                    <Layout>
                                        <CategoriesPage />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/products/attributes"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="products">
                                    <Layout>
                                        <AttributesPage />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/products/:id"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="products">
                                    <Layout>
                                        <ProductDetail />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/quotations"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="quotations">
                                    <Layout>
                                        <Quotations />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/quotations/:id"
                            element={
                                <PrivateRoute requiredModule="quotations">
                                    <Layout>
                                        <QuotationView />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        <Route path="/qoutations/*" element={<QuotationsTypoRedirect />} />
                        <Route path="/qoutation/*" element={<QuotationsTypoRedirect />} />
                        <Route
                            path="/quotations-settings"  // New route for creating a quotation
                            element={
                                <PrivateRoute requiredModule="quotations">
                                    <Layout>
                                        <QuotationSettings />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                    </Routes>
                </Router>
            </NotificationProvider>
        </AuthProvider>
    );
};

export default App;
