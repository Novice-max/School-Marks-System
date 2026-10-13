// Role helpers — one place for "where does this user belong?"

export const isSuperAdmin = (user) => user?.role === 'SUPERADMIN';
export const isAdminLike  = (user) => user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

export function homeFor(role) {
  if (role === 'SUPERADMIN') return '/superadmin';
  if (role === 'ADMIN')      return '/admin';
  return '/teacher';
}
