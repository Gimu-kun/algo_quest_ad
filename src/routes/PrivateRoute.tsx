import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "../pages/Auth/Auth";
import AuthLayout from "../components/layout/AuthLayout/AuthLayout";
import MainLayout from "../components/layout/MainLayout/MainLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import TopicManager from "../pages/Topic/TopicManager";
import QuestManager from "../pages/Quest/QuestManager";
import QuestionManager from "../pages/Question/QuestionManager";
import UserManager from "../pages/User/UserManager";
import UserProgressDashboard from "../pages/UserProgress/UserProgress";
import Battle from "../pages/Battle/Battle";
import Ratings from "../pages/Rating/Ratings";

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
      path: "",
      element: <MainLayout />,
      children: [
        {
          path: "/admin/dashboard",
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
        },
        {
          path: "/admin/users",
          element: <UserManager />,
        },
        {
          path: "/admin/progress",
          element: <UserProgressDashboard />,
        },
        {
          path: "/admin/battles",
          element: <Battle />,
        },
        {
          path: "/admin/ratings",
          element: <Ratings />,
        }
      ],
    }
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}