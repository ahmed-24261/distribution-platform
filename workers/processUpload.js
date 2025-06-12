import { createClient } from "redis";
import pool from "./db.js";
import dotenv from "dotenv";
import { calculateFileHash } from "./utils.js";
import { DateTime } from "luxon";
import { HTTPError } from "./utils.js";

dotenv.config();

import StreamZip from "node-stream-zip";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";

import { consoleLog } from "../consoleLog/index.js";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;
const TEMP_FOLDER = process.env.TEMP_FOLDER;

const redis = createClient({ url: process.env.REDUS_URL });
redis.on("error", (err) => console.error("Redis error:", err));

await redis.connect();

const processZipFile = async (filePath, outputDir, uploadId) => {
  const mainOutputDir = path.join(outputDir, "main");
  await unzipFile(filePath, mainOutputDir);
  const filePaths = await listFilesRecursive(mainOutputDir);

  const folders = getFolders(filePaths);

  for (const folder of folders) {
    await processFolder(folder, filePaths, uploadId).catch(() => {});
  }

  for (const filePath of filePaths) {
    if (filePath.endsWith(".zip")) {
      const nestedOutputDir = path.join(
        outputDir,
        "nested",
        path.basename(filePath)
      );
      await processZipFile(filePath, nestedOutputDir, uploadId);
    }
  }
};

const unzipFile = async (filePath, outputDir) => {
  const zip = new StreamZip.async({ file: filePath });

  try {
    await fsp.mkdir(outputDir, { recursive: true });

    const entries = await zip.entries();
    const entryNames = Object.keys(entries);

    const concurrency = 5;
    for (let i = 0; i < entryNames.length; i += concurrency) {
      const batch = entryNames.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (entryName) => {
          const entry = entries[entryName];

          if (entry.isDirectory) {
            await fsp.mkdir(path.join(outputDir, entry.name), {
              recursive: true,
            });
            return;
          }

          const fullPath = path.join(outputDir, entry.name);
          const dir = path.dirname(fullPath);

          await fsp.mkdir(dir, { recursive: true });

          const readStream = await zip.stream(entry.name);
          const writeStream = fs.createWriteStream(fullPath);

          try {
            await pipeline(readStream, writeStream);
          } catch (err) {
            throw err;
          }
        })
      );
    }
  } catch (err) {
    throw err;
  } finally {
    await zip.close();
  }
};

const listFilesRecursive = async (outputDir) => {
  let fileNames = [];
  const entries = await fsp.readdir(outputDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(outputDir, entry.name);

    if (entry.isDirectory()) {
      const recFileNames = await listFilesRecursive(fullPath);
      fileNames = [...fileNames, ...recFileNames];
    } else if (entry.isFile()) {
      fileNames.push(fullPath);
    }
  }
  return fileNames;
};

const getFolders = (filePaths) => {
  const folders = [];
  for (const filePath of filePaths) {
    if (filePath.endsWith("data.json")) {
      const folder = path.dirname(filePath);
      folders.push(folder);
    }
  }
  return folders;
};

const processFolder = async (folder, filePaths, uploadId) => {
  const productPaths = getProductPaths(folder, filePaths);
  const jsonPath = productPaths.find((filePath) =>
    filePath.endsWith("data.json")
  );
  const fichePath = productPaths.find((filePath) => filePath.endsWith(".docx"));
  const sourceDocPaths = productPaths.filter((filePath) =>
    isSourceDoc(filePath, folder)
  );
  const originDocPaths = productPaths.filter((filePath) =>
    isOriginDoc(filePath, folder)
  );

  const docPaths = {};
  for (const sourceDocPath of sourceDocPaths) {
    const fileName = path.basename(sourceDocPath);
    const index = parseInt(fileName);
    if (!isNaN(index) && !docPaths[index - 1]) {
      docPaths[index - 1] = { ["sourcePath"]: sourceDocPath };
    }
  }

  for (const originDocPath of originDocPaths) {
    const fileName = path.basename(originDocPath);
    const index = parseInt(fileName);
    if (!isNaN(index) && docPaths[index - 1]) {
      docPaths[index - 1].originPath = originDocPath;
    }
  }

  if (
    !jsonPath ||
    !fichePath ||
    !sourceDocPaths.length ||
    !originDocPaths.length
  ) {
    // failed fiche !!!
    console.log("Failed fiche: fiche incomplete!");
    return;
  }

  const jsonContent = await fsp.readFile(jsonPath, "utf8");
  const { ficheData, docsData, pathsMapping } = await validateAndConstructData(
    folder,
    jsonContent,
    fichePath,
    docPaths,
    uploadId
  );

  await transaction(ficheData, docsData, pathsMapping);
};

