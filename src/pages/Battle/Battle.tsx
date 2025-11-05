import React, { useState, useEffect, useMemo } from 'react';

import { Table, Tag, Card, Typography, Space, Tooltip, Input, Alert, Avatar, Statistic } from 'antd'; // Import Statistic
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import './battle.css'

import {
    ClockCircleOutlined,
    TrophyOutlined,
    UserOutlined,
    BookOutlined,
    SearchOutlined,
    DotChartOutlined,
    StarOutlined, // Dùng cho hạng 1
    TeamOutlined, // Dùng cho số người tham gia
    FireOutlined // Dùng cho điểm battle
} from '@ant-design/icons';

import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;

// =======================================================
// 1. ĐỊNH NGHĨA INTERFACE (GIỮ NGUYÊN)
// =======================================================

interface UserRating {
    ratingId: number;
    eloRating: number;
    winCount: number;
    lossCount: number;
    lastPlayed: string;
}

interface User {
    userId: number;
    username: string;
    fullName: string;
    email: string;
    avatar: string;
    role: string;
    userRating?: UserRating;
}

interface BattleParticipant {
    participantId: number;
    score: number;
    rankInBattle: number | null;
    timeTakenMs: number | null;
    winner: boolean;
    user?: User;
}

interface Question { questionId: number; questionText: string; }
interface Quest { questId: number; questName: string; questType: 'quiz' | 'puzzle' | 'coding' | string; difficulty: 'easy' | 'medium' | 'hard' | string; requiredXp: number; questions: Question[]; }
interface Topic { topicId: number; topicName: string; description: string; orderIndex: number; quests?: Quest[]; }

interface Battle {
    battleId: number;
    topic: Topic;
    startTime: string;
    endTime: string | null;
    status: 'in_progress' | 'completed' | 'pending' | 'canceled' | string;
    questionSetId: number | null;
    participants: BattleParticipant[];
}

interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    empty: boolean;
    last: boolean;
    first: boolean;
    sort: any;
    pageable: any;
}

// =======================================================
// 2. COMPONENTS CON VÀ HÀM PHỤ (CẬP NHẬT GIAO DIỆN)
// =======================================================

const getStatusTag = (status: string) => {
    const statusText = status.replace(/_/g, ' ');
    let color: string;
    switch (status) {
        case 'completed': color = 'green'; break;
        case 'in_progress': color = 'blue'; break;
        case 'pending': color = 'yellow'; break;
        case 'canceled': color = 'red'; break;
        default: color = 'gray';
    }
    // Cập nhật: Tag rộng hơn, đậm hơn
    return (
        <Tag
            style={{padding:5}}
            color={color}
            className="uppercase font-extrabold rounded-full px-3 py-1 text-xs text-center block w-full transition duration-200 hover:scale-[1.02]"
        >
            {statusText}
        </Tag>
    );
};

