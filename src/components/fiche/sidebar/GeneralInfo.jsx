import { Info } from "lucide-react";
import SidebarSection from "./SidebarSection";
import { useFiche } from "@/contexts/FicheContext";

const GeneralInfo = () => {
  const { fiche } = useFiche();
  return (
    <SidebarSection title="Informations Générales" icon={Info} defaultOpen>
      <div className="space-y-2">
        <div>
          <div className="text-xs text-muted-foreground">Référence</div>
          <div className="font-medium">{fiche.ref}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Source</div>
          <div className="text-sm uppercase font-normal">{fiche.source}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Créé Par</div>
          <div>{fiche.createdBy}</div>
        </div>
      </div>
    </SidebarSection>
  );
};

export default GeneralInfo;
