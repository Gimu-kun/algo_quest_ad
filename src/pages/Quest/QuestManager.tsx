import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    message,
    Popconfirm,
    Card,
    Space,
    Tag,
    Select,
    Spin,
    Alert, 
    Tooltip 
} from 'antd';
import { 
    PlusOutlined, 
    EditOutlined, 
    DeleteOutlined, 
    TrophyOutlined, 
    FireOutlined,
    MenuOutlined, 
    SaveOutlined, 
    SortAscendingOutlined, 
    ExclamationCircleOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';
// KHÔNG IMPORT createDndContext
import { DndProvider, useDrag, useDrop } from 'react-dnd'; 
import { HTML5Backend } from 'react-dnd-html5-backend';
// Giả định types/QuestType chứa các type cần thiết
import type { Difficulty, NestedTopic, Quest, QuestFormValues, QuestType, Topic } from '../../types/QuestType'; 
import type { OrderItem } from '../../types/OrderType';

// --- Cấu hình API ---
const API_BASE_URL = 'http://localhost:8082/api';
const QUEST_API_URL = `${API_BASE_URL}/quests`;
const TOPIC_API_URL = `${API_BASE_URL}/topics`;
const ORDER_API_URL = `${API_BASE_URL}/content/order/quests`; // API điều chỉnh thứ tự

// --- Constants & Formatting (Giữ nguyên) ---
const QuestTypes = {
    QUIZ: 'quiz' as QuestType,
    PUZZLE: 'puzzle' as QuestType,
};

const Difficulties = {
    EASY: 'easy' as Difficulty,
    MEDIUM: 'medium' as Difficulty,
    HARD: 'hard' as Difficulty,
};

const formatDifficulty = (difficulty: Difficulty) => {
    switch (difficulty) {
        case Difficulties.EASY: return <Tag color="green">Dễ</Tag>; 
        case Difficulties.MEDIUM: return <Tag color="gold">Trung bình</Tag>;
        case Difficulties.HARD: return <Tag color="red" icon={<FireOutlined />}>Khó</Tag>;
        default: return <Tag>{difficulty}</Tag>;
    }
}

const formatQuestType = (type: QuestType) => {
    switch (type) {
        case QuestTypes.QUIZ: return <Tag color="blue">Quiz</Tag>; 
        case QuestTypes.PUZZLE: return <Tag color="purple">Puzzle</Tag>;
        default: return <Tag>{type}</Tag>;
    }
}

// --- DND SETUP ---
const DND_TYPE = 'DraggableQuestRow';


// --- HÀNG KÉO THẢ (DRAGGABLE ROW) ---
interface DraggableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    index: number;
    moveRow: (dragIndex: number, hoverIndex: number) => void;
    // props của Antd Table
    className: string; 
    style: React.CSSProperties;
    'data-handler-id'?: string | undefined; 
}