// Component con để hiển thị chi tiết người tham gia (Expansion Row)
const ExpandedParticipantsTable: React.FC<{ participants: BattleParticipant[] }> = ({ participants }) => {

    const participantColumns: ColumnsType<BattleParticipant> = [
        {
            title: 'Người chơi',
            key: 'user',
            width: 200,
            render: (_, record) => (
                <Space>
                    {/* Cập nhật: Avatar lớn hơn, có viền */}
                    <Avatar
                        size="large"
                        src={record.user?.avatar}
                        icon={<UserOutlined />}
                        className="bg-indigo-100 text-indigo-700 border border-indigo-300"
                    />
                    <Space direction="vertical" size={2}>
                        <Text strong className="text-base text-gray-800 hover:text-indigo-600 transition duration-150">{record.user?.username || `ID: ${record.participantId}`}</Text>
                        <Text type="secondary" className="text-xs italic">({record.user?.fullName || 'N/A'})</Text>
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Điểm ELO',
            key: 'eloRating',
            align: 'center',
            width: 150,
            sorter: (a, b) => (b.user?.userRating?.eloRating || 0) - (a.user?.userRating?.eloRating || 0),
            render: (_, record) => (
                <Tag
                    icon={<DotChartOutlined />}
                    color="purple"
                    className="font-extrabold text-base border border-purple-300 shadow-md px-3 py-1"
                >
                    {record.user?.userRating?.eloRating || '1000'}
                </Tag>
            )
        },
        {
            title: 'Điểm Battle',
            dataIndex: 'score',
            key: 'score',
            align: 'center',
            width: 150,
            sorter: (a, b) => b.score - a.score,
            render: (score: number) => (
                <Tag
                    icon={<FireOutlined />}
                    color="volcano"
                    className="font-extrabold text-base border border-volcano-300 shadow-md px-3 py-1"
                >
                    +{score} XP
                </Tag>
            )
        },
        {
            title: 'Hạng',
            dataIndex: 'rankInBattle',
            key: 'rankInBattle',
            align: 'center',
            width: 100,
            sorter: (a, b) => (a.rankInBattle || Infinity) - (b.rankInBattle || Infinity),
            // Cập nhật: Thiết kế nổi bật cho Hạng 1
            render: (rank) => {
                if (!rank) return <Text type="secondary">N/A</Text>;

                const isWinner = rank === 1;
                let color = 'geekblue'; // Màu mặc định
                if (rank === 1) color = 'gold';

                return (
                    <Tag
                        icon={isWinner ? <StarOutlined className="text-xl" /> : null}
                        color={color as any}
                        className={`font-black text-lg p-2 rounded-full min-w-[70px] inline-flex items-center justify-center ${isWinner ? 'border-4 border-yellow-700 bg-yellow-400/80 shadow-2xl scale-110 transition duration-300' : 'border-geekblue-300'}`}
                    >
                        {isWinner ? `RANK ${rank}` : `#${rank}`}
                    </Tag>
                );
            }
        },
        {
            title: 'Thắng',
            dataIndex: 'winner',
            key: 'winner',
            align: 'center',
            width: 80,
            render: (winner: boolean) => winner
                ? <TrophyOutlined className="text-green-500 text-2xl animate-pulse" />
                : <Text type="secondary"><ClockCircleOutlined /> Thua</Text>
        },
    ];

    return (
        <Card
            title={<Title level={5} className="m-0 flex items-center gap-2 text-indigo-800"><TeamOutlined /> Chi tiết Người tham gia ({participants.length})</Title>}
            size="small"
            className="m-4 bg-indigo-50 border border-indigo-300 rounded-lg shadow-xl"
            headStyle={{ borderBottom: '1px solid #c7d2fe', padding: '10px 16px', backgroundColor: '#eef2ff' }}
        >
            <Table
                columns={participantColumns}
                dataSource={participants}
                rowKey="participantId"
                pagination={false}
                className="bg-white rounded-lg overflow-hidden border border-gray-200"
                rowClassName={(record) => record.rankInBattle === 1 ? 'bg-yellow-50 hover:!bg-yellow-100 transition-all duration-150' : 'hover:bg-gray-50 transition-all duration-150'}
                size="middle"
            />
        </Card>
    );
};


// =======================================================
// 3. COMPONENT CHÍNH & LOGIC PAGING/SEARCH (CẬP NHẬT GIAO DIỆN)
// =======================================================

const Battle: React.FC = () => {
    const [battles, setBattles] = useState<Battle[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState<string>('');

    // Trạng thái cho Paging, Sorting, Filtering
    const [pagination, setPagination] = useState({
        total: 0,
        current: 1,
        pageSize: 10,
        sortBy: 'battleId' as string,
        sortOrder: 'descend' as 'ascend' | 'descend' | undefined,
        statusFilter: undefined as string | undefined,
    });

    // Hàm gọi API với các tham số phân trang
    const fetchBattles = async (
        currentPage: number = pagination.current,
        pageSize: number = pagination.pageSize,
        search: string = searchText,
        status: string | undefined = pagination.statusFilter,
        sortBy: string = pagination.sortBy,
        sortOrder: 'ascend' | 'descend' | undefined = pagination.sortOrder
    ) => {
        setLoading(true);
        try {
            const sortDirection = sortOrder === 'descend' ? 'desc' : (sortOrder === 'ascend' ? 'asc' : 'desc');

            const params = {
                page: currentPage - 1,
                size: pageSize,
                search: search || undefined,
                status: status || undefined,
                sortBy: sortBy + ',' + sortDirection,
            };

            const response = await axios.get<Page<Battle>>('http://localhost:8082/api/battles', { params });

            setBattles(response.data.content);
            setPagination(prev => ({
                ...prev,
                total: response.data.totalElements,
                current: response.data.number + 1,
                pageSize: response.data.size,
                sortBy: sortBy,
                sortOrder: sortOrder,
                statusFilter: status
            }));
            setError(null);

        } catch (err) {
            console.error("Lỗi khi tải dữ liệu trận đấu:", err);
            const errorMessage = (err as any)?.message || "Lỗi không xác định.";
            setError(`Không thể tải dữ liệu trận đấu. Đảm bảo server Spring Boot đang chạy tại http://localhost:8082. Chi tiết: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBattles();
    }, []);

    // Handler cho sự kiện thay đổi của Table (Pagination, Sorting, Filtering)
    const handleTableChange = (
        newPagination: TablePaginationConfig,
        filters: any,
        sorter: any
    ) => {
        const newSortBy = sorter.field || 'battleId';
        const newSortOrder = sorter.order || 'descend';
        const newStatusFilter = filters.status ? filters.status[0] : undefined;

        fetchBattles(
            newPagination.current,
            newPagination.pageSize,
            searchText,
            newStatusFilter,
            newSortBy,
            newSortOrder
        );
    };

    // Handler cho thanh Search (luôn reset về trang 1 khi tìm kiếm)
    const handleSearch = (value: string) => {
        setSearchText(value);
        fetchBattles(
            1, // Reset về trang 1
            pagination.pageSize,
            value,
            pagination.statusFilter,
            pagination.sortBy,
            pagination.sortOrder
        );
    };

    // --- Định nghĩa các cột cho bảng Battle (CẬP NHẬT GIAO DIỆN) ---
    const battleColumns: ColumnsType<Battle> = [
        {
            title: 'ID',
            dataIndex: 'battleId',
            key: 'battleId',
            sorter: true,
            defaultSortOrder: 'descend',
            width: 80,
            align: 'center',
            render: (id: number) => <Text strong className="text-gray-700">{id}</Text>
        },
        {
            title: 'Chủ đề',
            dataIndex: 'topic',
            key: 'topic',
            // Cập nhật: Sử dụng Card để bao bọc, tạo điểm nhấn
            render: (topic: Topic) => (
                <Card size="small" className="bg-blue-50 border-l-4 border-blue-500 shadow-sm transition hover:shadow-md hover:border-blue-700">
                    <Space direction="vertical" size={2}>
                        <Text strong className="text-blue-700 text-base flex items-center gap-1">
                            <BookOutlined className="text-lg" /> {topic.topicName}
                        </Text>
                        <Tooltip title={topic.description}>
                            <Text type="secondary" className="text-xs italic truncate max-w-xs block">
                                {topic.description}
                            </Text>
                        </Tooltip>
                    </Space>
                </Card>
            ),
            sorter: true,
        },
        {
            title: 'Thời gian bắt đầu',
            dataIndex: 'startTime',
            key: 'startTime',
            width: 180,
            render: (startTime: string) => (
                <Space direction="vertical" size={0}>
                    <Text strong className="text-base text-gray-700">
                        {moment(startTime).format('DD/MM/YYYY')}
                    </Text>
                    <Text type="secondary" className="text-xs italic flex items-center gap-1">
                        <ClockCircleOutlined className="text-green-500" />
                        {moment(startTime).format('HH:mm:ss')}
                    </Text>
                </Space>
            ),
            sorter: true,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: getStatusTag,
            filters: [
                { text: 'Hoàn thành', value: 'completed' },
                { text: 'Đang diễn ra', value: 'in_progress' },
                { text: 'Chờ bắt đầu', value: 'pending' },
                { text: 'Đã hủy', value: 'canceled' },
            ],
            filteredValue: pagination.statusFilter ? [pagination.statusFilter] : null,
        },
        {
            title: 'Số người tham gia',
            dataIndex: 'participants',
            key: 'participantsCount',
            align: 'center',
            width: 150,
            // Cập nhật: Badge nổi bật hơn
            render: (participants: BattleParticipant[]) => (
                <Space style={{padding:5}} className="bg-indigo-100 border-2 border-indigo-400 p-2 rounded-xl shadow-lg hover:bg-indigo-200 transition duration-200">
                    <TeamOutlined className="text-xl text-indigo-700" />
                    <Text strong className="text-xl text-indigo-800">
                        {participants.length}
                    </Text>
                </Space>
            ),
            sorter: false,
        },
    ];

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            {/* Cập nhật: Tiêu đề nổi bật */}
            <Title level={1} className="text-gray-900 mb-6 border-b-4 border-indigo-600 pb-2 flex items-center gap-2">
                <TrophyOutlined className="text-indigo-600 text-3xl" /> Danh sách Trận đấu
            </Title>


            {/* Thanh tìm kiếm: Bo góc và thêm bóng */}
            <div className="mb-6">
                <Search
                    placeholder="Tìm kiếm theo Tên Chủ đề"
                    allowClear
                    enterButton={<Space><SearchOutlined /> Tìm kiếm</Space>}
                    size="large"
                    onSearch={handleSearch}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="max-w-xl shadow-xl [&_.ant-input-group>input]:rounded-l-xl [&_.ant-input-group-addon>button]:rounded-r-xl"
                    value={searchText}
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

            {/* Cập nhật: Card container nổi bật */}
            <Card
                title={<Title level={4} className="m-0 text-indigo-700 flex items-center gap-2">📋 Quản lý Battles</Title>}
                className="shadow-2xl rounded-xl border-t-8 border-indigo-600 transition-shadow duration-300 hover:shadow-indigo-400/50"
                bodyStyle={{ padding: 0 }}
                extra={
                    <Statistic
                        title="Tổng số trận đấu"
                        value={pagination.total}
                        prefix={<TrophyOutlined />}
                        className="text-right"
                    />
                }
            >
                <Table
                    columns={battleColumns}
                    dataSource={battles}
                    rowKey="battleId"
                    loading={loading}
                    expandable={{
                        expandedRowRender: (record: Battle) => (
                            <ExpandedParticipantsTable participants={record.participants} />
                        ),
                        rowExpandable: (record: Battle) => record.participants && record.participants.length > 0,
                    }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} items`
                    }}
                    onChange={handleTableChange}
                    className="w-full"
                    rowClassName="hover:bg-indigo-50 transition duration-150 border-b border-gray-100"
                    components={{
                        body: {
                            wrapper: (props) => <tbody {...props} className="[&>tr:last-child]:border-b-0" />
                        }
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>
        </div>
    );
};

export default Battle;