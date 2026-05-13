import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect, useLocation } from 'react-router-dom';
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
import RealEstateInquiryBlueprint from './components/RealEstateInquiryBlueprint';
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

const AppRoutes = () => {
  const location = useLocation();
  const isBlueprintRoute = location.pathname === '/blueprint-inquiry';

  return (
    <>
      {!isBlueprintRoute && <Navbar />}
      <main className="app-main" style={isBlueprintRoute ? { minHeight: '100vh' } : undefined}>
        <Switch>
          <Route exact path="/" component={PropertyList} />
          <Route path="/properties/:id" component={PropertyDetail} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/blueprint-inquiry" component={RealEstateInquiryBlueprint} />
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
