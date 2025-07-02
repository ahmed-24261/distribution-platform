import { Lightbulb } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SectionTemplate from "./SectionTemplate";
import { useRouter } from "next/navigation";
import { useFiche } from "@/contexts/FicheContext";

const Observations = () => {
  const { observations, selectedDoc, handleDocumentClick } = useFiche();
  const router = useRouter();

  if (!observations.length) return;

  return (
    <SectionTemplate title="Observations" icon={Lightbulb} defaultOpen>
      <div className="space-y-1">
        {observations.map((obs) => {
          const id = obs?.id;
          const path = obs?.path;
          const hash = obs?.hash;
          const displayName = obs?.object;

          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <div
                  className={`px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors hover:bg-muted flex items-center ${
                    selectedDoc?.id === id ? "bg-muted font-medium" : ""
                  }`}
                  onClick={() =>
                    handleDocumentClick({
                      id,
                      path,
                      hash,
                      displayName,
                      type: "observation",
                    })
                  }
                >
                  <Lightbulb
                    size={14}
                    className="flex-none mr-2 text-gray-600"
                  />
                  <span className="line-clamp-1">{displayName}</span>
                </div>
              </TooltipTrigger>

              <TooltipContent>
                <p>{displayName}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </SectionTemplate>
  );
};

export default Observations;
