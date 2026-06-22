import Header from "../components/UI/Header";

function Landing() {
    return (
        <div className="relative min-h-screen w-full bg-gray-800">
            <Header />
            <div className="h-[calc(100vh-4.5rem)] w-full flex flex-col justify-center p-10">
                <div className="w-1/2">
                    <p data-aos="fade-right" className="text-gray-200 text-5xl font-bold tracking-wide leading-18">Učite na temelju situacija s kojima se susreću <span className="text-orange-500">stručnjaci</span></p>
                </div>
            </div>
        </div>
    );
}

export default Landing;
