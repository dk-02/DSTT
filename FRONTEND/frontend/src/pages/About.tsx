import { ArrowNarrowLeft } from "@untitledui/icons";
import Header from "../components/UI/Header";
import { useNavigate } from "react-router-dom";

function About() {    
    const navigate = useNavigate();

    const advantages = [
        { title: "Interaktivnost", desc: "Prirodna komunikacija s LLM-om." },
        { title: "Domenska neovisnost", desc: "Primjenjivost na medicinu, tehniku i druge grane." },
        { title: "Dubinska analitika", desc: "Praćenje logike, a ne samo pogađanja." },
        { title: "Ekonomski aspekt", desc: "Evaluacija utroška vremena i novca u dijagnostici." },
        { title: "Pedagoška vrijednost", desc: "Sigurno učenje na pogreškama uz simulaciju stvarnih posljedica." },
    ];

    return (
        <div className="w-screen h-screen bg-gray-700 flex flex-col text-gray-100">
            <Header />
            <ArrowNarrowLeft onClick={() => navigate("/")} className="absolute top-24 left-5 scale-130 text-gray-50 hover:cursor-pointer" />
            <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20">
                <div className="max-w-4xl mx-auto">
                    {/* Naslovna sekcija */}
                    <section className="mb-12">
                        <h1 className="text-4xl font-bold mb-6">O projektu DS<span className="text-orange-500">TT</span></h1>
                        <div className="space-y-6 text-lg leading-relaxed text-gray-200">
                            <p>
                                <span className="font-semibold text-white">DSTT (Diagnostic Skills Testing Tool)</span> predstavlja iskorak u modernizaciji stručnog obrazovanja i osposobljavanja kroz fuziju umjetne inteligencije i strukturirane dijagnostičke logike. Naša misija je transformirati tradicionalno učenje u dinamično iskustvo rješavanja problema u sigurnom, simuliranom okruženju. Koristeći napredne jezične modele (LLM) kao intuitivno sučelje, omogućujemo korisnicima da prirodnim jezikom istražuju kompleksne slučajeve iz raznih domena - od automehanike do medicine - dok sustav u pozadini budno prati svaki njihov korak.
                            </p>
                            <p>
                                Ideja vodilja DSTT-a je da prava stručnost ne leži samo u točnoj konačnoj dijagnozi, već u metodičnosti i ekonomičnosti puta koji do nje vodi. Naš sustav ne vrednuje samo krajnji rezultat, već dubinski analizira logičke indikatore, prepoznaje redundantne upite i mjeri efikasnost korištenja resursa poput vremena i novca. Kroz simulirane posljedice pogrešaka i detaljne kumulativne izvještaje, DSTT pruža uvid u proces razmišljanja ispitanika, pomažući nastavnicima da precizno identificiraju prostor za napredak, a studentima da razviju analitički pristup neophodan za izazove stvarnog svijeta.
                            </p>
                        </div>
                    </section>

                    {/* Sekcija s prednostima */}
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-6 border-b border-gray-600 pb-2">
                            Glavne prednosti
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {advantages.map((adv, index) => (
                                <div key={index} className="bg-gray-600 p-4 rounded-xl border border-gray-500 hover:border-orange-500 transition-colors">
                                    <h3 className="text-orange-400 font-bold mb-1">{adv.title}</h3>
                                    <p className="text-gray-300 text-sm">{adv.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default About;
