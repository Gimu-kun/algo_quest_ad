import React, { useState, useEffect, useCallback } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    message,
    Popconfirm,
    Card,
    Space,
    Tag,
    Select,
    Spin,
    Row,
    Col,
    Avatar,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';
import type { User, UserCreateFormValues, UserUpdateFormValues, UserRole } from '../../types/UserType.ts'; // Import types từ file mới

// Cấu hình URL API (thay thế bằng URL thực tế của bạn)
const API_BASE_URL = 'http://localhost:8081/api/users'; 

// --- COLUMNS CONFIG ---
const columns: ColumnsType<User> = [
    {
        title: 'ID',
        dataIndex: 'userId',
        key: 'userId',
        width: 80,
    },
    {
        title: 'Người dùng',
        key: 'userInfo',
        render: (_, record) => (
            <Space>
                <Avatar src={record.avatar || undefined} icon={<UserOutlined />} />
                <div>
                    <div className="font-semibold text-gray-800">{record.username}</div>
                    <div className="text-sm text-gray-500">{record.email}</div>
                </div>
            </Space>
        ),
        sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
        title: 'Vai trò',
        dataIndex: 'role',
        key: 'role',
        width: 120,
        render: (role: UserRole) => (
            <Tag color={role === 'admin' ? 'red' : 'green'} className="uppercase">
                {role}
            </Tag>
        ),
        filters: [
            { text: 'Admin', value: 'admin' },
            { text: 'Player', value: 'player' },
        ],
        onFilter: (value, record) => record.role === value,
    },
    {
        title: 'Họ Tên',
        dataIndex: 'fullName',
        key: 'fullName',
        responsive: ['md'],
    },
    {
        title: 'Tham gia',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN'),
        responsive: ['lg'],
    },
];

