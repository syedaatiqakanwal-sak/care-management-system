import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, AppShell, Text, Group, Anchor, Drawer, Burger, Box } from '@mantine/core'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { theme } from './theme'
import { LandingPage } from './components/LandingPage'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { DashboardView } from './components/DashboardView'
import { StaffProfilePage } from './components/StaffProfilePage'
import { TopHeader } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { CoursesPage } from './components/CoursesPage'
import { SettingsPage } from './components/SettingsPage'
import { ApiTokensPage } from './components/ApiTokensPage'
import { ForgotPasswordPage } from './components/ForgotPasswordPage'
import { PageWrapper } from './components/PageWrapper'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PoliciesPage } from './components/PoliciesPage'
import { PolicyReportsPage } from './components/PolicyReportsPage'
import { PoliciesManagePage } from './components/PoliciesManagePage'
import { PolicyAnalytics } from './components/PolicyAnalytics'
import { ReferenceSubmissionPage } from './components/ReferenceSubmissionPage'
import { ReferenceAnalyticsPage } from './components/ReferenceAnalyticsPage'
import { CertificatesStaffListPage } from './components/CertificatesStaffListPage'
import { StaffCertificatesViewPage } from './components/StaffCertificatesViewPage'
import { UserProfilePage } from './components/UserProfilePage'
import { useState, useEffect } from 'react'
import { Notifications } from '@mantine/notifications'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

// Global Safeguard CSS to force interactivity
const GlobalStyles = () => (
  <style>
    {`
      /* GLOBAL NUCLEAR FIX FOR INTERACTIVITY & VISIBILITY */
      html, body {
        pointer-events: auto !important;
        background-color: #F5F5F5 !important;
        overflow-y: auto !important;
        height: auto !important;
        min-height: 100% !important;
      }
      #root {
        pointer-events: auto !important;
        background-color: #F5F5F5 !important;
        min-height: 100% !important;
      }

      /* Modal & Drawer overlays */
      .mantine-Drawer-overlay.cpd-drawer-overlay,
      .cpd-drawer-overlay {
        backdrop-filter: blur(6px) !important;
        -webkit-backdrop-filter: blur(6px) !important;
        background: rgba(15, 23, 42, 0.35) !important;
        transition: opacity 220ms ease !important;
      }

      .cpd-mobile-drawer .mantine-Drawer-content {
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
        border-right: 1px solid rgba(0, 0, 0, 0.06);
        box-shadow: 8px 0 32px rgba(15, 23, 42, 0.12);
        transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1) !important;
      }

      .cpd-mobile-drawer .mantine-Drawer-body {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        height: 100% !important;
        padding: 0 !important;
        display: flex !important;
        flex-direction: column !important;
      }

      /* Force all interactive elements to be clickable, but don't disrupt layout */
      button, a, input, select, textarea, [role="button"], .mantine-UnstyledButton-root, .mantine-Button-root, .mantine-Tabs-tab {
        pointer-events: auto !important;
        cursor: pointer !important;
      }

      /* Ensure the main content is visible and interactive */
      main, .mantine-AppShell-main {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }

      :root {
        --ilc-primary: #1EBAF2;
        --ilc-secondary: #E51690;
        --ilc-neutral: #E2E1E8;
      }

      body {
        font-family: system-ui, -apple-system, sans-serif !important;
      }

      h1, h2, h3, .heading, .title, [class*="heading"], [class*="title"] {
        font-family: Roboto, sans-serif !important;
      }

      h4, h5, h6, .subheading, .card-title, [class*="subheading"] {
        font-family: Lato, sans-serif !important;
      }

      a {
        color: var(--ilc-primary);
      }

      a:hover {
        color: rgba(30, 186, 242, 0.7);
      }

      .mantine-AppShell-main {
        background-color: #F8FAFC;
      }

      .mantine-Button-root[data-variant="filled"] {
        background: #1EBAF2 !important;
        color: #fff !important;
      }

      .mantine-Button-root[data-variant="filled"]:hover {
        background: rgba(30, 186, 242, 0.7) !important;
      }

      .mantine-Button-root[data-variant="outline"] {
        color: #E51690 !important;
        border-color: #E51690 !important;
      }

      .mantine-Button-root[data-variant="outline"]:hover {
        background: rgba(229, 22, 144, 0.2) !important;
      }

      .mantine-Button-root[data-disabled="true"] {
        opacity: 0.35;
      }
    `}
  </style>
);

