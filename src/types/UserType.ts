// Tương ứng với com.example.demo.Enums.UserRoleEnum
type UserRole = 'player' | 'admin';

interface User {
    userId: number;
    username: string;
    email: string | null;
    fullName: string | null;
    avatar: string | null;
    role: UserRole;
    createdAt: string; // Tương ứng với LocalDateTime
    // userProgress và các mối quan hệ khác có thể bỏ qua nếu không cần hiển thị
}

// DTO cho Form Tạo Mới (Tương ứng với request body trong createUser)
interface UserCreateFormValues {
    username: string;
    passwordHash: string; // Đặt tên là passwordHash để khớp với Entity, nhưng thực tế là password
    email: string;
    fullName: string;
    role: UserRole;
    avatar?: string;
}

// DTO cho Form Cập Nhật (Không cần passwordHash trừ khi muốn đổi password)
interface UserUpdateFormValues {
    fullName: string;
    email: string;
    avatar?: string;
    role: UserRole;
    password?: string; // Tùy chọn: để đổi mật khẩu
}

export type { User, UserRole, UserCreateFormValues, UserUpdateFormValues };