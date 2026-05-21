import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
  useHistory,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import AddListing from './components/AddListing';
import EditListing from './components/EditListing';
import PropertyEngagement from './components/PropertyEngagement';
import AdminYad2Import from './components/AdminYad2Import';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import PropertyInquiryCard from './components/PropertyInquiryCard';
import InstantAlerts from './components/InstantAlerts';
import './index.css';

const PrivateRoute = ({ children, ...rest }) => {
  const { isAuthenticated } = useAuth();
  return (
    <Route
      {...rest}
      render={() => isAuthenticated ? children : <Redirect to="/login" />}
    />
  );
};

const ListingsWithAlertsOverlay = () => {
  const history = useHistory();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const hasAlertsOverlay = searchParams.get('alerts') === '1';

  React.useEffect(() => {
    if (!hasAlertsOverlay || isAuthenticated) return;
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('alerts');
    const nextSearch = nextParams.toString();
    history.replace({
      pathname: '/',
      search: nextSearch ? `?${nextSearch}` : '',
    });
  }, [hasAlertsOverlay, history, isAuthenticated, location.search]);

  const closeAlertsOverlay = () => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('alerts');
    const nextSearch = nextParams.toString();
    history.replace({
      pathname: '/',
      search: nextSearch ? `?${nextSearch}` : '',
    });
  };

  return (
    <>
      <PropertyList />
      {hasAlertsOverlay && isAuthenticated && (
        <InstantAlerts isOverlay onClose={closeAlertsOverlay} />
      )}
    </>
  );
};

const AppRoutes = () => {
  const location = useLocation();
  const isBlueprintRoute = location.pathname === '/blueprint-inquiry';

  return (
    <>
      {!isBlueprintRoute && <Navbar />}
      <main className="app-main" style={isBlueprintRoute ? { minHeight: '100vh' } : undefined}>
        <Switch>
          <Route exact path="/" component={ListingsWithAlertsOverlay} />
          <Route path="/properties/:id" component={PropertyDetail} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/blueprint-inquiry" component={PropertyInquiryCard} />
          <PrivateRoute path="/add-listing">
            <AddListing />
          </PrivateRoute>
          <PrivateRoute path="/edit-listing/:id">
            <EditListing />
          </PrivateRoute>
          <PrivateRoute path="/properties/:id/engagement">
            <PropertyEngagement />
          </PrivateRoute>
          <PrivateRoute path="/admin/import-yad2">
            <AdminYad2Import />
          </PrivateRoute>
          <PrivateRoute exact path="/alerts">
            <Redirect to="/?alerts=1" />
          </PrivateRoute>
          <Redirect to="/" />
        </Switch>
      </main>
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
