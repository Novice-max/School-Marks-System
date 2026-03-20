import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──
export const login          = (data)            => api.post('/auth/login', data);
export const changePassword = (data)            => api.post('/auth/change-password', data);

// ── Admin ──
export const getTeachers    = ()                => api.get('/admin/teachers');
export const createTeacher  = (data)            => api.post('/admin/teachers', data);
export const getClasses     = ()                => api.get('/admin/classes');
export const createClass    = (data)            => api.post('/admin/classes', data);
export const getStudents    = ()                => api.get('/admin/students');
export const getStudentsByClass = (classId)     => api.get(`/admin/students/class/${classId}`);
export const createStudent  = (data)            => api.post('/admin/students', data);
export const getSubjects    = ()                => api.get('/admin/subjects');
export const createSubject  = (data)            => api.post('/admin/subjects', data);
export const getExams       = ()                => api.get('/admin/exams');
export const createExam     = (data)            => api.post('/admin/exams', data);
export const assignTeacher  = (data)            => api.post('/admin/assign', data);
export const getAssignmentsByTeacher = (tid)    => api.get(`/admin/assignments/teacher/${tid}`);
export const removeAssignment = (id)            => api.delete(`/admin/assign/${id}`);

// ── Analytics ──
export const getGradeDistribution = (examId)        => api.get(`/admin/analytics/grade-distribution/${examId}`);
export const getSubjectAverages   = (examId, classId)=> api.get(`/admin/analytics/subject-averages/${examId}/${classId}`);
export const getFullMarklist      = (examId)         => api.get(`/admin/analytics/marklist/${examId}`);
export const getClassTrend        = (classId)        => api.get(`/admin/analytics/class-trend/${classId}`);
export const getStudentHistory    = (studentId)      => api.get(`/admin/analytics/student/${studentId}`);

// ── Teacher ──
export const getMyAssignments   = ()                 => api.get('/teacher/assignments');
export const enterMark          = (data)             => api.post('/teacher/marks', data);
export const enterMarksBulk     = (data)             => api.post('/teacher/marks/bulk', data);
export const getTeacherStudents = (classId)          => api.get(`/teacher/students/class/${classId}`);
export const getSubjectAnalytics= (examId, subjectId)=> api.get(`/teacher/analytics/subject/${examId}/${subjectId}`);
export const getTeacherMarklist = (examId)           => api.get(`/teacher/marklist/${examId}`);

// ── Reports ──
export const downloadMarklist   = (examId)           => api.get(`/reports/marklist/${examId}`, { responseType: 'blob' });
export const downloadMarksheet  = (studentId, examId)=> api.get(`/reports/marksheet/${studentId}/${examId}`, { responseType: 'blob' });

export default api;
