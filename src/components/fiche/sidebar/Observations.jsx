import SidebarSection from "./SidebarSection";
import { Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFiche } from "@/contexts/FicheContext";

const Observations = () => {
  const { observations, selectedDoc, handleDocumentClick } = useFiche();
  const router = useRouter();

  if (!observations.length) return;

  const handleDocumentDoubleClick = (obs) => {
    router.push(`/fiche/${obs.id}`);
  };
  return (
    <SidebarSection title="Observations" icon={Lightbulb} defaultOpen>
      <div className="space-y-1">
        {observations.map((obs) => (
          <div
            key={obs.id}
            className={`px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors hover:bg-muted flex items-center ${
              selectedDoc?.id === obs.id ? "bg-muted font-medium" : ""
            }`}
            onClick={() => handleDocumentClick(obs)}
            onDoubleClick={() => handleDocumentDoubleClick(obs)}
          >
            <Lightbulb size={14} className="mr-2 text-gray-600" />
            <span>{obs.name}</span>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
};

export default Observations;
