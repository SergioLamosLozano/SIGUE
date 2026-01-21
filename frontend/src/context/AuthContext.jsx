import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            
            if (token && storedUser) {
                setUser(JSON.parse(storedUser));
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    const login = async (id, password) => {
        try {
            const response = await axios.post('http://localhost:8000/api/users/auth/login/', {
                id,
                password
            });
            
            const { access, refresh, ...userData } = response.data;
            
            localStorage.setItem('token', access);
            localStorage.setItem('refreshToken', refresh);
            localStorage.setItem('user', JSON.stringify(userData));
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
            setUser(userData);
            return true;
        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const updateProfile = async (userData) => {
        try {
            const res = await axios.patch('http://localhost:8000/api/users/profile/', userData);
            // Update local user data but keep token
            const updatedUser = { ...user, ...res.data };
            // Password is not returned usually, or if it is we don't store plain text. 
            // The serializer returns: id, full_name, email, role, dependency.
            
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return true;
        } catch (error) {
            console.error("Update Profile Error:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
