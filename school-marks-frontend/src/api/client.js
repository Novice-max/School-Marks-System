import axios from 'axios';

const api = axios.create({
  baseURL: 'https://school-marks-system-production.up.railway.app/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 = token missing/expired/invalid (backend now answers 401, not 403) → back to login.
// 403 = logged in but not allowed → stays on the page; the caller shows the message.
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/logout');
    if (err.response?.status === 401 && !isAuthCall && sessionStorage.getItem('token')) {
      sessionStorage.clear();
      // Password reset by an admin while signed in → explain that instead of "session expired"
      const resetRequired = err.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED';
      sessionStorage.setItem('sessionExpired', resetRequired ? 'reset' : 'true');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──
export const login          = (data) => api.post('/auth/login', data);
export const changePassword = (data) => api.post('/auth/change-password', data);
export const refreshSession = ()     => api.post('/auth/refresh');
export const logoutSession  = (reason) => api.post('/auth/logout', { reason });

// ── Admin ──
export const getTeachers             = ()          => api.get('/admin/teachers');
export const createTeacher           = (data)      => api.post('/admin/teachers', data);
export const getClasses              = ()          => api.get('/admin/classes');
export const createClass             = (data)      => api.post('/admin/classes', data);
export const getStudents             = ()          => api.get('/admin/students');
export const getStudentsByClass      = (classId)   => api.get(`/admin/students/class/${classId}`);
export const createStudent           = (data)      => api.post('/admin/students', data);
export const getSubjects             = ()          => api.get('/admin/subjects');
export const getExams                = ()          => api.get('/admin/exams');
export const createExam              = (data)      => api.post('/admin/exams', data);
export const assignTeacher           = (data)      => api.post('/admin/assign', data);
export const getAssignmentsByTeacher = (tid)       => api.get(`/admin/assignments/teacher/${tid}`);
export const removeAssignment        = (id)        => api.delete(`/admin/assign/${id}`);
export const getAssignmentTerms      = ()          => api.get('/admin/assignments/terms');
// body: { fromYear, fromTerm, toYear, toTerm, dryRun }
export const copyAssignmentsToTerm   = (body)      => api.post('/admin/assignments/copy-term', body);

export const updateTeacher       = (id, data) => api.put(`/admin/teachers/${id}`, data);
export const updateStudent       = (id, data) => api.put(`/admin/students/${id}`, data);
export const deactivateStudent   = (id)       => api.post(`/admin/students/${id}/deactivate`);
export const activateStudent     = (id)       => api.post(`/admin/students/${id}/activate`);
export const updateClass         = (id, data) => api.put(`/admin/classes/${id}`, data);

// ── Analytics ──
export const getGradeDistribution = (examId)           => api.get(`/admin/analytics/grade-distribution/${examId}`);
export const getSubjectAverages   = (examId, classId)   => api.get(`/admin/analytics/subject-averages/${examId}/${classId}`);
export const getFullMarklist      = (examId)            => api.get(`/admin/analytics/marklist/${examId}`);
export const getClassTrend        = (classId)           => api.get(`/admin/analytics/class-trend/${classId}`);
export const getStudentHistory    = (studentId)         => api.get(`/admin/analytics/student/${studentId}`);

// ── Teacher ──
export const getMyAssignments    = ()                  => api.get('/teacher/assignments');
export const enterMark           = (data)              => api.post('/teacher/marks', data);
export const enterMarksBulk      = (data)              => api.post('/teacher/marks/bulk', data);
export const getTeacherStudents  = (classId)           => api.get(`/teacher/students/class/${classId}`);
export const getSubjectAnalytics = (examId, subjectId) => api.get(`/teacher/analytics/subject/${examId}/${subjectId}`);

// ── Reports ──
export const downloadMarklist  = (examId)             => api.get(`/reports/marklist/${examId}`, { responseType: 'blob' });
export const downloadMarksheet = (studentId, examId)  => api.get(`/reports/marksheet/${studentId}/${examId}`, { responseType: 'blob' });
export const downloadTermReport = (studentId, classId, term, academicYear) =>
  api.get(`/reports/termreport/${studentId}/${classId}/${term}/${academicYear}`, { responseType: 'blob' });

// ── Superadmin (Control Room) ──
export const getOverview         = ()            => api.get('/superadmin/overview');
export const getAuditLog         = (params)      => api.get('/superadmin/audit', { params });
export const getAuditActors      = ()            => api.get('/superadmin/audit/actors');
export const exportAuditLog      = (params)      => api.get('/superadmin/audit/export', { params, responseType: 'blob' });
export const getAdmins           = ()            => api.get('/superadmin/admins');
export const createAdmin         = (data)        => api.post('/superadmin/admins', data);
export const updateAdmin         = (id, data)    => api.put(`/superadmin/admins/${id}`, data);
export const setAdminActive      = (id, active)  => api.post(`/superadmin/admins/${id}/${active ? 'activate' : 'deactivate'}`);
export const resetAdminPassword  = (id)          => api.post(`/superadmin/admins/${id}/reset-password`);
export const getAllSubjects      = ()            => api.get('/superadmin/subjects');
export const createSubject       = (data)        => api.post('/superadmin/subjects', data);
export const renameSubject       = (id, data)    => api.put(`/superadmin/subjects/${id}`, data);
export const archiveSubject      = (id)          => api.post(`/superadmin/subjects/${id}/archive`);
export const restoreSubject      = (id)          => api.post(`/superadmin/subjects/${id}/restore`);

export default api;