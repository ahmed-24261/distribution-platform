import { Users, Building, MapPin, ShieldQuestion } from "lucide-react";
import SidebarSection from "./SidebarSection";
import { useState, useCallback } from "react";
import { useFiche } from "@/contexts/FicheContext";

const Entities = () => {
  const { namedEntities } = useFiche();
  const [expandedEntityIds, setExpandedEntityIds] = useState([]);
  const [isSectionOpen, setIsSectionOpen] = useState(false);

  const groupedEntities = namedEntities.reduce((acc, entity) => {
    const category = entity.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(entity);
    return acc;
  }, {});

  const toggleEntityDescription = (entityId) => {
    if (expandedEntityIds.includes(entityId)) {
      setExpandedEntityIds(expandedEntityIds.filter((id) => id !== entityId));
    } else {
      setExpandedEntityIds([...expandedEntityIds, entityId]);
    }
  };

  const handleSectionToggle = useCallback((isOpen) => {
    setIsSectionOpen(isOpen);
    if (!isOpen) {
      setExpandedEntityIds([]);
    }
  }, []);

  const renderNERTitleByCategory = (category) => {
    switch (category) {
      case "PERSON":
        return (
          <>
            <Users size={14} className="mr-1 text-primary/70" />
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Personnes
            </div>
          </>
        );
      case "ORGANIZATION":
        return (
          <>
            <Building size={14} className="mr-1 text-primary/70" />
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Organisations
            </div>
          </>
        );
      case "LOCATION":
        return (
          <>
            <MapPin size={14} className="mr-1 text-primary/70" />
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Lieux
            </div>
          </>
        );
      default:
        return (
          <>
            <ShieldQuestion size={14} className="mr-1 text-primary/70" />
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Inconnue
            </div>
          </>
        );
    }
  };

  if (!Object.keys(groupedEntities).length) return;
  return (
    <SidebarSection
      title="Entités Nommées"
      icon={Users}
      onToggle={handleSectionToggle}
    >
      {Object.entries(groupedEntities).map(([category, entities]) => (
        <div key={category} className="mb-3">
          <div className="flex items-center mb-1">
            {renderNERTitleByCategory(category)}
          </div>
          <div className="ml-1">
            {entities.map((entity) => (
              <div key={entity.id} className="mb-2">
                <div
                  className="px-2 py-1 text-sm hover:bg-muted/50 rounded cursor-pointer transition-colors"
                  onClick={() => toggleEntityDescription(entity.id)}
                >
                  {entity.name}
                </div>
                {expandedEntityIds.includes(entity.id) && (
                  <div className="ml-2 mt-1 px-3 py-2 text-xs bg-muted/30 rounded-md border-l-2 border-primary/30 animate-fade-in">
                    {entity.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </SidebarSection>
  );
};

export default Entities;
