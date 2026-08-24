import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';

// Layouts
import { ClientLayout } from './layouts/ClientLayout.js';
import { AdminLayout } from './layouts/AdminLayout.js';
import { AuthLayout } from './layouts/AuthLayout.js';

// Client Pages
import { DashboardPage } from './pages/DashboardPage.js';
import { ContactsPage } from './pages/ContactsPage.js';
import { ListsPage } from './pages/ListsPage.js';
import { MessagesPage } from './pages/MessagesPage.js';
import { TemplatesPage } from './pages/TemplatesPage.js';
import { CampaignsPage } from './pages/CampaignsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { SubscriptionPage } from './pages/SubscriptionPage.js';
import { SupportPage } from './pages/SupportPage.js';
import { ProfilePage } from './pages/ProfilePage.js';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { AdminCompaniesPage } from './pages/admin/AdminCompaniesPage.js';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.js';
import { AdminPlansPage } from './pages/admin/AdminPlansPage.js';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage.js';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage.js';
import { AdminSupportPage } from './pages/admin/AdminSupportPage.js';
import { AdminCampaignsPage } from './pages/admin/AdminCampaignsPage.js';
import { AdminLogsPage } from './pages/admin/AdminLogsPage.js';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage.js';

const RouterView: React.FC = () => {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/dashboard';
  });

  const navigate = (to: string) => {
    if (to !== currentPath) {
      window.history.pushState({}, '', to);
      setCurrentPath(to);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Public / Auth routes
  if (currentPath === '/login' || currentPath === '/cadastro' || currentPath === '/admin/login' || (!isAuthenticated && !currentPath.startsWith('/admin'))) {
    const authMode = currentPath === '/cadastro' ? 'cadastro' : currentPath === '/admin/login' ? 'admin-login' : 'login';
    return <AuthLayout mode={authMode} navigate={navigate} />;
  }

  // Admin Routes
  if (currentPath.startsWith('/admin')) {
    if (!isAuthenticated) {
      return <AuthLayout mode="admin-login" navigate={navigate} />;
    }

    const renderAdminPage = () => {
      switch (currentPath) {
        case '/admin':
        case '/admin/dashboard':
          return <AdminDashboardPage navigate={navigate} />;
        case '/admin/clientes':
          return <AdminCompaniesPage navigate={navigate} />;
        case '/admin/usuarios':
          return <AdminUsersPage />;
        case '/admin/planos':
          return <AdminPlansPage />;
        case '/admin/assinaturas':
          return <AdminSubscriptionsPage />;
        case '/admin/pagamentos':
          return <AdminPaymentsPage />;
        case '/admin/suporte':
          return <AdminSupportPage />;
        case '/admin/campanhas':
          return <AdminCampaignsPage />;
        case '/admin/logs':
          return <AdminLogsPage />;
        case '/admin/configuracoes':
          return <AdminSettingsPage />;
        default:
          return <AdminDashboardPage navigate={navigate} />;
      }
    };

    return (
      <AdminLayout currentRoute={currentPath} navigate={navigate}>
        {renderAdminPage()}
      </AdminLayout>
    );
  }

  // Client Portal Routes
  const renderClientPage = () => {
    switch (currentPath) {
      case '/':
      case '/dashboard':
        return <DashboardPage navigate={navigate} />;
      case '/contatos':
        return <ContactsPage />;
      case '/listas':
        return <ListsPage navigate={navigate} />;
      case '/mensagens':
        return <MessagesPage navigate={navigate} />;
      case '/templates':
        return <TemplatesPage />;
      case '/campanhas':
        return <CampaignsPage />;
      case '/relatorios':
        return <ReportsPage />;
      case '/assinatura':
        return <SubscriptionPage />;
      case '/suporte':
        return <SupportPage />;
      case '/perfil':
        return <ProfilePage />;
      default:
        return <DashboardPage navigate={navigate} />;
    }
  };

  return (
    <ClientLayout currentRoute={currentPath} navigate={navigate}>
      {renderClientPage()}
    </ClientLayout>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterView />
      </AuthProvider>
    </ToastProvider>
  );
}
