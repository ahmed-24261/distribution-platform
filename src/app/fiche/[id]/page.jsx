"use client";

import Loading from "@/components/fiche/Loading";
import Sidebar from "@/components/fiche/Sidebar";
import Display from "@/components/fiche/Display";
import { FicheProvider } from "@/contexts/FicheContext";
import { useState, useEffect, use } from "react";

const Fiche = ({ params }) => {
  const { id } = use(params);
  const [fiche, setFiche] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/fiches?id=${id}`);
      const { success, data, message } = await response.json();
      if (success) {
        console.log(data);
        setFiche(data[0]);
      } else {
        alert("GET api/fiches: " + message);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (!fiche) return;

  return (
    <Loading>
      <FicheProvider fiche={fiche}>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/5 flex-shrink-0 border-r overflow-auto bg-gray-50">
            <Sidebar />
          </div>
          <Display ficheInfo={fiche} />
        </div>
      </FicheProvider>
    </Loading>
  );
};

export default Fiche;
