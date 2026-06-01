import Header from "../components/UI/Header";
import { useRole } from "../hooks/useRole";
import TeacherDashboard from "../components/teacher-dash-components/TeacherDashboard";
import ExamineeDashboard from "../components/examinee-dash-components/ExamineeDashboard";
import ExpertDashboard from "../components/expert-dash-components/ExpertDashboard";

function Dashboard() {
    const { isTeacher, isExpert, isExaminee } = useRole();

    return (
        <div className="w-screen h-screen bg-gray-700 flex flex-col text-gray-100">
            <Header />
            <main className="flex-1 overflow-y-auto">
                {isTeacher && <TeacherDashboard/>}
                {isExpert && <ExpertDashboard />}
                {isExaminee && <ExamineeDashboard/>}
            </main>
        </div>
    );
}

export default Dashboard