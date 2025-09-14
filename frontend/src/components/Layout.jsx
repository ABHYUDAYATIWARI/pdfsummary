import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header';
import { getUser } from '../services/api';

const Layout = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data } = await getUser();
                setUser(data);
            } catch (error) {
                console.error('Failed to fetch user', error);
                navigate('/login');
            }
        };
        fetchUser();
    }, [navigate]);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen ">
            <Header user={user} />
            <main className="p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;