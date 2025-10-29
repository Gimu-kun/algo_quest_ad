import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "../pages/Auth/Auth";
import AuthLayout from "../components/layout/AuthLayout/AuthLayout";
import MainLayout from "../components/layout/MainLayout/MainLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import TopicManager from "../pages/Topic/TopicManager";
import QuestManager from "../pages/Quest/QuestManager";
import QuestionManager from "../pages/Question/QuestionManager";

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
    },
    {
      path: "/",
      element: <MainLayout />,
      children: [
        {
          path: "",
          element: <Dashboard />,
        },
        {
          path: "/admin/topics",
          element: <TopicManager />,
        },
        {
          path: "/admin/quests",
          element: <QuestManager />,
        },
        {
          path: "/admin/questions",
          element: <QuestionManager />,
        }
      ],
    }
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}