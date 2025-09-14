import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const Header = ({ user }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        toast.success('Logged out successfully!');
        navigate('/login');
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <FileText className="h-8 w-8 text-[#8e71f8]" />
                        <span className="text-xl font-bold text-gray-800">PDF-AI</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-600 hidden sm:block">
                            Welcome, {user?.name}
                        </span>
                        <button 
                            onClick={handleLogout} 
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition" 
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;