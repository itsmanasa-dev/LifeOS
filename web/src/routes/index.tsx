import { createBrowserRouter, Navigate } from 'react-router-dom';
import Splash from '../pages/Splash';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import MainShell from '../layouts/MainShell';
import Dashboard from '../pages/Dashboard';
import CollegeHub from '../pages/CollegeHub';
import TimetablePreview from '../pages/TimetablePreview';
import SubjectDetail from '../pages/SubjectDetail';
import Planner from '../pages/Planner';
import StudyTracker from '../pages/StudyTracker';
import Settings from '../pages/Settings';
import { ProtectedRoute, PublicRoute } from '../components/AuthGuard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/splash',
    element: <Splash />,
  },
  // Publicly accessible Auth Routes (will redirect to /dashboard if logged in)
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },
    ],
  },
  // Protected workspace routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainShell />,
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'college',
            element: <CollegeHub />,
          },
          {
            path: 'college/import-preview',
            element: <TimetablePreview />,
          },
          {
            path: 'college/subject/:id',
            element: <SubjectDetail />,
          },
          {
            path: 'planner',
            element: <Planner />,
          },
          {
            path: 'govexam',
            element: <StudyTracker />,
          },
          {
            path: 'settings',
            element: <Settings />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-extrabold text-white mb-2">404</h1>
        <p className="text-dark-text-secondary mb-6">Page not found</p>
        <a href="/login" className="bg-primary text-white py-2.5 px-6 rounded-xl font-bold">
          Go back to Login
        </a>
      </div>
    ),
  },
]);
