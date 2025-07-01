import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFiche } from "@/contexts/FicheContext";

const NavigateDocuments = ({ document, withNavigate }) => {
  const { navigatePrevious, navigateNext } = useFiche();

  if (!withNavigate) return;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigatePrevious(document)}
        className="h-7 w-7 p-0 hover:bg-gray-200"
        title="Document précédent"
      >
        <ChevronLeft size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigateNext(document)}
        className="h-7 w-7 p-0 hover:bg-gray-200"
        title="Document suivant"
      >
        <ChevronRight size={16} />
      </Button>
    </>
  );
};

export default NavigateDocuments;
