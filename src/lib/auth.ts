/**
 * PrepBite Client-Side Auth Utility
 * 
 * Manages user registration, login, and session via localStorage.
 * Passwords are hashed with SHA-256 via Web Crypto API.
 * Supports "Remember Me" (localStorage vs sessionStorage).
 */

export interface PrepBiteUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  gender: 'male' | 'female' | 'other';
  createdAt: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: PrepBiteUser;
}

const USERS_KEY = 'prepbite-users';
const SESSION_KEY = 'prepbite-session';

// ── Hashing ──

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'prepbite-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── User Storage ──

export function getUsers(): PrepBiteUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getUserByEmail(email: string): PrepBiteUser | undefined {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
}

function saveUsers(users: PrepBiteUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ── Registration ──

export async function registerUser(
  username: string,
  email: string,
  password: string,
  gender: 'male' | 'female' | 'other',
  isOAuth: boolean = false
): Promise<AuthResult> {
  const users = getUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.trim();

  // Validate
  if (normalizedUsername.length < 2) return { success: false, error: 'Username must be at least 2 characters.' };
  if (normalizedUsername.length > 30) return { success: false, error: 'Username must be 30 characters or less.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { success: false, error: 'Please enter a valid email address.' };
  if (!isOAuth && password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };

  // Check uniqueness
  if (users.some(u => u.username.toLowerCase() === normalizedUsername.toLowerCase())) {
    return { success: false, error: 'Username already exists.' };
  }
  if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    return { success: false, error: 'Email already in use.' };
  }

  const passwordHash = await hashPassword(password);
  const newUser: PrepBiteUser = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
    gender,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  return { success: true, user: newUser };
}

// ── Login ──

export async function loginUser(
  identifier: string,  // email OR username
  password: string,
  rememberMe: boolean = false
): Promise<AuthResult> {
  const users = getUsers();
  const normalizedId = identifier.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const user = users.find(u =>
    (u.email.toLowerCase() === normalizedId || u.username.toLowerCase() === normalizedId) &&
    u.passwordHash === passwordHash
  );

  if (!user) {
    return { success: false, error: 'Invalid email/username or password.' };
  }

  // Store session
  const sessionData = JSON.stringify({
    userId: user.id,
    username: user.username,
    email: user.email,
    gender: user.gender,
  });

  if (rememberMe) {
    localStorage.setItem(SESSION_KEY, sessionData);
  } else {
    sessionStorage.setItem(SESSION_KEY, sessionData);
  }
  // Also set a flag so we can detect the session type
  localStorage.setItem('prepbite-remember-me', rememberMe ? 'true' : 'false');

  return { success: true, user };
}

// ── Session Management ──

export interface SessionData {
  userId: string;
  username: string;
  email: string;
  gender: 'male' | 'female' | 'other';
}

export function getSession(): SessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    // Check localStorage first (remember me), then sessionStorage
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('prepbite-remember-me');
}

export function deleteAccount() {
  const session = getSession();
  if (session) {
    // Remove user from users list
    const users = getUsers();
    const filtered = users.filter(u => u.id !== session.userId);
    saveUsers(filtered);
  }
  // Clear all PrepBite data
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('prepbite-')) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem(SESSION_KEY);
}
