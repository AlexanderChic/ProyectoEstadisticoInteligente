import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

// Expiración de sesión por inactividad (RNF-06)
const INACTIVIDAD_MS = 20 * 60 * 1000; // 20 minutos sin actividad -> expira
const REFRESH_MS = 5 * 60 * 1000; // renueva el token como máximo cada 5 min de actividad

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  });
  const timerRef = useRef(null);
  const ultimoRefresh = useRef(0);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    ultimoRefresh.current = Date.now();
    setUsuario(data.usuario);
    return data.usuario;
  }

  // ----- Control de inactividad: expira la sesión tras 20 min sin uso -----
  useEffect(() => {
    if (!usuario) return;

    const expirarPorInactividad = () => {
      logout();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expirada=1';
      }
    };

    const reiniciar = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(expirarPorInactividad, INACTIVIDAD_MS);
      // Ventana deslizante: renueva el token mientras haya actividad
      const ahora = Date.now();
      if (ahora - ultimoRefresh.current > REFRESH_MS) {
        ultimoRefresh.current = ahora;
        api
          .get('/auth/refresh')
          .then(({ data }) => { if (data?.token) localStorage.setItem('token', data.token); })
          .catch(() => { /* si falla, el interceptor manejará el 401 */ });
      }
    };

    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    reiniciar(); // inicia el conteo

    return () => {
      clearTimeout(timerRef.current);
      eventos.forEach((e) => window.removeEventListener(e, reiniciar));
    };
  }, [usuario, logout]);

  const tieneRol = (...roles) => usuario && roles.includes(usuario.rol);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, tieneRol }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
