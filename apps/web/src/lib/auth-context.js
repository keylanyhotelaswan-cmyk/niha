import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from './api-client.js';
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [accessToken, setAccessToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');
        const storedRoles = localStorage.getItem('roles');
        const storedPermissions = localStorage.getItem('permissions');
        if (storedToken && storedUser) {
            setAccessToken(storedToken);
            setUser(JSON.parse(storedUser));
            setRoles(storedRoles ? JSON.parse(storedRoles) : []);
            setPermissions(storedPermissions ? JSON.parse(storedPermissions) : []);
            // attempt to refresh profile from server to pick up permission changes
            (async () => {
                try {
                    const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${storedToken}` } });
                    if (res.ok) {
                        const body = await res.json();
                        setUser(body.user);
                        setRoles(body.roles ?? []);
                        setPermissions(body.permissions ?? []);
                        localStorage.setItem('user', JSON.stringify(body.user));
                        localStorage.setItem('roles', JSON.stringify(body.roles ?? []));
                        localStorage.setItem('permissions', JSON.stringify(body.permissions ?? []));
                    }
                    else {
                        setUser(JSON.parse(storedUser));
                        setRoles(storedRoles ? JSON.parse(storedRoles) : []);
                        setPermissions(storedPermissions ? JSON.parse(storedPermissions) : []);
                    }
                }
                catch (e) {
                    setUser(JSON.parse(storedUser));
                    setRoles(storedRoles ? JSON.parse(storedRoles) : []);
                    setPermissions(storedPermissions ? JSON.parse(storedPermissions) : []);
                }
            })();
        }
        setIsLoading(false);
    }, []);
    const login = async (credentials) => {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });
        if (!response.ok) {
            throw new Error('Login failed');
        }
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('roles', JSON.stringify(data.roles));
        localStorage.setItem('permissions', JSON.stringify(data.permissions));
        setAccessToken(data.accessToken);
        setUser(data.user);
        setRoles(data.roles);
        setPermissions(data.permissions);
    };
    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('roles');
        localStorage.removeItem('permissions');
        setAccessToken(null);
        setUser(null);
        setRoles([]);
        setPermissions([]);
    };
    return (_jsx(AuthContext.Provider, { value: {
            user,
            roles,
            permissions,
            accessToken,
            login,
            logout,
            isAuthenticated: !!accessToken,
            isLoading,
        }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
