import fs from "fs/promises";

const main = async (filePath) => {
  await fs.rm(filePath, { recursive: true });
};

main("./dir2");
