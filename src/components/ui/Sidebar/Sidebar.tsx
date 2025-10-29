import { useState, type CSSProperties } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
    AimOutlined,
    DashboardOutlined,
    FileSearchOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ThunderboltOutlined,
    TrophyOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ItemType } from 'antd/es/menu/interface';
import Cookies from 'js-cookie';

const { Sider } = Layout;

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

interface CustomMenuItem extends Omit<ItemType, 'children'> {
    key: string;
    icon?: React.ReactNode;
    label: string;
    link?: string;
    children?: CustomMenuItem[];
    type?: string;
    className?: string;
}

const logoutItem: CustomMenuItem = {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Đăng xuất',
    className: 'mt-4',
};

const menuItemsAdmin: CustomMenuItem[] = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', link: '/admin/dashboard' },
    { key: 'admin_title', label: 'CHỨC NĂNG QUẢN TRỊ', type: 'group' },
    {
        key: 'content_management',
        icon: <FileSearchOutlined />,
        label: 'Quản lý Nội dung',
        children: [
            { key: 'topics_admin', label: 'Chủ đề (Topics)', link: '/admin/topics' },
            { key: 'quests_admin', label: 'Quest (Màn chơi)', link: '/admin/quests' },
            { key: 'questions_admin', label: 'Ngân hàng Câu hỏi', link: '/admin/questions' },
        ],
    },
    {
        key: 'user_management',
        icon: <UserOutlined />,
        label: 'Quản lý Người dùng',
        children: [
            { key: 'users_list', label: 'Danh sách Tài khoản', link: '/admin/users' },
            { key: 'progress_admin', label: 'Tiến độ & XP', link: '/admin/progress' },
        ],
    },
    {
        key: 'gamification_management',
        icon: <TrophyOutlined />,
        label: 'Quản lý Thành tích',
        children: [
            { key: 'badges_admin', label: 'Huy hiệu (Badges)', link: '/admin/badges' },
            { key: 'ratings_admin', label: 'Xếp hạng ELO', link: '/admin/ratings' },
        ],
    },
    logoutItem,
];

const Sidebar = ({ collapsed, setCollapsed }:SidebarProps) => {
    const navigate = useNavigate();

    const {
        token: { colorBgContainer, colorBorderSecondary },
    } = theme.useToken();

    const findMenuItem = (items: CustomMenuItem[], targetKey: string): CustomMenuItem | undefined => {
        for (const item of items) {
            if (item.key === targetKey && item.link) {
                return item;
            }
            if (item.children) {
                const foundChild = findMenuItem(item.children as CustomMenuItem[], targetKey);
                if (foundChild) {
                    return foundChild;
                }
            }
        }
        return undefined;
    };
    
    const handleLogout = () => {
        Cookies.remove('authToken');

        localStorage.removeItem('currentUser');

        navigate('/auth');
    };

    const handleMenuClick = (e: any) => {
        if (e.key === 'logout') {
            handleLogout();
            return;
        }

        const clickedItem = findMenuItem(menuItemsAdmin, e.key);

        if (clickedItem && clickedItem.link) {
            navigate(clickedItem.link);
        }
    };

    const siderStyle: CSSProperties = {
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        background: colorBgContainer,
        paddingTop: 64,
    };

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            trigger={null}
            width={250}
            style={siderStyle}
        >
            <div
                className={`
              sidebar-trigger
              absolute top-0 left-0 w-full h-16 cursor-pointer 
              flex items-center 
              ${collapsed ? 'justify-center' : 'justify-end pr-6'} 
              border-b
          `}

                style={{
                    background: colorBgContainer,
                    borderColor: colorBorderSecondary
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed
                    ? <MenuUnfoldOutlined className="text-lg" />
                    : <MenuFoldOutlined className="text-lg" />
                }
            </div>

            <Menu
                theme="light"
                mode="inline"
                defaultSelectedKeys={['dashboard']}
                defaultOpenKeys={['content_management']}
                onClick={handleMenuClick}
                items={menuItemsAdmin as ItemType[]}
                style={{
                    borderRight: 0,
                    marginTop: 0,
                }}
            />
        </Sider>
    );
};

export default Sidebar;