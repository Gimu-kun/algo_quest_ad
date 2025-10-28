import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "../pages/Auth/Auth";
import AuthLayout from "../components/layout/AuthLayout/AuthLayout";

const router = createBrowserRouter([
    {
      path: "/auth",
      element: <AuthLayout />,
      children: [
        {
          path: "",
          element: <Auth />,
        }
      ],
    }
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}