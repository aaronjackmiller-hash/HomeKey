import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import AddListing from './components/AddListing';
import EditListing from './components/EditListing';
import AdminYad2Import from './components/AdminYad2Import';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
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

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main style={{ padding: '20px' }}>
          <Switch>
            <Route exact path="/" component={PropertyList} />
            <Route path="/properties/:id" component={PropertyDetail} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password" component={ResetPassword} />
            <PrivateRoute path="/add-listing">
              <AddListing />
            </PrivateRoute>
            <PrivateRoute path="/edit-listing/:id">
              <EditListing />
            </PrivateRoute>
            <PrivateRoute path="/admin/import-yad2">
              <AdminYad2Import />
            </PrivateRoute>
            <Redirect to="/" />
          </Switch>
        </main>
      </Router>
    </AuthProvider>
  );
};

export default App;
