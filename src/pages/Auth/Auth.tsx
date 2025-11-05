import './auth.css';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';

interface LoginResponse {
  user: any; 
  token: string;
}



const Auth = () => {

  const navigate = useNavigate();

  
  const onFinish = async (values: any) => {
    const payload = {
      username: values.username,
      password: values.password,
    };

    try {
      const response = await axios.post<LoginResponse>(
        'http://localhost:8082/api/users/login',
        payload
      );

      const { token, user } = response.data;
      Cookies.set('authToken', token, { expires: 7, secure: true, sameSite: 'Strict' });
      localStorage.setItem('currentUser', JSON.stringify(user));
      message.success('Đăng nhập thành công!');
      navigate('/');
    } catch (error) {
      let errorMessage = 'Đã xảy ra lỗi không xác định.';

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Tên đăng nhập hoặc mật khẩu không chính xác.';
        } else {
          errorMessage = `Lỗi máy chủ: ${error.response.status}`;
        }
      }
      
      console.error("Login Error:", error);
      message.error(errorMessage);
    }
  };

  return (
    <Form
    id='auth_fm'
      name="normal_login"
      className="flex flex-col w-full"
      initialValues={{
        remember: true,
      }}
      onFinish={onFinish}
      size="large"
    >
      <Form.Item
        name="username"
        rules={[
          {
            required: true,
            message: 'Please input your Username!',
          },
        ]}
      >
        <Input size="large" prefix={<UserOutlined className="site-form-item-icon" />} placeholder="Username" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[
          {
            required: true,
            message: 'Please input your Password!',
          },
        ]}
      >
        <Input
          prefix={<LockOutlined className="site-form-item-icon" />}
          type="password"
          placeholder="Password"
          size="large"
        />
      </Form.Item>
      <Form.Item className='flex justify-evenly'>
        <Form.Item name="remember" valuePropName="checked" noStyle>
          <Checkbox>Remember me</Checkbox>
        </Form.Item>

        <a className="float-right" href="">
          Forgot password
        </a>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" className="w-full ">
          Log in
        </Button>
      </Form.Item>
    </Form>
  );
};

export default Auth;
