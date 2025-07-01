import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFiche } from "@/contexts/FicheContext";

const EntireMode = ({ document }) => {
  const { entireMode, toggleEntireMode } = useFiche();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleEntireMode(document)}
      className="h-7 w-7 p-0 hover:bg-gray-200"
      title={entireMode ? "Quitter le mode plein écran" : "Mode plein écran"}
    >
      {entireMode ? <Minimize size={16} /> : <Maximize size={16} />}
    </Button>
  );
};

export default EntireMode;
