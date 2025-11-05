import React, { useState, useEffect, useCallback } from 'react';
import { 
    Table, Tag, Progress, Card, Row, Col, Spin, Alert,
    type TableProps, Typography, Input, Select, Button, Space 
} from 'antd';
import { 
    TrophyOutlined, UpOutlined, CheckCircleOutlined, StarOutlined, 
    SearchOutlined, ReloadOutlined 
} from '@ant-design/icons';
import debounce from 'lodash/debounce'; // Cần cài đặt: npm install lodash @types/lodash

const { Title, Text } = Typography;
const { Option } = Select;

// --- INTERFACES (KHÔNG THAY ĐỔI) ---

interface ProgressSummaryDTO {
    totalXp: number;
    currentLevel: number;
    questsCompletedCount: number;
    badgesEarnedCount: number;
}

interface TopicCompletionDTO {
    topicId: number;
    topicName: string;
    totalQuests: number;
    completedQuests: number;
    completionPercentage: number;
}

interface EarnedBadgeDTO {
    badgeId: number;
    badgeName: string;
    description: string;
    imageUrl: string;
    awardedAt: string;
}

export interface UserProgressStatsDTO {
    userId: number;
    username: string;
    fullName: string;
    progressSummary: ProgressSummaryDTO;
    topicCompletionRates: TopicCompletionDTO[];
    earnedBadges: EarnedBadgeDTO[];
}

interface SpringPage<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    pageable: any; 
}

interface PaginationState {
    current: number;
    pageSize: number;
    total: number;
}

// --- COMPONENT CHÍNH ---

const API_URL = "http://localhost:8082/api/user-progress/stats";
const MAX_LEVEL = 10; // Giả định cấp độ tối đa để tạo bộ lọc

