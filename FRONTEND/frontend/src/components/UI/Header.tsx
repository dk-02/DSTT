import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useRole } from "../../hooks/useRole";
import { NotificationDropdown } from "./NotificationDropdown";

function Header() {
    const location = useLocation();
    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);
    const { isAdmin, isTeacher, isExpert } = useRole();

    const isHome = location.pathname === "/";
    const isDashboard = location.pathname === "/user/dashboard";
    const isAdminDashboard = location.pathname === "/admin/dashboard";

    const HeaderButtons = [
        {
            name: "O nama",
            navigateTo: "/about"
        },
        {
            name: "Kontakt",
            navigateTo: "/contact"
        }
    ]

    return (
        <div className={"h-18 w-full bg-gray-800 flex justify-between items-center"}>
            <div onClick={() => navigate("/")} className="flex justify-center items-center p-5 hover:cursor-pointer">
                <p className="text-gray-100 text-4xl font-semibold">DS<span className="text-orange-500">TT</span></p>
            </div>           

            <div className="w-1/2 h-2/3 flex gap-5 text-gray-100 justify-end px-5 mr-3">
                {isHome && HeaderButtons.map((button, idx) => (
                    <div key={idx} className="flex w-1/5 justify-center items-center">
                        <div onClick={() => navigate(button.navigateTo)} className="relative group cursor-pointer flex justify-center items-center">
                            <span>{button.name}</span>
                            <span className="absolute left-0 -bottom-1 h-0.5 bg-gray-200 w-0 transition-all duration-250 group-hover:w-full"></span>
                        </div>
                    </div>
                ))}                

                {user ?
                    <div className="flex gap-5 items-center">
                        {isAdmin && !isAdminDashboard && 
                            <button onClick={() => navigate("/admin/dashboard")} className="h-full cursor-pointer border border-gray-600 font-semibold px-3 rounded">Admin dash</button>
                        } 
                        {!isDashboard && 
                            <button onClick={() => navigate("/user/dashboard")} className="h-full cursor-pointer border border-gray-600 font-semibold px-3 rounded">Dashboard</button>
                        }
                         
                        {(isTeacher || isExpert) && <NotificationDropdown />}
                        
                        <div onClick={() => navigate("/user/profile")} className="hover:bg-gray-700 hover:cursor-pointer flex items-center justify-center w-12.5 h-12.5 bg-gray-900 font-bold rounded-full">
                            <span className="select-none">{user.first_name.at(0)?.toUpperCase()}{user.last_name.at(0)?.toUpperCase()}</span>
                        </div>
                    </div>
                : <div className="flex gap-2 justify-center items-center">
                    <button onClick={() => navigate("/user/register")} className="cursor-pointer bg-orange-500 text-orange-50 font-semibold px-3 py-2 rounded">Registracija</button>

                    <button onClick={() => navigate("/user/login")} className="cursor-pointer bg-orange-500 text-orange-50 font-semibold px-3 py-2 rounded">Prijava</button>
                </div>}
                
            </div>
        </div>
    );
};

export default Header;