const getProductPaths = (folder, filePaths) => {
  const folders = [
    path.normalize(folder),
    path.normalize(path.join(folder, "Source")),
  ];
  const productPaths = filePaths.filter((filePath) =>
    folders.includes(path.normalize(path.dirname(filePath)))
  );

  return productPaths;
};

const isSourceDoc = (filePath, folder) => {
  const normalizeFolder = path.normalize(folder);
  const normalizePath = path.normalize(path.dirname(filePath));

  const sourceExtensions = [".pdf", ".eml", ".xlsx"];
  return (
    sourceExtensions.some((extension) => filePath.endsWith(extension)) &&
    normalizeFolder === normalizePath
  );
};

const isOriginDoc = (filePath, folder) => {
  const normalizeFolder = path.normalize(path.join(folder, "Source"));
  const normalizePath = path.normalize(path.dirname(filePath));
  return normalizeFolder === normalizePath;
};

const validateAndConstructData = async (
  folder,
  jsonContent,
  fichePath,
  docPaths,
  uploadId
) => {
  try {
    const jsonObject = JSON.parse(jsonContent);
    const ficheData = {};
    const docsData = [];
    const pathsMapping = [];

    const dump = jsonObject?.index;
    const sourceName = jsonObject?.source?.name;
    const summary = jsonObject?.summary;
    const object = jsonObject?.object;
    const date = new Date(jsonObject?.date_generate);
    const files = jsonObject?.files?.map((file) => ({
      type: file?.type,
      fileName: file?.name?.filename,
      originalFileName: file?.original?.filename,
      content: file?.content,
      meta: file?.meta,
      path: file?.path,
      parent: file?.parent,
    }));

    const hash = await calculateFileHash(fichePath);
    const fiche = await getFicheByHash(hash);
    if (fiche)
      throw new HTTPError(
        "Une fiche identique existe déjà (hash de la fiche déjà enregistré).",
        409
      );

    if (!dump)
      throw new HTTPError(
        "Le champ 'dump' est manquant dans le fichier data.json.",
        400
      );
    if (!sourceName)
      throw new HTTPError(
        "Le champ 'source' est manquant dans le fichier data.json.",
        400
      );
    if (!summary)
      throw new HTTPError(
        "Le champ 'summary' est manquant dans le fichier data.json.",
        400
      );
    if (!object)
      throw new HTTPError(
        "Le champ 'object' est manquant dans le fichier data.json.",
        400
      );
    if (!date)
      throw new HTTPError(
        "Le champ 'date_generate' est manquant dans le fichier data.json.",
        400
      );

    const source = await getSourceByName(sourceName);
    if (!source)
      throw new HTTPError("La source spécifiée est invalide ou inconnue.", 400);

    if (date.toString() === "Invalid Date")
      throw new HTTPError(
        "Le champ 'date_generate' est invalide ou mal formaté dans le fichier data.json.",
        400
      );

    if (!files)
      throw new HTTPError(
        "Le champ 'files' contenant les documents est manquant dans le fichier data.json.",
        400
      );

    if (files.length !== Object.keys(docPaths).length)
      throw new HTTPError(
        "Le nombre de documents spécifiés dans le champ 'files' ne correspond pas aux fichiers présents.",
        400
      );

    for (const file of files) {
      const fileName = file?.name?.filename;
      const originalFileName = file?.original?.filename;
      const type = file?.type;
      const content = file?.content;
      const meta = file?.meta;

      if (!fileName)
        throw new HTTPError(
          `Le champ 'files.name.filename' est manquant pour un fichier.`,
          400
        );

      if (!originalFileName)
        throw new HTTPError(
          `Le champ 'files.original.filename' est manquant pour le fichier '${fileName}'.`,
          400
        );

      if (!type)
        throw new HTTPError(
          `Le champ 'type' est manquant pour le fichier '${fileName}'.`,
          400
        );

      if (!content)
        throw new HTTPError(
          `Le champ 'content' est manquant pour le fichier '${fileName}'.`,
          400
        );

      if (!meta && type === "Message")
        throw new HTTPError(
          `Le champ 'meta' est manquant pour le fichier '${fileName}'.`,
          400
        );
    }

    const formatDate = DateTime.fromJSDate(date).setLocale("fr");
    const formatDateForPath = formatDate.toFormat("yyyyMMdd");
    const productPath = path.join(
      "data",
      "fiches",
      sourceName,
      formatDateForPath,
      folder
    );

    const ref = "ABC-" + Math.floor(100 + Math.random() * 900);

    ficheData.ref = ref;
    ficheData.sourceId = source.id;
    ficheData.date = date.toISOString();
    ficheData.object = object;
    ficheData.summary = summary;
    ficheData.hash = hash;
    ficheData.path = path.join(productPath, path.basename(fichePath));
    ficheData.uploadId = uploadId;
    ficheData.dump = dump;

    pathsMapping.push([fichePath, ficheData.path]);

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const docData = {};

      if (!docPaths[index]?.sourcePath)
        throw new HTTPError(
          `Le document '${file.filename}' est manquant dans le téléversement.`,
          400
        );
      if (!docPaths[index]?.originalPath)
        throw new HTTPError(
          `L'original de document '${file.filename}' est manquant dans le téléversement.`,
          400
        );

      const { sourcePath, originalPath } = docPaths[index];

      const hash = await calculateFileHash(sourcePath);
      const document = await getDocumentByHash(hash);
      if (document)
        throw new HTTPError(
          `Le document '${file.filename}' existe déjà (hash du fichier déjà enregistré).`,
          409
        );

      const {
        type,
        fileName,
        originalFileName,
        content,
        meta = null,
        path: pathInDump = null,
      } = file;

      docData.type = type;
      docData.file_name = fileName;
      docData.path = path.join(productPath, path.basename(sourcePath));
      docData.hash = hash;
      docData.content = content;
      docData.meta = meta;
      docData.dumpInfo = { dumpName: dump, path: pathInDump };

      pathsMapping.push([sourcePath, docData.path]);

      const originalNewPath = path.join(
        productPath,
        "Source",
        path.basename(originalPath)
      );
      pathsMapping.push([originalPath, originalNewPath]);

      if (type === "File") {
        const originalHash = await calculateFileHash(originalPath);
        const original = {
          file_name: originalFileName,
          path: originalNewPath,
          hash: originalHash,
        };
        docData.original = original;
      } else if (type === "Message") {
        if (!meta) {
          throw new HTTPError(
            `Les métadonnées (files.meta) du Message '${fileName}' sont absentes dans le fichier data.json.`,
            400
          );
        }
        const { from, to, date, object } = meta;
        if (!from || !to || to.length === 0 || !date || !object) {
          throw new HTTPError(
            `Les métadonnées (files.meta) du Message '${fileName}' sont incomplètes ou invalides dans le fichier data.json.`,
            400
          );
        }
      }

      docsData.push(docData);
    }

    return { ficheData, docsData, pathsMapping };
  } catch (error) {
    const message =
      error instanceof HTTPError
        ? error.getMessage()
        : "Erreur interne du serveur";

    // failed fiche !!!
  }
};

