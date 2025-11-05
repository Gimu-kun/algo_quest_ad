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
    Spin
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';

interface Topic {
    topicId: number;
    topicName: string;
    description: string;
    orderIndex: number;
}

interface TopicFormValues {
    topicName: string;
    description: string;
    orderIndex: number;
}

interface TopicUpdateDto {
    topicName?: string;
    description?: string;
    orderIndex?: number;
}


const API_URL = 'http://localhost:8082/api/topics';

export default function TopicManager() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
    const [form] = Form.useForm<TopicFormValues>();


    const fetchTopics = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get<Topic[]>(API_URL);
            const sortedTopics = response.data.sort((a, b) => a.orderIndex - b.orderIndex);
            setTopics(sortedTopics);
        } catch (error) {
            console.error("Error fetching topics:", error);
            message.error('Không thể tải danh sách chủ đề.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    const handleSave = async (values: TopicFormValues) => {
        setLoading(true);
        try {
            if (isEditing && currentTopic) {
                const updateDto: TopicUpdateDto = {
                    topicName: values.topicName,
                    description: values.description,
                    orderIndex: values.orderIndex,
                };
                
                await axios.put(`${API_URL}/${currentTopic.topicId}`, updateDto);
                message.success(`Chủ đề "${values.topicName}" đã được cập nhật.`);
            } else {
                await axios.post(API_URL, values);
                message.success(`Chủ đề "${values.topicName}" đã được tạo mới.`);
            }
            
            form.resetFields();
            setIsModalOpen(false);
            setCurrentTopic(null);
            await fetchTopics();

        } catch (error) {
            const errorMessage = axios.isAxiosError(error) && error.response?.status === 409
                ? 'Lỗi: Tên chủ đề đã tồn tại.'
                : 'Lỗi: Không thể lưu chủ đề. Vui lòng kiểm tra lại.';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (topicId: number) => {
        setLoading(true);
        try {
            await axios.delete(`${API_URL}/${topicId}`);
            message.success('Chủ đề đã được xóa thành công.');
            await fetchTopics();
        } catch (error) {
            console.error("Error deleting topic:", error);
            message.error('Lỗi khi xóa chủ đề. Không tìm thấy ID hoặc lỗi server.');
        } finally {
            setLoading(false);
        }
    };

    const showCreateModal = () => {
        setIsEditing(false);
        setCurrentTopic(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const showEditModal = (topic: Topic) => {
        setIsEditing(true);
        setCurrentTopic(topic);
        form.setFieldsValue({
            topicName: topic.topicName,
            description: topic.description,
            orderIndex: topic.orderIndex,
        });
        setIsModalOpen(true);
    };

    const columns:ColumnsType<Topic> = [
        {
            title: 'ID',
            dataIndex: 'topicId',
            key: 'topicId',
            width: 80,
            sorter: (a: Topic, b: Topic) => a.topicId - b.topicId,
        },
        {
            title: 'Tên Chủ đề',
            dataIndex: 'topicName',
            key: 'topicName',
            width: 200,
            render: (text: string) => (
                <Space>
                    <Tag icon={<BookOutlined />} color="blue">{text}</Tag>
                </Space>
            )
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            className: 'max-w-xs truncate',
            responsive: ['md'],
        },
        {
            title: 'Thứ tự',
            dataIndex: 'orderIndex',
            key: 'orderIndex',
            width: 100,
            sorter: (a: Topic, b: Topic) => a.orderIndex - b.orderIndex,
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 150,
            render: (_: any, record: Topic) => (
                <Space size="middle">
                    <Button 
                        icon={<EditOutlined />} 
                        onClick={() => showEditModal(record)}
                        className="text-blue-500 hover:text-blue-700 border-none shadow-none"
                    />
                    <Popconfirm
                        title="Xóa Chủ đề"
                        description={`Bạn chắc chắn muốn xóa chủ đề: ${record.topicName}?`}
                        onConfirm={() => handleDelete(record.topicId)}
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
                        <BookOutlined className="mr-2 text-blue-500" /> Quản Lý Chủ đề
                    </h2>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={showCreateModal}
                        className="bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md"
                    >
                        Thêm Chủ đề Mới
                    </Button>
                </Space>
            }
            bordered={false}
            className="rounded-xl shadow-lg"
        >
            <Spin spinning={loading} tip="Đang tải dữ liệu...">
                <Table
                    columns={columns}
                    dataSource={topics}
                    rowKey="topicId"
                    pagination={{ pageSize: 10 }}
                    className="overflow-x-auto" 
                    scroll={{ x: 'max-content' }}
                />
            </Spin>

            <Modal
                title={isEditing ? `Chỉnh sửa Chủ đề: ${currentTopic?.topicName}` : 'Tạo Chủ đề Mới'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnClose={true}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    initialValues={currentTopic || { orderIndex: topics.length + 1 }}
                    className="mt-4"
                >
                    <Form.Item
                        name="topicName"
                        label="Tên Chủ đề"
                        rules={[{ required: true, message: 'Vui lòng nhập tên chủ đề!' }]}
                    >
                        <Input placeholder="Ví dụ: Lịch sử Chiến tranh Việt Nam" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Mô tả"
                        rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
                    >
                        <Input.TextArea rows={4} placeholder="Mô tả ngắn gọn về nội dung chủ đề..." />
                    </Form.Item>

                    <Form.Item
                        name="orderIndex"
                        label="Thứ tự hiển thị"
                        rules={[{ required: true, message: 'Vui lòng nhập thứ tự hiển thị!' }]}
                        className="w-1/2"
                    >
                        <InputNumber min={1} className="w-full" placeholder="Thứ tự (Index)" />
                    </Form.Item>

                    <Form.Item className="mt-6">
                        <Space>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                loading={loading}
                                className="bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md"
                            >
                                {isEditing ? 'Cập nhật' : 'Tạo mới'}
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
