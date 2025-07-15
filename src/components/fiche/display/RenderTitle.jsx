import { FileText } from "lucide-react";

const RenderTitle = ({ name, type }) => {
  switch (type) {
    case "fiche":
      return (
        <>
          <FileText
            size={16}
            className="flex-none mr-2 text-muted-foreground"
          />
          <span className="mr-1 font-medium">Fiche:</span>
          <span className="line-clamp-1">{name}</span>
        </>
      );
    case "source":
      return (
        <>
          <FileText
            size={16}
            className="flex-none mr-2 text-muted-foreground"
          />
          <span className="mr-1 font-medium">Source:</span>
          <span className="line-clamp-1">{name}</span>
        </>
      );
    case "observation":
      return (
        <>
          <FileText
            size={16}
            className="flex-none mr-2 text-muted-foreground"
          />
          <span className="mr-1 font-medium">Observation:</span>
          <span className="line-clamp-1">{name}</span>
        </>
      );
    default:
      return (
        <>
          <FileText
            size={16}
            className="flex-none mr-2 text-muted-foreground"
          />
          <span className="mr-1 font-medium">Inconnue:</span>
          <span className="line-clamp-1">{name}</span>
        </>
      );
  }
};

export default RenderTitle;
