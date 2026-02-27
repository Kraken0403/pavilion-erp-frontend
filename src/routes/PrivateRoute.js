import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFirstAccessibleModuleRoute } from '../config/modulePermissions';

const PrivateRoute = ({ children, requiredModule }) => {
  const { isAuthenticated, loading, canAccessModule, modulePermissions } = useAuth();

  if (loading) return null; // or spinner

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredModule && !canAccessModule(requiredModule)) {
    return <Navigate to={getFirstAccessibleModuleRoute(modulePermissions)} replace />;
  }

  return children;
};

export default PrivateRoute;
