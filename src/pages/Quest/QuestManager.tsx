import { useState, useEffect, useCallback } from 'react';
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
    Spin
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TrophyOutlined, FireOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';
import type { Difficulty, NestedTopic, Quest, QuestFormValues, QuestType, Topic } from '../../types/QuestType';

const API_URL = 'http://localhost:8081/api/quests';
const TOPIC_API_URL = 'http://localhost:8081/api/topics';

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

export default function QuestManager() {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentQuest, setCurrentQuest] = useState<Quest | null>(null);
    const [form] = Form.useForm<QuestFormValues>();

    const fetchTopics = useCallback(async () => {
        try {
            const response = await axios.get<Topic[]>(TOPIC_API_URL);
            setTopics(response.data);
        } catch (error) {
            console.error("Error fetching topics:", error);
            message.error('Không thể tải danh sách Chủ đề cho Form.');
        }
    }, []);
    
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
                
                topic.quests.forEach(rawQuest => {
                    flattenedQuests.push({
                        ...rawQuest,
                        topic: simpleTopic
                    });
                });
            });

            setQuests(flattenedQuests);

        } catch (error) {
            console.error("Error fetching quests:", error);
            message.error('Không thể tải danh sách Màn chơi (Lỗi khi làm phẳng dữ liệu).');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuests();
        fetchTopics();
    }, [fetchQuests, fetchTopics]);

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
            };

            if (isEditing && currentQuest) {
                await axios.put(`${API_URL}/${currentQuest.questId}`, {
                    ...payload,
                    questId: currentQuest.questId 
                });
                message.success(`Màn chơi "${values.questName}" đã được cập nhật.`);
            } else {
                await axios.post(API_URL, payload);
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
            await axios.delete(`${API_URL}/${questId}`);
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

    const columns: ColumnsType<Quest> = [
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

    return (
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
            className="rounded-xl shadow-lg"
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
        </Card>
    );
}
