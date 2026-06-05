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
                <p><strong>*Napomena:</strong> Preduvjete dijagnostičkih jedinica, medijske datoteke i kategoriju slučaja potrebno je unijeti ručno preko forme.</p>
            </div>
        </section>

        {/* Osnovni podaci */}
        <section>
            <h2 className="text-lg font-bold text-orange-600 border-b-2 border-orange-200 mb-4 pb-1">
                Osnovne Informacije
            </h2>
            <div className="space-y-2">
                <p><strong>Naslov (title):</strong> Naziv slučaja koji se prikazuje u izborniku.</p>
                <p><strong>Kategorija (category):</strong> Kategorija slučaja i moguće potkategorije. Npr. automehanika - motori s unutarnjim izgaranjem - senzori u motoru</p>
                <p>
                    <strong>Razina (level):</strong> Određuje težinu zadatka. Moguće vrijednosti:
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-sm font-mono">novice (početna), intermediate (srednja), expert (napredna)</span>
                </p>
                <p><strong>Vrsta (type):</strong> <code>practice</code> (slučajevi namijenjeni korištenju u vježbama) ili <code>exam</code> (slučajevi namijenjeni korištenju u ispitima)</p>
                <p><strong>Vidljivost (is_public):</strong> Javni slučajevi su vidljivi svim nastavnicima i oni ih mogu koristiti u svojim vježbama</p>
                <p><strong>Početna informacija (initial_info):</strong> Temeljni opis simptoma, mjerenja ili situacije za početak dijagnostike</p>
                <p>*Osim tekstualne početne informacije možete priložiti i medijske datoteke (audio, video, slike...) kako bi dali što detaljnije informacije ispitanicima</p>
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
                <p><strong>Naziv jedinice (name):</strong> Naziv DU-a (npr. Mjerenje razine ulja).</p>
                <p><strong>Labela (label):</strong> Simbolički identifikator dijagnostičke jedinice (npr. <code>CHECK_OIL</code>). Mora biti jedinstven.</p>
                <p><strong>Tip jedinice (type):</strong> Vrsta DU-a (<code>data</code> ili <code>action</code>).</p>
                <p><strong>Tekstualni rezultat (result_text):</strong> Tekst koji korisnik dobije nakon upita (npr. "Tlak je 3 bara").</p>
                <p>*Kao i za početne informacije slučaja, i ovdje možete priložiti medijske datoteke koje će dati detaljnije povratne informacije.</p>
                <p><strong>Indikatori redundancije (provides):</strong> Oznake koje sprječavaju redundantnost (ponavljanje istih saznanja). Ako ispitanik dohvati DU koji ima indikator jednak nekom od već dohvaćenih, taj se novi upit smatra redundantnim.</p>
                <p className="pl-10">Ako neki DU pruža kombinaciju starih i novih informacija, obavezno morate dodati novu jedinstvenu oznaku za tu novu informaciju.</p>
                <p className="pl-10"><strong>*Primjer:</strong> ako DU (npr. skidanje pumpe) daje informaciju o niskom tlaku ali i otkriva oštećenje kućišta, mora se definirati indikatore npr. "tlak_goriva_nizak" i "ostecenje_pumpe_fizicko"</p>
                <p className="pl-10">Također, ako jedna radnja donosi previše novih, ključnih informacija koje granaju dijagnostiku, bolje je razbiti tu veliku jedinicu na više manjih. Na taj način student mora svjesno zatražiti i jedan i drugi dio, a evaluacijski izvještaj će puno preciznije izračunati njegovu metodičnost.</p>
                <p><strong>Resursi (resources):</strong> Trošak u novcu (<code>money</code>) ili vremenu (<code>time</code>). Moguće mjerne jedinice vremena su: sekunde (seconds), minute (minutes), sati (hours) i dani (days).</p>
                <p><strong>Preduvjeti (required_units):</strong> Jedinice koje se moraju obaviti <em>prije</em> ove.</p>
                <div>
                    <p className="font-bold mb-1">Posljedice (consequences):</p>
                    <ul className="list-disc ml-10 space-y-1">
                        <li><strong>warning:</strong> Kazna/upozorenje, ali dopušten nastavak.</li>
                        <li><strong>terminate:</strong> Kritična pogreška, trenutni kraj ispita (u slobodnim vježbama moguće je nastaviti osim ako je u postavkama zadaće postavljeno drugačije).</li>
                        <li><strong>Kazne za grešku:</strong> Dodatni trošak uzrokovan neispravnim pristupom dijagnostičkom postupku (npr. ako se krene rastavljati motor automobila bez da se prvo napravilo jeftinija testiranja, troši se vrijeme i novac). Iznos možete unijeti u dostupna polja ili ih ostaviti prazna ako smatrate da nisu potrebna.</li>
                    </ul>
                </div>
                <p><strong>Budžet (budget):</strong> Budžet slučaja koji postavljate ako želite kategorizaciju pokušaja rješavanja u "bolje od kriterija" (ispitanik potrošio manje ili predviđeni iznos novca/vremena) ili "lošije od kriterija" (ispitanik je potrošio više novca/vremena nego je predviđeno).</p>
            </div>
        </section>

        {/* Dijagnoza */}
        <section>
            <h2 className="text-lg font-bold text-orange-600 border-b-2 border-orange-200 mb-4 pb-1">Dijagnoza</h2>
            <div className="space-y-2">
                <p><strong>Definicija ispravne dijagnoze (correct_diagnosis): </strong>Ispravna dijagnoza koju se očekuje da će ispitanik postaviti.</p>
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
                </ul>
            </div>
        </section>
    </div>
);