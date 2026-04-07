import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

function Landing() {
    const user = useAuthStore((state) => state.user);

    const navigate = useNavigate();

    const { logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate("/user/login");
    }

    return(
        <div className="flex justify-center items-center w-screen h-screen bg-gray-700 text-white">
            <div className="w-1/4 p-10 bg-gray-800  h-full flex flex-col justify-between items-center">
                <div className="flex flex-col items-center gap-5 w-full">
                    <div className="flex items-center justify-center w-40 h-40 text-4xl bg-gray-900 border-2 border-orange-500 font-bold rounded-full">
                        <span className="select-none">{user?.first_name.at(0)?.toUpperCase()}{user?.last_name.at(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-3 text-xl w-full">
                        <div className="flex justify-center items-center border-2 border-gray-500 w-[50%] h-24 rounded">
                            <span>{user?.xp_points} XP</span>
                        </div>
                        <div className="flex justify-center items-center border-2 border-gray-500 w-[50%] h-24 rounded">
                            <span>{user?.expertise_level.toUpperCase()}</span>
                        </div>
                    </div>

                    <button className="cursor-pointer border border-gray-600 font-semibold px-3 py-2 rounded">Povijest rješavanja i statistika</button>
                </div>

                <div className="w-full">
                    <button onClick={handleLogout} className="w-full bg-gray-700 px-3 py-2 rounded-md hover:bg-gray-600 hover:cursor-pointer">Odjavi se</button>
                </div>
            </div>

            <div className="w-3/4 p-10">
                <div className="w-1/3 flex flex-col text-lg">
                    <span className="text-sm text-gray-300 mb-3">Email</span>
                    <span>{user?.email}</span>

                    <div className="border-b-2 border-b-gray-600 my-5" />

                    <span className="text-sm text-gray-300 mb-3">Ime</span>
                    <span>{user?.first_name}</span>

                    <span className="text-sm text-gray-300 mb-3 mt-5">Prezime</span>
                    <span>{user?.last_name}</span>
                </div>

                <div className="w-1/3 border-b-2 border-b-gray-600 my-5" />

                <div className="w-1/3 flex flex-col gap-2">
                    <span className="text-sm text-gray-300 mb-2">Upravljanje podatcima</span>
                    <button className="cursor-pointer border border-gray-600 font-semibold px-3 py-2 rounded">Uredi podatke</button>
                    <button className="cursor-pointer border border-gray-600 font-semibold px-3 py-2 rounded">Promijeni lozinku</button>
                </div>
            </div>
            
        </div>
    );
}

export default Landing;