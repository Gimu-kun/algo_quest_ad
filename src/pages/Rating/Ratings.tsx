import React, { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Card, Typography, Space, Tooltip, Input, Alert, Avatar, Statistic } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
    DotChartOutlined,
    UserOutlined,
    ClockCircleOutlined,
    TrophyOutlined,
    SwapOutlined,
    BarChartOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;

// =======================================================
// 1. ĐỊNH NGHĨA INTERFACE
// =======================================================

// Interface đơn giản hóa cho các mối quan hệ sâu để phục vụ việc hiển thị
interface UserProgress {
    totalXp: number;
    currentLevel: number;
}

interface UserBadge {
    userBadgeId: number;
    // Chúng ta chỉ cần đếm số lượng, không cần chi tiết Badge
}

interface User {
    userId: number;
    username: string;
    fullName: string;
    avatar: string;
    // Bổ sung các mối quan hệ cần thiết cho hiển thị
    userProgress?: UserProgress;
    userBadges?: UserBadge[];
}

interface UserRating {
    ratingId: number;
    eloRating: number;
    winCount: number;
    lossCount: number;
    lastPlayed: string;
    user: User; // Thông tin người dùng đã được nhúng (EAGER Fetching)
}

interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    empty: boolean;
    pageable: any;
    sort: any;
}


// =======================================================
// 2. COMPONENT CHÍNH
// =======================================================