function AppLayoutInner({ children, searchQuery, onSearch }: { children: React.ReactNode, searchQuery?: string, onSearch?: (val: string) => void }) {
  const { collapsed, toggle } = useSidebar();
  const [mobileOpened, setMobileOpened] = useState(false);
  
  // Auto-close mobile drawer after 30 seconds of inactivity
  useEffect(() => {
    if (!mobileOpened) return;
    const timer = setTimeout(() => {
      setMobileOpened(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [mobileOpened]);
  
  return (
    <>
      <AppShell
        layout="alt"
        header={{ height: 76 }}
        navbar={{
          width: { base: 0, sm: collapsed ? 72 : 260 },
          breakpoint: 'sm',
          collapsed: { mobile: true },
        }}
        padding={{ base: 6, sm: 10 }}
        transitionDuration={200}
        styles={{
          header: {
            background: '#1EBAF2',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
            zIndex: 101,
          },
          navbar: {
            backgroundColor: '#ffffff',
            borderRight: '1px solid rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh',
            padding: 0,
            transition: 'width 200ms ease',
            zIndex: 102,
          },
        }}
      >
        <AppShell.Header>
          <TopHeader
            mobileOpened={mobileOpened}
            onToggleMobile={() => setMobileOpened(!mobileOpened)}
          />
        </AppShell.Header>

        <AppShell.Navbar hiddenFrom="sm">
          {/* Mobile navbar is hidden, we use Drawer instead */}
        </AppShell.Navbar>

        <AppShell.Navbar visibleFrom="sm">
          <Box style={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Sidebar />
          </Box>
        </AppShell.Navbar>

      <AppShell.Main
        style={{
          backgroundColor: '#F5F5F5',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
        }}
      >
        <Box style={{ flex: 1, width: '100%', minHeight: 0 }}>
          <PageWrapper>
            {children}
          </PageWrapper>
        </Box>
      </AppShell.Main>
      </AppShell>

      {/* Mobile Drawer */}
      <Drawer
        className="cpd-mobile-drawer"
        opened={mobileOpened}
        onClose={() => setMobileOpened(false)}
        withCloseButton={false}
        withOverlay
        closeOnEscape={false}
        closeOnClickOutside={false}
        padding={0}
        size={260}
        transitionProps={{ duration: 240, timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        overlayProps={{
          className: 'cpd-drawer-overlay',
          opacity: 1,
          backgroundOpacity: 0.35,
        }}
        aria-label="Navigation menu"
        styles={{
          header: { display: 'none' },
          body: {
            padding: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          },
          content: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
        }}
      >
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Sidebar />
        </Box>
      </Drawer>
    </>
  )
}

function AppLayout({ children, searchQuery, onSearch }: { children: React.ReactNode, searchQuery?: string, onSearch?: (val: string) => void }) {
  return (
    <AppLayoutInner searchQuery={searchQuery} onSearch={onSearch}>
      {children}
    </AppLayoutInner>
  )
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('role');
  if (role !== 'admin') {
    return <Navigate to="/dashboard/me" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  // Force interactivity on mount
  useEffect(() => {
    document.body.style.pointerEvents = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <GlobalStyles />
      <Notifications position="top-right" zIndex={2000} />
      <SidebarProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Public route for reference submission */}
          <Route path="/reference/submit/:token" element={<ReferenceSubmissionPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={
              <AdminRoute>
                <AppLayout searchQuery={searchQuery} onSearch={setSearchQuery}>
                  <DashboardView searchQuery={searchQuery} />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/staff/:id" element={
              <AdminRoute>
                <AppLayout searchQuery={searchQuery} onSearch={setSearchQuery}>
                  <StaffProfilePage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/certificates" element={
              <AdminRoute>
                <AppLayout searchQuery={searchQuery} onSearch={setSearchQuery}>
                  <CertificatesStaffListPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/certificates/staff/:id" element={
              <AdminRoute>
                <AppLayout searchQuery={searchQuery} onSearch={setSearchQuery}>
                  <StaffCertificatesViewPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/me" element={
              <AppLayout searchQuery={searchQuery} onSearch={setSearchQuery}>
                <StaffProfilePage />
              </AppLayout>
            } />

            <Route path="/dashboard/profile" element={
              <AppLayout>
                <UserProfilePage />
              </AppLayout>
            } />

            <Route path="/courses" element={
              <AppLayout>
                <CoursesPage />
              </AppLayout>
            } />

            <Route path="/dashboard/policies" element={
              <AppLayout>
                <PoliciesPage />
              </AppLayout>
            } />

            <Route path="/dashboard/policies/reports" element={
              <AdminRoute>
                <AppLayout>
                  <PolicyReportsPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/policies/manage" element={
              <AdminRoute>
                <AppLayout>
                  <PoliciesManagePage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/policies/analytics" element={
              <AdminRoute>
                <AppLayout>
                  <PolicyAnalytics />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/references/analytics" element={
              <AdminRoute>
                <AppLayout>
                  <ReferenceAnalyticsPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/settings" element={
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            } />

            <Route path="/settings/api-tokens" element={
              <AppLayout>
                <ApiTokensPage />
              </AppLayout>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </SidebarProvider>
    </MantineProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

