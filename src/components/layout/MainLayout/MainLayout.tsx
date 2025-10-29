import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, message, Spin, theme } from 'antd';
import Sidebar from "../../ui/Sidebar/Sidebar";
import Cookies from 'js-cookie';
import axios from 'axios';
import { Content } from 'antd/es/layout/layout';

export default function MainLayout() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    const AUTH_API_URL = 'http://localhost:8081/api/users/auth'; 
    const [collapsed, setCollapsed] = useState(false);
    const siderWidth = 125;
    const siderCollapsedWidth = 40;

    useEffect(() => {
        const checkAuth = async () => {
            const token = Cookies.get('authToken');

            if (!token) {
                console.log("No token found. Redirecting to /auth.");
                setIsLoading(false);
                navigate('/auth'); 
                return;
            }

            try {
                const response = await axios.get(AUTH_API_URL, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const { isAuthenticated, role } = response.data; 
                

                if (isAuthenticated || role === 'admin') {
                    setIsAuthenticated(true);
                } else {
                    message.error('Bạn không có quyền truy cập vào trang này.');
                    Cookies.remove('authToken');
                    navigate('/auth');
                }

            } catch (error) {
                console.error("Token verification failed:", error);
                message.error('Bạn không có quyền truy cập vào trang này.');
                Cookies.remove('authToken');
                navigate('/auth');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [navigate]);

    if (isLoading) {
        return (
            <Layout className="min-h-screen flex items-center justify-center">
                <Spin size="large"/>
            </Layout>
        );
    }
    
    if (!isAuthenticated) {
        return null;
    }

    return (
        <Layout style={{
            marginLeft: collapsed ? siderCollapsedWidth : siderWidth,
            transition: 'margin-left 0.2s ease-in-out',
        }}>
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed}/> 
            <Layout 
                style={{
                    marginLeft: collapsed ? siderCollapsedWidth : siderWidth,
                    transition: 'margin-left 0.2s ease-in-out',
                }}
            >
                <Content 
                    className="p-6 bg-gray-50" 
                    style={{ minHeight: '100vh' }}
                >
                    <div className="bg-white rounded-xl shadow-md min-h-full" style={{padding:'36px'}}>
                        <Outlet/>
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}