const transaction = async (ficheData, docsData, pathsMapping) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ficheQuery = `
      INSERT INTO fiche
      (ref, source_id, date, object, summary, path, hash, upload_id, dump)
      values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`;
    const { ref, sourceId, date, object, summary, path, hash, uploadId, dump } =
      ficheData;
    const ficheValues = [
      ref,
      sourceId,
      date,
      object,
      summary,
      path,
      hash,
      uploadId,
      dump,
    ];

    const { rows: ficheRows } = await client.query(ficheQuery, ficheValues);
    const ficheId = ficheRows[0].id;

    for (const docData of docsData) {
      const docQuery = `
      INSERT INTO document
      (type, fiche_id, file_name, path, hash, content, meta, dumpInfo, original, message_id)
      values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
      const {
        type,
        fileName,
        path,
        hash,
        content,
        dumpInfo = null,
        meta = null,
        original,
      } = docData;
      const docValues = [
        type,
        ficheId,
        fileName,
        path,
        hash,
        content,
        meta,
        dumpInfo,
        original,
        null,
      ];

      await client.query(docQuery, docValues);
    }

    for (const mapping of pathsMapping) {
      const [filePath, destinationPath] = mapping;
      await saveFile(filePath, destinationPath);
    }

    await client.query("COMMIT");
    client.release();
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
  }
};

const saveFile = async (SourcePath, destinationPath) => {
  const absDestinationPath = path.join(FILE_STORAGE_PATH, destinationPath);
  const absDirPath = path.dirname(absDestinationPath);

  await fsp.mkdir(absDirPath, { recursive: true });

  return new Promise((resolve, reject) => {
    const src = fs.createReadStream(SourcePath);
    const dest = fs.createWriteStream(absDestinationPath);

    src.pipe(dest);

    src.on("error", reject);
    dest.on("error", reject);
    dest.on("finish", () => {
      resolve();
    });
  });
};

// DB
const getUploadById = async (id) => {
  try {
    const query = `
      SELECT *
      FROM upload
      WHERE id = $1`;
    const values = [id];

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {}
};

const getFicheByHash = async (hash) => {
  try {
    const query = `
    SELECT id
    FROM fiche
    WHERE hash = $1
  `;
    const values = [hash];

    const { rows } = await pool.query(query, values);

    return rows[0] ? rows[0] : null;
  } catch (error) {
    throw new Error("Failed to fetch fiche by hash");
  }
};

const getDocumentByHash = async (hash) => {
  try {
    const query = `
    SELECT id
    FROM document
    WHERE hash = $1
  `;
    const values = [hash];

    const { rows } = await pool.query(query, values);

    return rows[0] ? rows[0] : null;
  } catch (error) {
    throw new Error("Failed to fetch document by hash");
  }
};

const getSourceByName = async (name) => {
  try {
    const query = `
    SELECT id
    FROM source
    WHERE name = $1
  `;
    const values = [name];

    const { rows } = await pool.query(query, values);

    return rows[0] ? rows[0] : null;
  } catch (error) {
    throw new Error("Failed to fetch source by name");
  }
};

while (true) {
  try {
    const result = await redis.blPop("uploadsToProcess", 0);
    const id = result?.element;

    const upload = await getUploadById(id);

    if (!upload) {
      continue;
    }

    const outputDir = path.join(TEMP_FOLDER, id);

    let { path: filePath } = upload;
    filePath = path.join(FILE_STORAGE_PATH, filePath);

    await processZipFile(filePath, outputDir, id);

    await fsp.rm(outputDir, { recursive: true, force: true });

    consoleLog(`✅ Done with ID: ${id}`, "green");
  } catch (err) {
    console.error("Worker error:", err);
  }
}
