import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

// Expiración de sesión por inactividad (RNF-06)
const INACTIVIDAD_MS = 20 * 60 * 1000; // 20 minutos sin actividad -> expira
const REFRESH_MS = 5 * 60 * 1000; // renueva el token como máximo cada 5 min de actividad
const CHECK_MS = 15 * 1000; // revisa la inactividad cada 15 segundos

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  });
  const ultimaActividad = useRef(Date.now());
  const ultimoRefresh = useRef(0);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('ultimaActividad');
    setUsuario(null);
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    const ahora = Date.now();
    ultimaActividad.current = ahora;
    ultimoRefresh.current = ahora;
    localStorage.setItem('ultimaActividad', String(ahora));
    setUsuario(data.usuario);
    return data.usuario;
  }

  /* ----- Control de inactividad (RNF-06) -----
     La MARCA de la última actividad se guarda en localStorage ('ultimaActividad').
     Un temporizador revisa cada 15 s: si pasaron más de 20 min desde esa marca,
     cierra la sesión. Este método (intervalo + marca de tiempo) es más confiable
     que un setTimeout largo, que los navegadores frenan en segundo plano. */
  useEffect(() => {
    if (!usuario) return;

    const registrarActividad = () => {
      const ahora = Date.now();
      ultimaActividad.current = ahora;
      // Renueva el token (ventana deslizante) como máximo cada 5 min de actividad
      if (ahora - ultimoRefresh.current > REFRESH_MS) {
        ultimoRefresh.current = ahora;
        localStorage.setItem('ultimaActividad', String(ahora));
        api
          .get('/auth/refresh')
          .then(({ data }) => { if (data?.token) localStorage.setItem('token', data.token); })
          .catch(() => { /* el interceptor manejará un 401 */ });
      }
    };

    // Marca inicial
    ultimaActividad.current = Date.now();
    localStorage.setItem('ultimaActividad', String(ultimaActividad.current));

    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventos.forEach((e) => window.addEventListener(e, registrarActividad, { passive: true }));

    const intervalo = setInterval(() => {
      // Persiste la marca actual (para poder inspeccionarla) y revisa la inactividad
      localStorage.setItem('ultimaActividad', String(ultimaActividad.current));
      if (Date.now() - ultimaActividad.current > INACTIVIDAD_MS) {
        logout();
        window.location.href = '/login?expirada=1';
      }
    }, CHECK_MS);

    return () => {
      clearInterval(intervalo);
      eventos.forEach((e) => window.removeEventListener(e, registrarActividad));
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