const DraggableRow: React.FC<DraggableRowProps> = ({ index, moveRow, className, style, ...restProps }) => {
    const ref = React.useRef<HTMLTableRowElement>(null);
    
    const [{ handlerId }, drop] = useDrop<{ index: number; type: string }, unknown, { handlerId: string | symbol | null }>({
        accept: DND_TYPE,
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        hover(item, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

            moveRow(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: DND_TYPE,
        item: () => ({ index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(drop(ref));

    const opacity = isDragging ? 0.2 : 1;

    return (
        <tr
            ref={ref}
            className={className}
            style={{ ...style, cursor: 'grab', opacity }} 
            data-handler-id={handlerId as string | undefined} 
            {...restProps}
        />
    );
};


// --- COMPONENT CHÍNH ---
export default function QuestManager() {
    // --- CRUD STATES ---
    const [quests, setQuests] = useState<Quest[]>([]); // Toàn bộ Quest (Dùng cho CRUD)
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentQuest, setCurrentQuest] = useState<Quest | null>(null);
    const [form] = Form.useForm<QuestFormValues>();

    // --- ORDERING STATES ---
    const [originalQuestsOrder, setOriginalQuestsOrder] = useState<Quest[]>([]); // Thứ tự gốc
    const [questsForOrdering, setQuestsForOrdering] = useState<Quest[]>([]); // Quest đang được DND
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [selectedTopicForOrder, setSelectedTopicForOrder] = useState<number | undefined>(undefined);
    // Loại bỏ useRef(DragContext)

    // --- DATA FETCHING ---
    const fetchTopics = useCallback(async () => {
        try {
            const response = await axios.get<Topic[]>(TOPIC_API_URL);
            setTopics(response.data);
        } catch (error) {
            console.error("Error fetching topics:", error);
            message.error('Không thể tải danh sách Chủ đề cho Form.');
        }
    }, []);
    
    // Tải toàn bộ Quest (sau đó lọc cho DND)
    const fetchQuests = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get<NestedTopic[]>(TOPIC_API_URL);
            const nestedTopics = response.data;

            const flattenedQuests: Quest[] = [];

            nestedTopics.forEach(topic => {
                const simpleTopic: Quest['topic'] = { 
                    topicId: topic.topicId, 
                    topicName: topic.topicName 
                }; 
                
                // Quan trọng: Sắp xếp theo orderIndex từ DB
                const sortedQuests = topic.quests.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

                sortedQuests.forEach(rawQuest => {
                    flattenedQuests.push({
                        ...rawQuest,
                        topic: simpleTopic
                    });
                });
            });

            setQuests(flattenedQuests);

        } catch (error) {
            console.error("Error fetching quests:", error);
            message.error('Không thể tải danh sách Màn chơi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuests();
        fetchTopics();
    }, [fetchQuests, fetchTopics]);
    
    // --- DND FILTERING LOGIC ---
    useEffect(() => {
        if (selectedTopicForOrder && quests.length > 0) {
            // Lọc và Sắp xếp các Quest thuộc Topic đang chọn
            const filtered = quests
                .filter(q => q.topic.topicId === selectedTopicForOrder)
                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)); 

            setQuestsForOrdering(filtered);
            setOriginalQuestsOrder(filtered); // Lưu trạng thái gốc
        } else {
            setQuestsForOrdering([]);
            setOriginalQuestsOrder([]);
        }
    }, [selectedTopicForOrder, quests]);


    // --- DND MOVE LOGIC ---
    const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
        const dragQuest = questsForOrdering[dragIndex];
        const newQuests = [...questsForOrdering];
        
        newQuests.splice(dragIndex, 1);
        newQuests.splice(hoverIndex, 0, dragQuest);

        setQuestsForOrdering(newQuests);
    }, [questsForOrdering]);

    // --- ORDER CHANGE CHECKER ---
    const hasOrderChanged = useMemo(() => {
        if (questsForOrdering.length !== originalQuestsOrder.length) return false;
        for (let i = 0; i < questsForOrdering.length; i++) {
            if (questsForOrdering[i].questId !== originalQuestsOrder[i].questId) {
                return true;
            }
        }
        return false;
    }, [questsForOrdering, originalQuestsOrder]);


    // --- SAVE ORDER LOGIC ---
    const saveOrder = async () => {
        if (!hasOrderChanged) {
            message.info('Thứ tự Quest không thay đổi. Không cần lưu.');
            return;
        }
        
        if (!selectedTopicForOrder) {
            message.error('Vui lòng chọn Chủ đề để lưu thứ tự.');
            return;
        }
        
        setIsSavingOrder(true);
        
        try {
            // Chuẩn bị payload: Map Quest ID với Index mới (bắt đầu từ 1)
            const orderItems: OrderItem[] = questsForOrdering.map((quest, index) => ({
                id: quest.questId,
                orderIndex: index + 1, // Index mới bắt đầu từ 1
            }));
            
            const payload = { items: orderItems };
            
            await axios.put(ORDER_API_URL, payload);

            // Cập nhật orderIndex trong state DND và gốc
            const updatedQuestsForOrdering = questsForOrdering.map((q, index) => ({ ...q, orderIndex: index + 1 }));
            setQuestsForOrdering(updatedQuestsForOrdering);
            setOriginalQuestsOrder(updatedQuestsForOrdering);
            
            // Cập nhật cả state chính 'quests' (dùng cho bảng CRUD)
            setQuests(prevQuests => 
                prevQuests.map(q => {
                    const updatedQ = updatedQuestsForOrdering.find(uQ => uQ.questId === q.questId);
                    return updatedQ ? { ...q, orderIndex: updatedQ.orderIndex } : q;
                })
            );

            message.success('Thứ tự Quest đã được cập nhật trên server!');
        } catch (error) {
            console.error("Error saving quest order:", error);
            message.error('Lỗi: Không thể lưu thứ tự Quest. Kiểm tra kết nối API.');
        } finally {
            setIsSavingOrder(false);
        }
    };
    
    // --- CRUD HANDLERS và COLUMNS (Giữ nguyên) ---
    const handleSave = async (values: QuestFormValues) => {
        setLoading(true);
        try {
            const topicObject = topics.find(t => t.topicId === values.topicId);

            if (!topicObject) {
                message.error('Chủ đề không hợp lệ.');
                setLoading(false);
                return;
            }
            
            const payload = {
                ...values,
                topic: { topicId: topicObject.topicId },
                questions: currentQuest?.questions || [], 
                // Thiết lập orderIndex cho Quest mới 
                orderIndex: isEditing ? currentQuest?.orderIndex : (
                    Math.max(...quests.filter(q => q.topic.topicId === values.topicId).map(q => q.orderIndex || 0), 0) + 1
                ),
            };

            if (isEditing && currentQuest) {
                await axios.put(`${QUEST_API_URL}/${currentQuest.questId}`, {
                    ...payload,
                    questId: currentQuest.questId 
                });
                message.success(`Màn chơi "${values.questName}" đã được cập nhật.`);
            } else {
                await axios.post(QUEST_API_URL, payload);
                message.success(`Màn chơi "${values.questName}" đã được tạo mới.`);
            }
            
            form.resetFields();
            setIsModalOpen(false);
            setCurrentQuest(null);
            await fetchQuests(); 
        } catch (error) {
            console.error("Error saving quest:", error);
            message.error('Lỗi: Không thể lưu Màn chơi. Kiểm tra kết nối API.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (questId: number) => {
        setLoading(true);
        try {
            await axios.delete(`${QUEST_API_URL}/${questId}`);
            message.success('Màn chơi đã được xóa thành công.');
            await fetchQuests();
        } catch (error) {
            console.error("Error deleting quest:", error);
            message.error('Lỗi khi xóa Màn chơi. Không tìm thấy ID hoặc lỗi server.');
        } finally {
            setLoading(false);
        }
    };

    const showCreateModal = () => {
        setIsEditing(false);
        setCurrentQuest(null);
        form.resetFields();
        form.setFieldsValue({
            questType: QuestTypes.QUIZ, 
            difficulty: Difficulties.EASY, 
            requiredXp: 100
        });
        setIsModalOpen(true);
    };

    const showEditModal = (quest: Quest) => {
        setIsEditing(true);
        setCurrentQuest(quest);
        form.setFieldsValue({
            questName: quest.questName,
            questType: quest.questType,
            difficulty: quest.difficulty,
            requiredXp: quest.requiredXp,
            topicId: quest.topic.topicId, 
        });
        setIsModalOpen(true);
    };

    // --- CRUD COLUMNS ---
    const columns: ColumnsType<Quest> = [
        {
            title: "Thứ tự (DB)",
            dataIndex: 'orderIndex',
            key: 'orderIndex',
            width: 120,
            align: 'center',
            sorter: (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0),
            render: (orderIndex: number) => <Tag color="geekblue">{orderIndex}</Tag>
        },
        {
            title: 'ID',
            dataIndex: 'questId',
            key: 'questId',
            width: 80,
            sorter: (a, b) => a.questId - b.questId,
        },
        {
            title: 'Tên Màn chơi',
            dataIndex: 'questName',
            key: 'questName',
            width: 250,
        },
        {
            title: 'Chủ đề',
            dataIndex: ['topic', 'topicName'],
            key: 'topicName',
            width: 150,
            render: (text: string) => <Tag color="cyan">{text}</Tag>
        },
        {
            title: 'Loại',
            dataIndex: 'questType',
            key: 'questType',
            width: 100,
            render: (type: QuestType) => formatQuestType(type)
        },
        {
            title: 'Độ khó',
            dataIndex: 'difficulty',
            key: 'difficulty',
            width: 120,
            render: (difficulty: Difficulty) => formatDifficulty(difficulty),
            responsive: ['sm'],
        },
        {
            title: 'XP Yêu cầu',
            dataIndex: 'requiredXp',
            key: 'requiredXp',
            width: 100,
            sorter: (a, b) => a.requiredXp - b.requiredXp,
            responsive: ['md'],
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 150,
            render: (_: any, record: Quest) => (
                <Space size="middle">
                    <Button 
                        icon={<EditOutlined />} 
                        onClick={() => showEditModal(record)}
                        className="text-blue-500 hover:text-blue-700 border-none shadow-none"
                    />
                    <Popconfirm
                        title="Xóa Màn chơi"
                        description={`Bạn chắc chắn muốn xóa màn chơi: ${record.questName}?`}
                        onConfirm={() => handleDelete(record.questId)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button 
                            icon={<DeleteOutlined />} 
                            danger
                            className="text-red-500 hover:text-red-700 border-none shadow-none"
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // --- DND COLUMNS ---
    const orderColumns: ColumnsType<Quest> = [
        {
            title: <MenuOutlined className="text-lg text-gray-500" />,
            dataIndex: 'sort',
            width: 50,
            className: 'drag-visible',
            render: () => <MenuOutlined className="cursor-grab text-xl text-indigo-500 hover:text-indigo-700 transition" />,
        },
        {
            title: "Thứ tự",
            dataIndex: 'newOrderIndex',
            key: 'newOrderIndex',
            width: 120,
            align: 'center',
            render: (_, __, index) => (
                <Tag color="blue" className="text-lg font-bold p-1 min-w-[30px] shadow-md">
                    {index + 1}
                </Tag>
            )
        },
        {
            title: 'Tên Màn chơi',
            dataIndex: 'questName',
            key: 'questName',
            width: 250,
        },
        {
            title: 'Chủ đề',
            dataIndex: ['topic', 'topicName'],
            key: 'topicName',
            width: 150,
            render: (text: string) => <Tag color="cyan">{text}</Tag>
        },
        {
            title: 'Độ khó',
            dataIndex: 'difficulty',
            key: 'difficulty',
            width: 120,
            render: (difficulty: Difficulty) => formatDifficulty(difficulty),
        },
    ];

    // Cấu hình component của Table để tích hợp kéo thả
    const components = {
        body: {
            row: DraggableRow,
        },
    };

    // --- RENDER ---
    return (
        // Chỉ sử dụng DndProvider với Backend
        <DndProvider backend={HTML5Backend}> 
            {/* --- 1. Bảng Quản Lý CRUD --- */}
            <Card 
                title={
                    <Space className="w-full justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800">
                            <TrophyOutlined className="mr-2 text-yellow-600" /> Quản Lý Màn chơi (Quest)
                        </h2>
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />} 
                            onClick={showCreateModal}
                            className="bg-green-500 hover:bg-green-600 rounded-lg shadow-md"
                        >
                            Thêm Quest Mới
                        </Button>
                    </Space>
                }
                variant="outlined"
                className="rounded-xl shadow-lg mb-8" 
            >
                <Spin spinning={loading} style={{ width: '100%' }}>
                    <Table
                        columns={columns}
                        dataSource={quests}
                        rowKey="questId"
                        pagination={{ pageSize: 10 }}
                        className="overflow-x-auto" 
                        scroll={{ x: 'max-content' }}
                    />
                </Spin>
            </Card>

            {/* --- 2. Khu vực Sắp xếp Thứ tự --- */}
            <Card
                title={
                    <h2 className="text-xl font-semibold text-gray-800">
                        <SortAscendingOutlined className="mr-2 text-indigo-600" /> Điều Chỉnh Thứ Tự Quest theo Chủ đề
                    </h2>
                }
                variant="outlined"
                className="rounded-xl shadow-lg border-t-4 border-indigo-600"
            >
                <Spin spinning={loading || isSavingOrder} style={{ width: '100%' }}>
                    <Space direction="vertical" size="middle" className="w-full">
                        <Alert
                            message="Hướng dẫn Sắp xếp"
                            description="Chọn Chủ đề để tải Quest. Kéo thả hàng trong bảng để thay đổi thứ tự. Nhấn 'Lưu Thứ Tự' để cập nhật lên Server."
                            type="info"
                            showIcon
                        />
                        
                        <Space size="large" className="w-full justify-between items-center">
                            {/* Topic Selector for Ordering */}
                            <Space>
                                <label className="font-semibold text-gray-700">Chọn Chủ đề:</label>
                                <Select
                                    placeholder="Chọn Chủ đề"
                                    style={{ width: 300 }}
                                    value={selectedTopicForOrder}
                                    onChange={setSelectedTopicForOrder}
                                    loading={topics.length === 0 && !loading}
                                >
                                    {topics.map(topic => (
                                        <Select.Option key={topic.topicId} value={topic.topicId}>
                                            {topic.topicName}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Space>
                            
                            {/* Save Button and Status */}
                            <Space>
                                {hasOrderChanged && (
                                    <Tooltip title="Thứ tự đã thay đổi, cần lưu lại!">
                                        <Tag icon={<ExclamationCircleOutlined />} color="warning" className="font-bold text-lg">
                                            CHƯA LƯU
                                        </Tag>
                                    </Tooltip>
                                )}
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    onClick={saveOrder}
                                    loading={isSavingOrder}
                                    disabled={!hasOrderChanged || questsForOrdering.length === 0 || loading || !selectedTopicForOrder}
                                    className="bg-green-600 hover:!bg-green-700 transition duration-200"
                                >
                                    Lưu Thứ Tự Mới
                                </Button>
                            </Space>
                        </Space>

                        <Table
                            columns={orderColumns}
                            dataSource={questsForOrdering}
                            rowKey="questId"
                            loading={loading || isSavingOrder}
                            components={components}
                            onRow={(record, index) => ({
                                index: index!,
                                moveRow: moveRow,
                                className: '', 
                                style: {}
                            } as DraggableRowProps)}
                            pagination={false}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: selectedTopicForOrder ? "Chủ đề này chưa có Quest nào." : "Vui lòng chọn một Chủ đề để sắp xếp." }}
                            className="draggable-table"
                        />
                    </Space>
                </Spin>
            </Card>

            {/* --- Modal CRUD (Giữ nguyên) --- */}
            <Modal
                title={isEditing ? `Chỉnh sửa Quest: ${currentQuest?.questName}` : 'Tạo Quest Mới'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null} 
                destroyOnHidden={true}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    initialValues={{ 
                        requiredXp: 100, 
                        ...currentQuest, 
                        topicId: currentQuest?.topic?.topicId, 
                        questType: currentQuest?.questType || QuestTypes.QUIZ, 
                        difficulty: currentQuest?.difficulty || Difficulties.EASY 
                    }}
                    className="mt-4"
                >
                    <Form.Item
                        name="questName"
                        label="Tên Màn chơi"
                        rules={[{ required: true, message: 'Vui lòng nhập tên màn chơi!' }]}
                    >
                        <Input placeholder="Ví dụ: Giới thiệu về Lịch sử Việt Nam" />
                    </Form.Item>

                    <Form.Item
                        name="topicId"
                        label="Chủ đề (Topic)"
                        rules={[{ required: true, message: 'Vui lòng chọn chủ đề liên quan!' }]}
                    >
                        <Select
                            placeholder="Chọn một chủ đề"
                            loading={topics.length === 0 && !loading}
                        >
                            {topics.map(topic => (
                                <Select.Option key={topic.topicId} value={topic.topicId}>
                                    {topic.topicName}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Space size="large" className="w-full">
                        <Form.Item
                            name="questType"
                            label="Loại Quest"
                            rules={[{ required: true, message: 'Vui lòng chọn loại Quest!' }]}
                            className="w-1/2"
                        >
                            <Select className='min-w-30'>
                                <Select.Option value={QuestTypes.QUIZ}>Quiz</Select.Option>
                                <Select.Option value={QuestTypes.PUZZLE}>Puzzle</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="difficulty"
                            label="Độ Khó"
                            rules={[{ required: true, message: 'Vui lòng chọn độ khó!' }]}
                            className="w-1/2"
                        >
                            <Select className='min-w-30'>
                                <Select.Option value={Difficulties.EASY}>Dễ</Select.Option> 
                                <Select.Option value={Difficulties.MEDIUM}>Trung bình</Select.Option>
                                <Select.Option value={Difficulties.HARD}>Khó</Select.Option>
                            </Select>
                        </Form.Item>
                    </Space>

                    <Form.Item
                        name="requiredXp"
                        label="XP Yêu cầu (Required XP)"
                        rules={[{ required: true, message: 'Vui lòng nhập XP yêu cầu!' }]}
                    >
                        <InputNumber min={0} className="w-full" placeholder="Ví dụ: 100" />
                    </Form.Item>

                    <Form.Item className="mt-6">
                        <Space>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                loading={loading}
                                className="bg-green-500 hover:bg-green-600 rounded-lg shadow-md"
                            >
                                {isEditing ? 'Cập nhật Quest' : 'Tạo Quest Mới'}
                            </Button>
                            <Button onClick={() => setIsModalOpen(false)}>
                                Hủy
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </DndProvider>
    );
}