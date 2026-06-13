import Achievements from './pages/Achievements';
import Chat from './pages/Chat';
import CourseDetail from './pages/CourseDetail';
import Courses from './pages/Courses';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import Transactions from './pages/Transactions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Achievements": Achievements,
    "Chat": Chat,
    "CourseDetail": CourseDetail,
    "Courses": Courses,
    "Dashboard": Dashboard,
    "Goals": Goals,
    "Settings": Settings,
    "Statistics": Statistics,
    "Transactions": Transactions,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};