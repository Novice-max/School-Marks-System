import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { homeFor } from './utils/roles';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import SessionWarning from './components/SessionWarning';
import SuperLayout from './components/SuperLayout';
import TeacherDashboard     from './pages/teacher/TeacherDashboard';
import LoginPage            from './pages/LoginPage';
import ChangePasswordPage   from './pages/ChangePasswordPage';
import AdminDashboard       from './pages/admin/AdminDashboard';
import ClassesPage          from './pages/admin/ClassesPage';
import TeachersPage         from './pages/admin/TeachersPage';
import StudentsPage         from './pages/admin/StudentsPage';
import ExamsPage            from './pages/admin/ExamsPage';
import AssignmentsPage      from './pages/admin/AssignmentsPage';
import ReportsPage          from './pages/ReportsPage';
import MarkEntryPage        from './pages/teacher/MarkEntryPage';
import TeacherAnalyticsPage from './pages/teacher/TeacherAnalyticsPage';
import SettingsPage         from './pages/SettingsPage';
import ControlRoom          from './pages/superadmin/ControlRoom';
import ActivityLog          from './pages/superadmin/ActivityLog';
import AdminsPage           from './pages/superadmin/AdminsPage';
import SubjectsManager      from './pages/superadmin/SubjectsManager';

const ADMIN_ROLES   = ['ADMIN', 'SUPERADMIN'];   // superadmin can do everything an admin can
const TEACHER_ROLES = ['TEACHER'];
const SUPER_ROLES   = ['SUPERADMIN'];
const ANY_ROLE      = ['TEACHER', 'ADMIN', 'SUPERADMIN'];

/**
 * roles: who may open this page. Anyone else is sent to their own home.
 * shell: which layout wraps it ('school' = sidebar layout, 'super' = Control Room).
 */
function PrivateRoute({ children, roles = ANY_ROLE, shell = 'school' }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.isFirstLogin) return <Navigate to="/change-password" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return shell === 'super' ? <SuperLayout>{children}</SuperLayout> : <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  useEffect(() => {
    const ping = () =>
      fetch('https://school-marks-system-production.up.railway.app/actuator/health')
        .catch(() => {});
    ping();
    const interval = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <LoginPage />} />
      <Route path="/change-password" element={user ? <ChangePasswordPage /> : <Navigate to="/login" replace />} />

      {/* ── Control Room (superadmin only, own layout) ── */}
      <Route path="/superadmin"          element={<PrivateRoute roles={SUPER_ROLES} shell="super"><ControlRoom /></PrivateRoute>} />
      <Route path="/superadmin/activity" element={<PrivateRoute roles={SUPER_ROLES} shell="super"><ActivityLog /></PrivateRoute>} />
      <Route path="/superadmin/admins"   element={<PrivateRoute roles={SUPER_ROLES} shell="super"><AdminsPage /></PrivateRoute>} />
      <Route path="/superadmin/subjects" element={<PrivateRoute roles={SUPER_ROLES} shell="super"><SubjectsManager /></PrivateRoute>} />

      {/* ── School admin ── */}
      <Route path="/admin"             element={<PrivateRoute roles={ADMIN_ROLES}><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/teachers"    element={<PrivateRoute roles={ADMIN_ROLES}><TeachersPage /></PrivateRoute>} />
      <Route path="/admin/students"    element={<PrivateRoute roles={ADMIN_ROLES}><StudentsPage /></PrivateRoute>} />
      <Route path="/admin/classes"     element={<PrivateRoute roles={ADMIN_ROLES}><ClassesPage /></PrivateRoute>} />
      <Route path="/admin/exams"       element={<PrivateRoute roles={ADMIN_ROLES}><ExamsPage /></PrivateRoute>} />
      <Route path="/admin/assignments" element={<PrivateRoute roles={ADMIN_ROLES}><AssignmentsPage /></PrivateRoute>} />
      <Route path="/admin/reports"     element={<PrivateRoute roles={ADMIN_ROLES}><ReportsPage /></PrivateRoute>} />
      {/* Old bookmark → subjects now live in the Control Room */}
      <Route path="/admin/subjects"    element={<Navigate to={user?.role === 'SUPERADMIN' ? '/superadmin/subjects' : '/admin'} replace />} />

      {/* ── Teacher (no Reports page — downloads are admin-only) ── */}
      <Route path="/teacher"           element={<PrivateRoute roles={TEACHER_ROLES}><TeacherDashboard /></PrivateRoute>} />
      <Route path="/teacher/marks"     element={<PrivateRoute roles={TEACHER_ROLES}><MarkEntryPage /></PrivateRoute>} />
      <Route path="/teacher/analytics" element={<PrivateRoute roles={TEACHER_ROLES}><TeacherAnalyticsPage /></PrivateRoute>} />
      <Route path="/teacher/reports"   element={<Navigate to="/teacher" replace />} />

      <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Toaster position="top-right" />
            <SessionWarning />
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
