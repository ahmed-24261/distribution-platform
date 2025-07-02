import { Info } from "lucide-react";
import SectionTemplate from "./SectionTemplate";
import { useFiche } from "@/contexts/FicheContext";

const GeneralInfo = () => {
  const { fiche } = useFiche();
  return (
    <SectionTemplate title="Informations Générales" icon={Info} defaultOpen>
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
          <div>{fiche.createdBy || "Inconnu"}</div>
        </div>
      </div>
    </SectionTemplate>
  );
};

export default GeneralInfo;