const UserProgressPage: React.FC = () => {
    const [statsData, setStatsData] = useState<UserProgressStatsDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    // State cho tìm kiếm và lọc
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [levelFilter, setLevelFilter] = useState<number | null>(null);

    // Hàm lấy dữ liệu từ API
    const fetchUserStats = async (
        page: number, 
        size: number, 
        search: string, 
        level: number | null
    ) => {
        setLoading(true);
        setError(null);
        
        let url = `${API_URL}?page=${page - 1}&size=${size}`;
        if (search) {
            // Thêm tham số tìm kiếm
            url += `&search=${search}`;
        }
        if (level !== null) {
            // Thêm tham số lọc cấp độ
            url += `&level=${level}`;
        }

        try {
            const response = await fetch(url); 
            if (!response.ok) {
                throw new Error('Lỗi khi tải dữ liệu từ API.');
            }
            
            const data: SpringPage<UserProgressStatsDTO> = await response.json();
            
            setStatsData(data.content);
            setPagination({
                current: page,
                total: data.totalElements,
                pageSize: size,
            });
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Tạo phiên bản debounced của hàm fetchUserStats để tránh spam API
    // khi người dùng gõ tìm kiếm liên tục.
    const debouncedFetchStats = useCallback(
        debounce((search: string, level: number | null) => {
            // Luôn reset về trang 1 khi filter/search thay đổi
            fetchUserStats(1, pagination.pageSize, search, level);
        }, 500), 
        [pagination.pageSize] // Phụ thuộc vào pageSize để không tạo debounce mới khi chỉ có page thay đổi
    );


    // Effect gọi API khi mount và khi thay đổi pagination
    useEffect(() => {
        // Chỉ gọi fetchStats bình thường khi page/pageSize thay đổi
        // Việc thay đổi searchQuery/levelFilter sẽ kích hoạt debouncedFetchStats
        fetchUserStats(pagination.current, pagination.pageSize, searchQuery, levelFilter);
    }, [pagination.current, pagination.pageSize]);


    // Xử lý khi thay đổi Input Tìm kiếm
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        // Kích hoạt debounce fetch
        debouncedFetchStats(value, levelFilter);
    };

    // Xử lý khi thay đổi Select Lọc Cấp độ
    const handleLevelFilterChange = (value: number | null) => {
        const newLevel = value === undefined ? null : value;
        setLevelFilter(newLevel);
        // Reset về trang 1 khi lọc thay đổi
        fetchUserStats(1, pagination.pageSize, searchQuery, newLevel);
    };

    // Xử lý Reset bộ lọc
    const handleResetFilters = () => {
        setSearchQuery('');
        setLevelFilter(null);
        // Reset và tải lại trang 1
        fetchUserStats(1, pagination.pageSize, '', null);
    };

    // --- CÁC HÀM RENDER CHI TIẾT (GIỮ NGUYÊN) ---

    const renderSummary = (summary: ProgressSummaryDTO) => (/* ... giữ nguyên code JSX ... */
        <Row gutter={[16, 16]} className="mt-2 mb-4">
            <Col xs={12} sm={6}><Card className="shadow-md border-t-4 border-blue-500 hover:shadow-lg transition"><Text className="text-gray-500 block">Tổng XP</Text><Title level={4} className="!mb-0 text-blue-700">{summary.totalXp} <StarOutlined className="text-xl" /></Title></Card></Col>
            <Col xs={12} sm={6}><Card className="shadow-md border-t-4 border-green-500 hover:shadow-lg transition"><Text className="text-gray-500 block">Cấp độ</Text><Title level={4} className="!mb-0 text-green-700">{summary.currentLevel} <UpOutlined className="text-xl" /></Title></Card></Col>
            <Col xs={12} sm={6}><Card className="shadow-md border-t-4 border-yellow-500 hover:shadow-lg transition"><Text className="text-gray-500 block">Hoàn thành Ải</Text><Title level={4} className="!mb-0 text-yellow-700">{summary.questsCompletedCount} <CheckCircleOutlined className="text-xl" /></Title></Card></Col>
            <Col xs={12} sm={6}><Card className="shadow-md border-t-4 border-purple-500 hover:shadow-lg transition"><Text className="text-gray-500 block">Huy hiệu</Text><Title level={4} className="!mb-0 text-purple-700">{summary.badgesEarnedCount} <TrophyOutlined className="text-xl" /></Title></Card></Col>
        </Row>
    );

    const renderTopicCompletion = (rates: TopicCompletionDTO[]) => (/* ... giữ nguyên code JSX ... */
        <div className="space-y-3 mt-4">
            <Text strong className="block text-lg text-gray-700">Tỉ lệ Hoàn thành Chủ đề:</Text>
            {rates.map(topic => (
                <div key={topic.topicId} className="flex items-center space-x-4">
                    <div className="w-1/4 min-w-[150px]">
                        <Tag color="blue" className="text-base py-1 px-3 rounded-full">{topic.topicName}</Tag>
                    </div>
                    <div className="w-3/4">
                        <Progress 
                            percent={topic.completionPercentage} 
                            size="small"
                            status={topic.completionPercentage === 100 ? "success" : "active"}
                            format={(percent) => `${percent}% (${topic.completedQuests}/${topic.totalQuests})`}
                        />
                    </div>
                </div>
            ))}
        </div>
    );

    const renderEarnedBadges = (badges: EarnedBadgeDTO[]) => {
        if (badges.length === 0) {
            return <div className="text-gray-500 italic mt-4">Chưa đạt được huy hiệu nào.</div>;
        }
        return (/* ... giữ nguyên code JSX ... */
            <div className="mt-4">
                <Text strong className="block text-lg text-gray-700 mb-2">Huy hiệu Đã Đạt:</Text>
                <div className="flex flex-wrap gap-4">
                    {badges.map(badge => (
                        <Card 
                            key={badge.badgeId}
                            hoverable
                            className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)] shadow-md transition-all duration-300"
                            title={<div className="flex items-center"><TrophyOutlined className="text-yellow-500 mr-2" /> {badge.badgeName}</div>}
                            size="small"
                        >
                            <p className="text-gray-600 text-sm mb-1">{badge.description}</p>
                            <Text type="secondary" className="text-xs">
                                Nhận lúc: {new Date(badge.awardedAt).toLocaleString('vi-VN')}
                            </Text>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    // --- CỘT BẢNG (GIỮ NGUYÊN) ---
    const columns: TableProps<UserProgressStatsDTO>['columns'] = [
        // ... (Giữ nguyên định nghĩa Columns)
        {title: 'ID',dataIndex: 'userId',key: 'userId',width: 70,sorter: (a, b) => a.userId - b.userId,},
        {title: 'Tên người dùng',dataIndex: 'username',key: 'username',render: (text: string, record) => (<div><Text strong>{text}</Text><Text type="secondary" className="block text-sm">({record.fullName})</Text></div>),sorter: (a, b) => a.username.localeCompare(b.username),},
        {title: 'Cấp độ & XP',key: 'summary',render: (_, record) => (<div className="space-y-1"><Tag color="green"><UpOutlined /> Cấp {record.progressSummary.currentLevel}</Tag><Tag color="blue"><StarOutlined /> {record.progressSummary.totalXp} XP</Tag></div>),responsive: ['sm'],},
        {title: 'Tỉ lệ Hoàn thành',key: 'completion',render: (_, record) => {const totalQuests = record.topicCompletionRates.reduce((sum, rate) => sum + rate.totalQuests, 0);const completedQuests = record.topicCompletionRates.reduce((sum, rate) => sum + rate.completedQuests, 0);const overallPercentage = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;return (<Progress type="circle" percent={parseFloat(overallPercentage.toFixed(1))} width={60} format={(percent) => `${percent}%`} />);},responsive: ['md'],},
        {title: 'Huy hiệu',key: 'badges',render: (_, record) => (<Tag color={record.progressSummary.badgesEarnedCount > 0 ? "purple" : "default"} icon={<TrophyOutlined />}>{record.progressSummary.badgesEarnedCount} Huy hiệu</Tag>),responsive: ['md'],},
    ];

    // --- CẤU TRÚC GIAO DIỆN CHUNG (THÊM PHẦN FILTER) ---
    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <Title level={2} className="text-center text-gray-800 mb-6">
                Bảng Thống Kê Tiến Độ Người Dùng
            </Title>

            {error && <Alert message="Lỗi tải dữ liệu" description={error} type="error" showIcon className="mb-4" />}

            {/* Hộp Tìm kiếm và Lọc */}
            <Card className="shadow-lg mb-6 p-4">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={12} lg={8}>
                        <Text strong className="block mb-1">Tìm kiếm (Username/FullName):</Text>
                        <Input
                            placeholder="Nhập tên người dùng hoặc tên đầy đủ..."
                            prefix={<SearchOutlined />}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            allowClear
                        />
                    </Col>
                    <Col xs={12} md={6} lg={4}>
                        <Text strong className="block mb-1">Lọc theo Cấp độ:</Text>
                        <Select
                            placeholder="Chọn cấp độ"
                            style={{ width: '100%' }}
                            allowClear
                            value={levelFilter}
                            onChange={handleLevelFilterChange}
                        >
                            {/* Tạo các Option từ 1 đến MAX_LEVEL */}
                            {[...Array(MAX_LEVEL).keys()].map(i => (
                                <Option key={i + 1} value={i + 1}>Cấp {i + 1}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={12} md={6} lg={4} className="flex justify-end md:justify-start">
                        <Button 
                            onClick={handleResetFilters} 
                            icon={<ReloadOutlined />} 
                            className="mt-6 md:mt-5 relative top-2.5"
                            disabled={!searchQuery && levelFilter === null}
                        >
                            Reset
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Card className="shadow-xl">
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={statsData}
                        rowKey="userId"
                        pagination={{ 
                            ...pagination,
                            onChange: (page, pageSize) => fetchUserStats(page, pageSize, searchQuery, levelFilter),
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50'],
                            onShowSizeChange: (current, size) => fetchUserStats(1, size, searchQuery, levelFilter)
                        }}
                        expandable={{
                            expandedRowRender: (record) => (
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
                                    <Title level={4} className="text-blue-600">Chi tiết Tiến độ của {record.fullName}</Title>
                                    {renderSummary(record.progressSummary)}
                                    <Row gutter={24} className="mt-6">
                                        <Col xs={24} lg={12}>
                                            {renderTopicCompletion(record.topicCompletionRates)}
                                        </Col>
                                        <Col xs={24} lg={12}>
                                            {renderEarnedBadges(record.earnedBadges)}
                                        </Col>
                                    </Row>
                                </div>
                            ),
                            rowExpandable: record => record.progressSummary !== null,
                        }}
                        className="w-full"
                    />
                </Spin>
            </Card>
        </div>
    );
};

export default UserProgressPage;