"use client";
import { createContext, useContext, useState, useEffect } from "react";
import path from "path";

const FicheContext = createContext(null);

export const FicheProvider = ({ children, fiche }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [entireMode, setEntireMode] = useState(false);

  const sourceDocuments = fiche?.documents || [];
  const observations = fiche?.observations || [];
  const namedEntities = [];

  useEffect(() => {
    let document = null;
    if (sourceDocuments.length) {
      const sourceDoc = sourceDocuments[0];
      const id = sourceDoc?.id;
      const { ext: extension, name } = path.parse(sourceDoc?.fileName);
      document = { id, name, extension, table: "documents", type: "source" };
    } else if (observations.length) {
      const obs = observations[0];
      const id = obs?.id;
      const name = obs?.object;
      const extension = ".pdf";
      document = { id, name, extension, table: "fiches", type: "observation" };
    }
    handleDocumentClick(document);
  }, []);

  const handleDocumentClick = (document) => {
    if (document?.id && document?.id !== selectedDoc?.id)
      setSelectedDoc(document);
  };

  const toggleEntireMode = (document) => {
    setEntireMode((prev) => {
      if (!prev) {
        setSelectedDoc(document);
      } else {
        if (document.type === "fiche") {
          let document = null;
          if (sourceDocuments.length) {
            const sourceDoc = sourceDocuments[0];
            const id = sourceDoc?.id;
            const { ext: extension, name } = path.parse(sourceDoc?.fileName);
            document = {
              id,
              name,
              extension,
              table: "documents",
              type: "source",
            };
          } else if (observations.length) {
            const obs = observations[0];
            const id = obs?.id;
            const name = obs?.object;
            const extension = ".pdf";
            document = {
              id,
              name,
              extension,
              table: "fiches",
              type: "observation",
            };
          }
          setSelectedDoc(document);
        } else {
          setSelectedDoc(document);
        }
      }
      return !prev;
    });
  };

  const navigatePrevious = (document) => {
    const type = document?.type;
    if (type === "source") {
      const index = sourceDocuments.findIndex((doc) => doc.id === document.id);
      if (index > 0) {
        const sourceDoc = sourceDocuments[index - 1];
        const id = sourceDoc?.id;
        const { ext: extension, name } = path.parse(sourceDoc?.fileName);
        const doc = {
          id,
          name,
          extension,
          table: "documents",
          type: "source",
        };
        setSelectedDoc(doc);
      } else if (index === 0 && entireMode) {
        const id = fiche?.id;
        const name = fiche?.object;
        const extension = ".pdf";
        const doc = {
          id,
          name,
          extension,
          table: "fiches",
          type: "fiche",
        };
        setSelectedDoc(doc);
      }
    } else if (type === "observation") {
      const index = observations.findIndex((obs) => obs.id === document.id);
      if (index > 0) {
        const obs = observations[index - 1];
        const id = obs?.id;
        const name = obs?.object;
        const extension = ".pdf";
        const doc = {
          id,
          name,
          extension,
          table: "fiches",
          type: "observation",
        };
        setSelectedDoc(doc);
      }
    }
  };

  const navigateNext = (document) => {
    const type = document?.type;
    if (type === "fiche" && entireMode) {
      const sourceDoc = sourceDocuments[0];
      const id = sourceDoc?.id;
      const { ext: extension, name } = path.parse(sourceDoc?.fileName);
      const doc = {
        id,
        name,
        extension,
        table: "documents",
        type: "source",
      };
      setSelectedDoc(doc);
    } else if (type === "source") {
      const index = sourceDocuments.findIndex((doc) => doc.id === document.id);
      if (index < sourceDocuments.length - 1) {
        const sourceDoc = sourceDocuments[index + 1];
        const id = sourceDoc?.id;
        const { ext: extension, name } = path.parse(sourceDoc?.fileName);
        const doc = {
          id,
          name,
          extension,
          table: "documents",
          type: "source",
        };
        setSelectedDoc(doc);
      }
    } else if (type === "observation") {
      const index = observations.findIndex((obs) => obs.id === document.id);
      if (index < observations.length - 1) {
        const obs = observations[index + 1];
        const id = obs?.id;
        const name = obs?.object;
        const extension = ".pdf";
        const doc = {
          id,
          name,
          extension,
          table: "fiches",
          type: "observation",
        };
        setSelectedDoc(doc);
      }
    }
  };

  return (
    <FicheContext.Provider
      value={{
        fiche,
        sourceDocuments,
        observations,
        namedEntities,
        selectedDoc,
        handleDocumentClick,
        entireMode,
        toggleEntireMode,
        navigatePrevious,
        navigateNext,
      }}
    >
      {children}
    </FicheContext.Provider>
  );
};

export const useFiche = () => {
  const context = useContext(FicheContext);
  if (!context) {
    throw new Error("useFiche must be used within a FicheProvider");
  }
  return context;
};
