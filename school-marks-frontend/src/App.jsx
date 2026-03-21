import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import LoginPage          from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminDashboard     from './pages/admin/AdminDashboard';
import ClassesPage        from './pages/admin/ClassesPage';
import TeachersPage       from './pages/admin/TeachersPage';
import StudentsPage       from './pages/admin/StudentsPage';
import ExamsPage          from './pages/admin/ExamsPage';
import AssignmentsPage    from './pages/admin/AssignmentsPage';
import ReportsPage        from './pages/ReportsPage';
import MarkEntryPage      from './pages/teacher/MarkEntryPage';
import TeacherAnalyticsPage from './pages/teacher/TeacherAnalyticsPage';

const Placeholder = ({ title }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
    <h2>{title}</h2>
    <p>Coming soon</p>
  </div>
);

function PrivateRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/teacher'} /> : <LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Admin routes */}
      <Route path="/admin"             element={<PrivateRoute role="ADMIN"><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/teachers"    element={<PrivateRoute role="ADMIN"><TeachersPage /></PrivateRoute>} />
      <Route path="/admin/students"    element={<PrivateRoute role="ADMIN"><StudentsPage /></PrivateRoute>} />
      <Route path="/admin/classes"     element={<PrivateRoute role="ADMIN"><ClassesPage /></PrivateRoute>} />
      <Route path="/admin/subjects"    element={<PrivateRoute role="ADMIN"><Placeholder title="Subjects (auto-seeded from CBC)" /></PrivateRoute>} />
      <Route path="/admin/exams"       element={<PrivateRoute role="ADMIN"><ExamsPage /></PrivateRoute>} />
      <Route path="/admin/assignments" element={<PrivateRoute role="ADMIN"><AssignmentsPage /></PrivateRoute>} />
      <Route path="/admin/reports"     element={<PrivateRoute role="ADMIN"><ReportsPage /></PrivateRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<PrivateRoute><TeacherDashboard /></PrivateRoute>} />
      <Route path="/teacher/marks"     element={<PrivateRoute><MarkEntryPage /></PrivateRoute>} />
      <Route path="/teacher/analytics" element={<PrivateRoute><TeacherAnalyticsPage /></PrivateRoute>} />
      <Route path="/teacher/reports"   element={<PrivateRoute><ReportsPage /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
