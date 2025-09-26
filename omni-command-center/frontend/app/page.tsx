'use client';

import React from "react";

const modules = [
  { name: "Turizem & Apartmaji", description: "Upravljanje rezervacij, apartmajev, računov in zalog." },
  { name: "POS / Blagajna", description: "Izdaja računov, upravljanje zalog, poročila." },
  { name: "CRM & Marketing", description: "Upravljanje strank, kampanje, analitika." },
  { name: "Finance & Računovodstvo", description: "Računi, fakture, poročila in statistike." },
  { name: "HR & Zaposleni", description: "Upravljanje osebja, urniki, ocenjevanja." },
  { name: "Logistika & Zaloge", description: "Skladišča, dobavitelji, transport in zaloge." },
  { name: "Analytics & AI Predlogi", description: "Samodejni predlogi, analize in KPI spremljanje." },
  { name: "Settings & Integracije", description: "Booking.com, Airbnb, plačilni sistemi, API Gateway." },
  { name: "Support & Dokumentacija", description: "Pomoč uporabniku, vodiči, FAQ." },
];

const Home: React.FC = () => {
  const handleOpenModule = (moduleName: string) => {
    console.log(`Odprt modul: ${moduleName}`);
    alert(`Odprt modul: ${moduleName}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* Skip to main content link for screen readers */}
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Skip to main content
      </a>

      <header className="bg-white shadow-md p-6">
        <h1 className="text-4xl font-bold text-gray-800">Omni Command Center</h1>
        <p className="text-gray-600 mt-1">Vsi moduli in nadzor na enem mestu</p>
      </header>

      <main id="main-content" className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div
              key={module.name}
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => handleOpenModule(module.name)}
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">{module.name}</h2>
              <p className="text-gray-600 mb-4">{module.description}</p>
              <button
                onClick={() => handleOpenModule(module.name)}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
              >
                Odpri modul
              </button>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-gray-500 p-6">
        © {new Date().getFullYear()} Omni Command Center. Vse pravice pridržane.
      </footer>
    </div>
  );
};

export default Home;