const Ratings: React.FC = () => {
    const [userRatings, setUserRatings] = useState<UserRating[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState<string>('');

    // Trạng thái cho Paging, Sorting
    const [pagination, setPagination] = useState({
        total: 0,
        current: 1,
        pageSize: 10,
        sortBy: 'eloRating' as string, // Mặc định sắp xếp theo ELO
        sortOrder: 'descend' as 'ascend' | 'descend' | undefined, // Giảm dần
    });


    // --- HÀM GỌI API ---
    const fetchUserRatings = async (
        currentPage: number = pagination.current,
        pageSize: number = pagination.pageSize,
        search: string = searchText,
        sortBy: string = pagination.sortBy,
        sortOrder: 'ascend' | 'descend' | undefined = pagination.sortOrder
    ) => {
        setLoading(true);
        try {
            const sortDirection = sortOrder === 'descend' ? 'desc' : (sortOrder === 'ascend' ? 'asc' : 'desc');

            // API Rating hiện tại không hỗ trợ tìm kiếm bằng 'search' trên tên người dùng,
            // nhưng ta vẫn giữ tham số này để chuẩn bị cho tương lai.
            const params = {
                page: currentPage - 1,
                size: pageSize,
                // search: search || undefined, // Bỏ comment nếu API /ratings hỗ trợ tìm kiếm
                sort: `${sortBy},${sortDirection}`,
            };

            const response = await axios.get<Page<UserRating>>('http://localhost:8081/api/ratings', { params });

            setUserRatings(response.data.content);
            setPagination(prev => ({
                ...prev,
                total: response.data.totalElements,
                current: response.data.number + 1,
                pageSize: response.data.size,
                sortBy: sortBy,
                sortOrder: sortOrder
            }));
            setError(null);

        } catch (err) {
            console.error("Lỗi khi tải dữ liệu Rating:", err);
            const errorMessage = (err as any)?.message || "Lỗi không xác định.";
            setError(`Không thể tải dữ liệu xếp hạng. Đảm bảo server Spring Boot đang chạy tại http://localhost:8081. Chi tiết: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserRatings();
    }, []);

    // --- HANDLER TABLE CHANGE ---
    const handleTableChange = (
        newPagination: TablePaginationConfig,
        filters: any,
        sorter: any
    ) => {
        const newSortBy = sorter.field || 'eloRating';
        const newSortOrder = sorter.order || 'descend';

        fetchUserRatings(
            newPagination.current,
            newPagination.pageSize,
            searchText,
            newSortBy,
            newSortOrder
        );
    };

    // --- ĐỊNH NGHĨA CỘT CỦA TABLE ---
    const columns: ColumnsType<UserRating> = [
        {
            title: 'Hạng',
            key: 'rank',
            width: 80,
            align: 'center',
            render: (_, __, index) => {
                const rank = (pagination.current - 1) * pagination.pageSize + index + 1;
                let tagColor = 'gray';
                if (rank === 1) tagColor = 'gold';
                else if (rank === 2) tagColor = 'silver';
                else if (rank === 3) tagColor = 'volcano';

                return (
                    <Tag 
                        color={tagColor} 
                        className="font-black text-lg p-2 rounded-full min-w-[50px] inline-flex items-center justify-center shadow-lg transition duration-200"
                    >
                        #{rank}
                    </Tag>
                );
            }
        },
        {
            title: 'Người dùng',
            dataIndex: 'user',
            key: 'user',
            width: 300,
            render: (user: User) => (
                <Space size="middle" className="p-2 border border-gray-200 rounded-lg shadow-sm hover:bg-indigo-50 transition duration-150 w-full">
                    <Avatar
                        size="large"
                        src={user.avatar}
                        icon={<UserOutlined />}
                        className="bg-indigo-100 text-indigo-700 border border-indigo-300 shadow-md"
                    />
                    <Space direction="vertical" size={2}>
                        <Text strong className="text-base text-gray-800 hover:text-indigo-600 transition duration-150">
                            {user.username}
                        </Text>
                        <Text type="secondary" className="text-xs italic">
                            {user.fullName || 'Người chơi ẩn danh'}
                        </Text>
                        <Tag 
                            color="blue" 
                            icon={<BarChartOutlined />} 
                            className="font-bold text-xs"
                        >
                            Level {user.userProgress?.currentLevel || 1}
                        </Tag>
                        {/* Hiển thị số lượng huy hiệu */}
                        <Tooltip title={`Số huy hiệu đã nhận: ${user.userBadges?.length || 0}`}>
                            <Tag 
                                color="purple" 
                                icon={<TrophyOutlined />} 
                                className="font-bold text-xs"
                            >
                                {user.userBadges?.length || 0} Badges
                            </Tag>
                        </Tooltip>
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Điểm ELO',
            dataIndex: 'eloRating',
            key: 'eloRating',
            width: 150,
            align: 'center',
            sorter: true,
            defaultSortOrder: 'descend',
            render: (elo: number) => (
                <Tag
                    icon={<DotChartOutlined />}
                    color="magenta"
                    className="font-extrabold text-xl p-3 rounded-xl border border-magenta-300 shadow-lg"
                >
                    {elo}
                </Tag>
            )
        },
        {
            title: 'Tỉ lệ Thắng/Thua',
            key: 'winLossRatio',
            width: 200,
            align: 'center',
            render: (_, record) => {
                const total = record.winCount + record.lossCount;
                const ratio = total > 0 ? (record.winCount / total) * 100 : 0;
                
                return (
                    <Space direction="vertical" size={4} className="w-full">
                        <Tag color="green" className="font-bold text-base w-full flex justify-between items-center">
                            <TrophyOutlined /> Thắng: {record.winCount}
                        </Tag>
                        <Tag color="red" className="font-bold text-base w-full flex justify-between items-center">
                            <SwapOutlined /> Thua: {record.lossCount}
                        </Tag>
                        <Text strong className="text-gray-700 mt-2">
                             Tỉ lệ: <Text code>{ratio.toFixed(1)}%</Text>
                        </Text>
                    </Space>
                );
            }
        },
        {
            title: 'Lần chơi cuối',
            dataIndex: 'lastPlayed',
            key: 'lastPlayed',
            width: 200,
            render: (lastPlayed: string) => (
                <Space direction="vertical" size={2}>
                    <Text strong className="text-base text-gray-700">
                        {moment(lastPlayed).format('DD/MM/YYYY')}
                    </Text>
                    <Text type="secondary" className="text-xs italic flex items-center gap-1">
                        <ClockCircleOutlined className="text-blue-500" />
                        {moment(lastPlayed).fromNow()}
                    </Text>
                </Space>
            ),
            sorter: true,
        },
    ];

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <Title level={1} className="text-gray-900 mb-6 border-b-4 border-magenta-600 pb-2 flex items-center gap-2">
                <DotChartOutlined className="text-magenta-600 text-3xl" /> Bảng Xếp Hạng ELO Người Dùng
            </Title>
            
            <div className="mb-6">
                <Search
                    placeholder="Tìm kiếm theo Tên Người dùng (Chức năng tìm kiếm có thể cần được hỗ trợ từ API)"
                    allowClear
                    enterButton={<Space><UserOutlined /> Tìm kiếm</Space>}
                    size="large"
                    onSearch={(value) => {
                        setSearchText(value);
                        // Tạm thời không gọi lại API vì API hiện tại chưa hỗ trợ search
                        // fetchUserRatings(1, pagination.pageSize, value, pagination.sortBy, pagination.sortOrder);
                    }}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="max-w-xl shadow-xl [&_.ant-input-group>input]:rounded-l-xl [&_.ant-input-group-addon>button]:rounded-r-xl"
                    value={searchText}
                    disabled={true} // Vô hiệu hóa vì API hiện chưa hỗ trợ search
                />
            </div>

            {error && (
                <Alert
                    message="Lỗi API"
                    description={error}
                    type="error"
                    showIcon
                    className="mb-4 rounded-lg shadow-md"
                />
            )}

            <Card
                title={<Title level={4} className="m-0 text-magenta-700 flex items-center gap-2">🏆 Top Người Chơi</Title>}
                className="shadow-2xl rounded-xl border-t-8 border-magenta-600 transition-shadow duration-300 hover:shadow-magenta-400/50"
                bodyStyle={{ padding: 0 }}
                extra={
                    <Statistic
                        title="Tổng số Xếp hạng"
                        value={pagination.total}
                        prefix={<UserOutlined />}
                        className="text-right"
                    />
                }
            >
                <Table
                    columns={columns}
                    dataSource={userRatings}
                    rowKey="ratingId"
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} Xếp hạng`
                    }}
                    onChange={handleTableChange}
                    className="w-full"
                    rowClassName={(record, index) => {
                        const rank = (pagination.current - 1) * pagination.pageSize + index + 1;
                        if (rank === 1) return 'bg-yellow-50 hover:!bg-yellow-100 transition-all duration-150 border-b border-gray-100';
                        if (rank === 2) return 'bg-gray-50 hover:!bg-gray-100 transition-all duration-150 border-b border-gray-100';
                        if (rank === 3) return 'bg-orange-50 hover:!bg-orange-100 transition-all duration-150 border-b border-gray-100';
                        return 'hover:bg-gray-50 transition duration-150 border-b border-gray-100';
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>
        </div>
    );
};

export default Ratings;