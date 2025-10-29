import { Flex } from 'antd'
import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <Flex className="h-screen w-full justify-center items-center" gap="middle">
        <Flex vertical className="w-full max-w-1/4 justify-center items-center text-center">
            <h2 style={{marginBottom:"20px"}} className="text-4xl font-bold">Welcome to AlgoQuest Admin</h2>
            <Outlet />
        </Flex>
    </Flex>
  )
}
