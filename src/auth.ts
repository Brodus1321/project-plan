export type Role = 'ADMIN' | 'VERIFIKATOR';

export interface User {
  username: string;
  nama: string;
  role: Role;
  password: string;
}

/**
 * Akun baku aplikasi PP Prelim. Admin mengisi pengajuan, Verifikator menyetujui
 * atau mengembalikan pengajuan untuk revisi sebelum berkas boleh dicetak.
 */
export const USERS: User[] = [
  {
    username: 'admin',
    nama: 'Admin Proyek',
    role: 'ADMIN',
    password: 'pas123',
  },
  {
    username: 'verifikator',
    nama: 'Verifikator Berkas',
    role: 'VERIFIKATOR',
    password: 'pass123',
  },
];

const SESSION_KEY = 'pp_session_v1';

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin Input',
  VERIFIKATOR: 'Verifikator',
};

export const ROLE_INISIAL: Record<Role, string> = {
  ADMIN: 'AD',
  VERIFIKATOR: 'VF',
};

export type SessionUser = Omit<User, 'password'>;

/** Coba masuk dengan username & password. Null bila kredensial salah. */
export function login(username: string, password: string): SessionUser | null {
  const found = USERS.find(
    u =>
      u.username.toLowerCase() === username.trim().toLowerCase() &&
      u.password === password
  );
  if (!found) return null;
  const session: SessionUser = {
    username: found.username,
    nama: found.nama,
    role: found.role,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** sesi aktif di perangkat ini, null bila belum login. */
export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.username || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
