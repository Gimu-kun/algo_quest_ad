import React from 'react';
import { Card, Statistic, Divider, Tag, List, Space, theme } from 'antd';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined, BookOutlined, TrophyOutlined } from '@ant-design/icons';

// --- TYPE DEFINITIONS ---

interface Metric {
    title: string;
    value: string | number;
    prefix: React.ReactNode;
    change: number;
    status: 'up' | 'down';
}

interface XPProgress {
    name: string;
    users: number;
    quests: number;
}

interface SubjectCompletion {
    subject: string;
    completion: number;
    users: number;
}

interface Activity {
    user: string;
    action: string;
    time: string;
    tag: 'Quest' | 'Badge' | 'New User' | 'Arena';
}

interface MetricCardProps extends Metric {}

// --- MOCK DATA (CÓ TYPING RÕ RÀNG) ---

// 1. Data cho Metric Cards
const metrics: Metric[] = [
    {
        title: "Tổng số Người dùng",
        value: 12580,
        prefix: <UserOutlined />,
        change: 12.5,
        status: 'up'
    },
    {
        title: "Tổng số Quest",
        value: 452,
        prefix: <BookOutlined />,
        change: -3.2,
        status: 'down'
    },
    {
        title: "Huy hiệu Đã trao",
        value: 9870,
        prefix: <TrophyOutlined />,
        change: 7.1,
        status: 'up'
    },
    {
        title: "Tỷ lệ Hoàn thành",
        value: "78.5%",
        prefix: null,
        change: 1.1,
        status: 'up'
    },
];

// 2. Data cho Line Chart (Tiến độ XP hàng tháng)
const xpProgressData: XPProgress[] = [
    { name: 'Tháng 1', users: 4000, quests: 2400 },
    { name: 'Tháng 2', users: 3000, quests: 1398 },
    { name: 'Tháng 3', users: 2000, quests: 9800 },
    { name: 'Tháng 4', users: 2780, quests: 3908 },
    { name: 'Tháng 5', users: 1890, quests: 4800 },
    { name: 'Tháng 6', users: 2390, quests: 3800 },
    { name: 'Tháng 7', users: 3490, quests: 4300 },
];

// 3. Data cho Bar Chart (Hoàn thành theo Chủ đề)
const subjectCompletionData: SubjectCompletion[] = [
    { subject: 'Lịch sử', completion: 85, users: 5000 },
    { subject: 'Toán học', completion: 60, users: 4200 },
    { subject: 'Vật lý', completion: 92, users: 6100 },
    { subject: 'Hóa học', completion: 77, users: 3500 },
    { subject: 'Văn học', completion: 80, users: 5500 },
];

// 4. Data cho Activity Feed
const recentActivities: Activity[] = [
    { user: 'Nguyễn Văn A', action: 'hoàn thành Quest "Lò phản ứng hạt nhân"', time: '2 phút trước', tag: 'Quest' },
    { user: 'Trần Thị B', action: 'đạt Huy hiệu "Chuyên gia Lịch sử"', time: '1 giờ trước', tag: 'Badge' },
    { user: 'Lê Văn C', action: 'đăng ký tài khoản mới', time: '3 giờ trước', tag: 'New User' },
    { user: 'Phạm Thị D', action: 'tham gia Đấu trường ELO', time: '1 ngày trước', tag: 'Arena' },
];

// --- COMPONENTS ---

// Sử dụng React.FC và Props interface
const MetricCard: React.FC<MetricCardProps> = ({ title, value, prefix, change, status }) => {
    const isUp = status === 'up';
    const color = isUp ? 'text-green-500' : 'text-red-500';
    const icon = isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />;

    return (
        <Card bordered={false} className="rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Statistic
                title={title}
                value={value}
                prefix={prefix}
                valueStyle={{ color: isUp ? '#3f8600' : '#cf1322' }}
            />
            <div className="flex items-center mt-2 text-sm">
                <span className={color + " flex items-center mr-2"}>
                    {icon} {change}%
                </span>
                <span className="text-gray-500">so với tháng trước</span>
            </div>
        </Card>
    );
};


export default function Dashboard() {
    // theme được import rõ ràng
    const { token } = theme.useToken();
    const primaryColor = token.colorPrimary;
    const secondaryColor = token.colorWarning;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Tổng Quan Hệ Thống</h1>
            
            {/* 1. METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {metrics.map((metric, index) => (
                    <MetricCard key={index} {...metric} />
                ))}
            </div>

            {/* 2. CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* LINE CHART: XP Progress */}
                <Card 
                    title="Tiến độ Quest và Người dùng (6 tháng)" 
                    className="lg:col-span-2 rounded-xl shadow-lg"
                    bordered={false}
                >
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={xpProgressData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorQuests" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor={secondaryColor} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                                <XAxis dataKey="name" stroke={token.colorTextSecondary} />
                                <YAxis stroke={token.colorTextSecondary} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: token.colorBgContainer, 
                                        borderColor: token.colorBorder,
                                        borderRadius: '8px'
                                    }} 
                                />
                                <Area type="monotone" dataKey="users" stroke={primaryColor} fillOpacity={1} fill="url(#colorUsers)" name="Users Active" />
                                <Area type="monotone" dataKey="quests" stroke={secondaryColor} fillOpacity={1} fill="url(#colorQuests)" name="Quests Hoàn thành" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* BAR CHART: Subject Completion */}
                <Card 
                    title="Mức độ Hoàn thành theo Chủ đề" 
                    className="lg:col-span-1 rounded-xl shadow-lg"
                    bordered={false}
                >
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectCompletionData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                                <XAxis type="number" stroke={token.colorTextSecondary} />
                                <YAxis type="category" dataKey="subject" width={80} stroke={token.colorTextSecondary} />
                                <Tooltip 
                                    formatter={(value: any, name: any) => [`${value}%`, 'Hoàn thành']}
                                    contentStyle={{ 
                                        backgroundColor: token.colorBgContainer, 
                                        borderColor: token.colorBorder,
                                        borderRadius: '8px'
                                    }} 
                                />
                                <Bar dataKey="completion" fill={primaryColor} radius={[4, 4, 0, 0]} name="Hoàn thành (%)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            
            {/* 3. RECENT ACTIVITY */}
            <Card 
                title="Hoạt động Gần đây" 
                className="rounded-xl shadow-lg"
                bordered={false}
            >
                <List
                    itemLayout="horizontal"
                    dataSource={recentActivities}
                    renderItem={(item: Activity) => (
                        <List.Item className="py-3 border-b border-gray-100">
                            <List.Item.Meta
                                title={
                                    <span className="font-medium text-gray-700">
                                        {item.user}
                                    </span>
                                }
                                description={
                                    <span className="text-gray-500">
                                        {item.action}
                                    </span>
                                }
                            />
                            <Space>
                                <Tag color={item.tag === 'Quest' ? 'blue' : item.tag === 'Badge' ? 'green' : 'gold'}>
                                    {item.tag}
                                </Tag>
                                <span className="text-sm text-gray-400">{item.time}</span>
                            </Space>
                        </List.Item>
                    )}
                />
            </Card>

        </div>
    );
}
