import { getFicheOwnerId } from "@/lib/fiche";

export const updateOneFiche = async (data, userId) => {
  const { id, update } = data || {};
  if (!id || !update) {
    return {
      success: false,
      data: null,
      message: "Requête invalide : les champs 'id' et 'update' sont requis.",
      status: 400,
    };
  }
  const ownerId = await getFicheOwnerId(id);
  if (!ownerId || ownerId !== userId) {
  }
};

export const updateManyFiches = async (data) => {};
