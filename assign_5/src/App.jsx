import { lazy, Suspense } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import RootLayout from "./components/RootLayout.jsx";
import RequestState from "./components/RequestState.jsx";
const Home = lazy(() => import("./pages/Home.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Tasks = lazy(() => import("./pages/Tasks.jsx"));
const TaskDetails = lazy(() => import("./pages/TaskDetails.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<RequestState loading />}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/:id" element={<TaskDetails />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