// --- MAIN COMPONENT ---
const UserManager: React.FC = () => {
    const [form] = Form.useForm();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // --- API & DATA FETCHING ---
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            // API GET /api/users
            const response = await axios.get<User[]>(API_BASE_URL); 
            setUsers(response.data);
        } catch (error) {
            message.error('Lỗi khi tải danh sách người dùng!');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);


    // --- CRUD HANDLERS ---
    const handleSave = async (values: UserCreateFormValues | UserUpdateFormValues) => {
        setLoading(true);
        try {
            if (isEditing && currentUserId) {
                // UPDATE: PUT /api/users/{id}
                await axios.put(`${API_BASE_URL}/${currentUserId}`, values);
                message.success('Cập nhật người dùng thành công!');
            } else {
                // CREATE: POST /api/users
                // Trong UserCreateFormValues, passwordHash là tên field cho password
                const createData = { ...values, passwordHash: (values as UserCreateFormValues).passwordHash };
                await axios.post(API_BASE_URL, createData);
                message.success('Tạo người dùng mới thành công!');
            }
            setIsModalOpen(false);
            fetchUsers(); // Tải lại danh sách
        } catch (error: any) {
            // Xử lý lỗi cụ thể từ server (ví dụ: username đã tồn tại)
            const errorMessage = error.response?.data?.message || (isEditing ? 'Lỗi khi cập nhật!' : 'Lỗi khi tạo mới!');
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        setLoading(true);
        try {
            // DELETE: DELETE /api/users/{id}
            await axios.delete(`${API_BASE_URL}/${id}`);
            message.success('Xóa người dùng thành công!');
            fetchUsers();
        } catch (error) {
            message.error('Lỗi khi xóa người dùng!');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };


    // --- UI HANDLERS ---
    const showCreateModal = () => {
        form.resetFields();
        setIsEditing(false);
        setCurrentUserId(null);
        // Thiết lập giá trị mặc định cho form tạo mới
        form.setFieldsValue({
            role: 'player', 
            passwordHash: '',
            email: '',
            fullName: '',
            username: '',
        });
        setIsModalOpen(true);
    };

    const showEditModal = (user: User) => {
        setIsEditing(true);
        setCurrentUserId(user.userId);
        form.resetFields();
        
        // Gán giá trị vào Form (Không gán password)
        form.setFieldsValue({
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            // Không set passwordHash/password để không bị gửi lên nếu người dùng không đổi
        });
        setIsModalOpen(true);
    };

    // --- ACTION COLUMN ---
    const actionColumn: ColumnsType<User>[0] = {
        title: 'Thao tác',
        key: 'action',
        width: 150,
        render: (_, record) => (
            <Space size="small">
                <Button 
                    icon={<EditOutlined />} 
                    onClick={() => showEditModal(record)}
                    className="text-blue-500 hover:text-blue-700"
                />
                <Popconfirm
                    title="Xóa Người dùng"
                    description={`Bạn có chắc muốn xóa người dùng "${record.username}"?`}
                    onConfirm={() => handleDelete(record.userId)}
                    okText="Xóa"
                    cancelText="Hủy"
                    icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                >
                    <Button 
                        icon={<DeleteOutlined />} 
                        danger 
                        className="hover:bg-red-500"
                    />
                </Popconfirm>
            </Space>
        ),
    };

    return (
        <Card 
            title="Quản Lý Người Dùng" 
            extra={
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={showCreateModal}
                    className="bg-green-500 hover:bg-green-600 rounded-lg shadow-md"
                >
                    Thêm Người Dùng
                </Button>
            }
            className="shadow-lg rounded-xl"
        >
            <Table
                columns={[...columns, actionColumn]} // Thêm cột Thao tác vào cuối
                dataSource={users}
                rowKey="userId"
                loading={loading}
                pagination={{ pageSize: 10 }}
                className="w-full"
                scroll={{ x: 800 }} // Cho phép cuộn ngang trên màn hình nhỏ
            />

            {/* --- CREATE/EDIT MODAL --- */}
            <Modal
                title={isEditing ? 'Cập nhật Người dùng' : 'Tạo Người dùng Mới'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                maskClosable={!loading}
            >
                <Spin spinning={loading}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSave}
                        initialValues={{ role: 'player' }}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="username"
                                    label="Tên đăng nhập"
                                    rules={[{ required: !isEditing, message: 'Vui lòng nhập tên đăng nhập!' }]}
                                >
                                    <Input 
                                        placeholder="Tên đăng nhập" 
                                        disabled={isEditing} // Không cho phép đổi username khi Edit
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name={isEditing ? 'password' : 'passwordHash'} // Dùng passwordHash cho Create, password cho Edit
                                    label={isEditing ? 'Mật khẩu mới (Bỏ qua nếu không đổi)' : 'Mật khẩu'}
                                    rules={[{ required: !isEditing, message: 'Vui lòng nhập mật khẩu!' }]}
                                    hasFeedback
                                >
                                    <Input.Password 
                                        placeholder={isEditing ? '******' : 'Nhập mật khẩu'} 
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        
                        <Form.Item
                            name="fullName"
                            label="Họ và Tên"
                            rules={[{ required: true, message: 'Vui lòng nhập Họ và Tên!' }]}
                        >
                            <Input placeholder="Nguyễn Văn A" />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="email"
                                    label="Email"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập Email!' },
                                        { type: 'email', message: 'Email không hợp lệ!' }
                                    ]}
                                >
                                    <Input placeholder="user@example.com" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="role"
                                    label="Vai trò"
                                    rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
                                >
                                    <Select placeholder="Chọn vai trò">
                                        <Select.Option value="player">Player</Select.Option>
                                        <Select.Option value="admin">Admin</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                        
                        <Form.Item name="avatar" label="URL Avatar (Tùy chọn)">
                            <Input placeholder="http://..." />
                        </Form.Item>

                        <Form.Item className="mt-4">
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
                </Spin>
            </Modal>
        </Card>
    );
};

export default UserManager;