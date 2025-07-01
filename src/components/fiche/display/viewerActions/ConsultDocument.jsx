import { View } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ConsultDocument = ({ document, withConsult }) => {
  if (!withConsult) return;
  return (
    <Link href={`/fiche/${document.id}`}>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 hover:bg-gray-200"
        title="Explorer"
      >
        <View size={16} />
      </Button>
    </Link>
  );
};

export default ConsultDocument;
