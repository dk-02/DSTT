export const HelpContent = () => (
    <div className="text-gray-700 space-y-8 pb-8">
        {/* Upute */}
        <section>
            <h2 className="text-lg font-bold text-orange-600 border-b-2 border-orange-200 mb-4 pb-1">
                Upute za korištenje
            </h2>
            <div className="space-y-3">
                <p>Podatke možete unositi ručno preko forme, a postoji i opcije učitavanja JSON datoteke kako bi se postupak ubrzao.</p>
                <p className="font-bold">Učitavanje JSON datoteke:</p>            
                <ol className="list-decimal ml-10 space-y-1">
                    <li>Preuzmite JSON obrazac</li>
                    <li>Popunite obrazac ručno ili s pomoću AI (možete u promptu iskoristiti objašnjenja atributa u nastavku kako bi vam dao što bolje rezultate)</li>
                    <li>Učitajte obrazac u formu</li>
                    <li>Provjerite i po potrebi promijenite/dopunite podatke</li>
                </ol>
                <p><strong>*Napomena:</strong> Preduvjete dijagnostičkih jedinica i medijske datoteke potrebno je unijeti ručno preko forme.</p>
            </div>
        </section>

        {/* Osnovni podaci */}
        <section>
            <h2 className="text-lg font-bold text-orange-600 border-b-2 border-orange-200 mb-4 pb-1">
                Osnovne Informacije
            </h2>
            <div className="space-y-2">
                <p><strong>Naslov (title):</strong> Naziv slučaja koji se prikazuje u izborniku.</p>
                <p><strong>Kategorija (category):</strong> Kategorija slučaja i moguće potkategorije. Npr. automehanika - motori s unutarnjim izgaranjem - senzori u motoru.</p>
                <p>
                    <strong>Razina (level):</strong> Određuje težinu zadatka. Moguće vrijednosti:
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-sm font-mono">novice, intermediate, expert</span>
                </p>
                <p><strong>Vrsta (type):</strong> <code>practice</code> (vježba s povratnim informacijama) ili <code>exam</code> (službeni ispit).</p>
                <p><strong>Vidljivost (is_public):</strong> Javni slučajevi su vidljivi svim nastavnicima.</p>
                <p><strong>Početna informacija (initial_info):</strong> Temeljni opis simptoma, mjerenja ili situacije za početak dijagnostike.</p>
            </div>
        </section>

        {/* Dijagnostičke jedinice */}
        <section>
            <h2 className="text-lg font-bold text-orange-600 border-b-2 border-orange-200 mb-4 pb-1">
                Dijagnostičke Jedinice (DU)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <span className="font-bold text-blue-800 block mb-1">DDU (Data)</span>
                    Podatak koji korisnik traži (npr. laboratorijski test, očitanje greške).
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-green-100">
                    <span className="font-bold text-orange-700 block mb-1">ADU (Action)</span>
                    Akcija koja se mora obaviti (npr. "isključi napajanje").
                </div>
            </div>

            <div className="space-y-2">
                <p><strong>Labela (label):</strong> Simbolički ID dijagnostičke jedinice (npr. <code>CHECK_OIL</code>). Mora biti jedinstven.</p>
                <p><strong>Naziv jedinice (name):</strong> Naziv DU-a (npr. Mjerenje razine ulja).</p>
                <p><strong>Tip jedinice (type):</strong> Vrsta DU-a (<code>data</code> ili <code>action</code>).</p>
                <p><strong>Tekstualni rezultat (result_text):</strong> Tekst koji korisnik dobije nakon upita (npr. "Tlak je 3 bara").</p>
                <p><strong>Indikatori redundancije (provides):</strong> Oznake koje sprečavaju redundantnost (ponavljanje istih saznanja).</p>
                <p><strong>Resursi (resources):</strong> Trošak u novcu (<code>money</code>) ili vremenu (<code>time</code>). Moguće mjerne jedinice vremena su: seconds, minutes, hours i days.</p>
                <p><strong>Preduvjeti (required_units):</strong> Jedinice koje se moraju obaviti <em>prije</em> ove.</p>
                <div>
                    <p className="font-bold mb-1">Posljedice (consequences):</p>
                    <ul className="list-disc ml-10 space-y-1">
                        <li><strong>warning:</strong> Kazna/upozorenje, ali dopušten nastavak.</li>
                        <li><strong>terminate:</strong> Kritična pogreška, trenutni kraj ispita.</li>
                    </ul>
                </div>
            </div>
        </section>

        {/* Dijagnoza */}
        <section>
            <h2 className="text-lg font-bold text-orange-600 border-b-2 border-orange-200 mb-4 pb-1">Dijagnoza</h2>
            <div className="space-y-2">
                <p><strong>Definicija ispravne dijagnoze (correct_diagnosis): </strong>Ispravna dijagnoza koju se očekuje da će ispitanik postaviti.</p>
                <p className="font-bold mb-2">Kategorije grešaka pri dijagnozi (if_incorrect):</p>
                <ul className="list-disc ml-10 space-y-1">
                    <li><strong>terminate:</strong> Odmah završava ispit.</li>
                    <li><strong>penalize:</strong> Nastavak uz oduzimanje bodova.</li>
                    <li><strong>continue:</strong> Nastavak uz kratku povratnu informaciju.</li>
                </ul>
            </div>
        </section>

        {/* Savjeti */}
        <section>
            <h2 className="text-lg font-bold text-orange-600 border-b-2 border-orange-200 mb-4 pb-1">
                Savjeti (Hints)
            </h2>
            <div className="space-y-2">
                <p className="">
                    Opcionalne informacije koje se "naplaćuju". 
                </p>
                <p className="font-bold mb-2">Svaki savjet ima:</p>
                <ul className="list-disc ml-5 space-y-1">
                    <li><strong>Slijedni broj (sequence_no):</strong> Osigurava da se savjeti otključavaju po redu (npr. prvo Hint 1, pa Hint 2).</li>
                    <li><strong>Tekst (text):</strong> Tekst koji se prikazuje ispitaniku.</li>
                    <li><strong>Cijenu (cost):</strong> Broj bodova koji ispitanik "plaća" za dohvat savjeta.</li>
                </ul>
            </div>
        </section>
    </div>
);