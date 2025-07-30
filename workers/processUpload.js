import { pool, redis } from "./lib.js";
import dotenv from "dotenv";
import { calculateFileHash, HTTPError } from "./utils.js";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { DateTime } from "luxon";
import crypto from "crypto";
import JSZip from "jszip";

import StreamZip from "node-stream-zip";
import { pipeline } from "stream/promises";

dotenv.config();

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;
const TEMP_FOLDER = process.env.TEMP_FOLDER;

const processZipFile = async (filePath, outputDir, fileName, uploadId) => {
  const mainOutputDir = path.join(outputDir, "0", path.parse(fileName).name);
  await unzipFile(filePath, mainOutputDir);
  const filePaths = await listFilesRecursive(mainOutputDir);

  const folders = getFolders(filePaths);

  for (const folder of folders) {
    await processFolder(folder, filePaths, uploadId).catch(() => {});
  }

  const nestedZipPaths = filePaths.filter((filePath) =>
    filePath.endsWith(".zip")
  );
  for (const [index, filePath] of nestedZipPaths.entries()) {
    const nestedOutputDir = path.join(outputDir, `${index + 1}`);
    await processZipFile(
      filePath,
      nestedOutputDir,
      path.basename(filePath),
      uploadId
    ).catch(() => {});
  }
};

// const processZipFile = async (filePath, outputDir, fileName, uploadId) => {
//   return new Promise((resolve, reject) => {
//     const zip = new StreamZip({
//       file: filePath,
//       storeEntries: true,
//     });

//     // Handle corrupted archive or file error
//     zip.on("error", (err) => {
//       zip.close();
//       reject(new Error(`Erreur d'archive ZIP: ${err.message}`));
//     });

//     // When the zip is ready
//     zip.on("ready", async () => {
//       try {
//         // Ensure output directory exists
//         if (!fs.existsSync(outputDir)) {
//           fs.mkdirSync(outputDir, { recursive: true });
//         }

//         zip.extract(null, outputDir, (err, count) => {
//           zip.close();

//           if (err) {
//             return reject(new Error(`Échec de l'extraction: ${err.message}`));
//           }

//           console.log(
//             `✅ ${count} fichiers extraits pour l'upload ${uploadId}`
//           );
//           resolve();
//         });
//       } catch (err) {
//         zip.close();
//         reject(err);
//       }
//     });
//   });
// };

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
  } catch (error) {
    throw error;
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
  const jsonPath = productPaths.find((filePath) => isJson(folder, filePath));
  const fichePath = productPaths.find((filePath) => isFiche(folder, filePath));
  const sourceDocPaths = productPaths.filter((filePath) =>
    isSourceDoc(folder, filePath)
  );
  const originDocPaths = productPaths.filter((filePath) =>
    isOriginDoc(folder, filePath)
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
      docPaths[index - 1].originalPath = originDocPath;
    }
  }

  if (
    !jsonPath ||
    !fichePath ||
    !sourceDocPaths.length ||
    !originDocPaths.length
  ) {
    const message = "Fiche incomplète ou mal formée.";
    await createFailedFiche(folder, filePaths, uploadId, message);
    return;
  }

  const jsonContent = await fsp.readFile(jsonPath, "utf8");
  const { ficheData, docsData, pathsMapping } = await validateAndConstructData(
    folder,
    jsonPath,
    jsonContent,
    fichePath,
    docPaths,
    uploadId
  ).catch(async (error) => {
    const message =
      error instanceof HTTPError
        ? error.getMessage()
        : "Erreur interne du serveur";

    await createFailedFiche(folder, filePaths, uploadId, message);
    return;
  });

  await transaction(ficheData, docsData, pathsMapping).catch(async () => {
    const message =
      "Erreur lors de l'enregistrement des données dans la base de données";

    await createFailedFiche(folder, filePaths, uploadId, message);
    return;
  });
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

const isJson = (folder, filePath) => {
  const normalizeFolder = path.normalize(folder);
  const normalizePath = path.normalize(path.dirname(filePath));

  const jsonSuffix = "data.json";
  return filePath.endsWith(jsonSuffix) && normalizeFolder === normalizePath;
};

const isFiche = (folder, filePath) => {
  const normalizeFolder = path.normalize(folder);
  const normalizePath = path.normalize(path.dirname(filePath));

  const ficheExtension = ".docx";
  return filePath.endsWith(ficheExtension) && normalizeFolder === normalizePath;
};

const isSourceDoc = (folder, filePath) => {
  const normalizeFolder = path.normalize(folder);
  const normalizePath = path.normalize(path.dirname(filePath));

  const sourceExtensions = [".pdf", ".eml", ".xlsx"];
  return (
    sourceExtensions.some((extension) => filePath.endsWith(extension)) &&
    normalizeFolder === normalizePath
  );
};

const isOriginDoc = (folder, filePath) => {
  const normalizeFolder = path.normalize(path.join(folder, "Source"));
  const normalizePath = path.normalize(path.dirname(filePath));
  return normalizeFolder === normalizePath;
};

const validateAndConstructData = async (
  folder,
  jsonPath,
  jsonContent,
  fichePath,
  docPaths,
  uploadId
) => {
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
  const fiche = await getFicheByFileHash(hash);
  if (fiche)
    throw new HTTPError(
      "Une fiche identique existe déjà (hash de la fiche déjà enregistré)",
      409
    );

  if (!dump)
    throw new HTTPError(
      "Le champ 'dump' est manquant dans le fichier data.json",
      400
    );
  if (!sourceName)
    throw new HTTPError(
      "Le champ 'source' est manquant dans le fichier data.json",
      400
    );
  if (!summary)
    throw new HTTPError(
      "Le champ 'summary' est manquant dans le fichier data.json",
      400
    );
  if (!object)
    throw new HTTPError(
      "Le champ 'object' est manquant dans le fichier data.json",
      400
    );
  if (!date)
    throw new HTTPError(
      "Le champ 'date_generate' est manquant dans le fichier data.json",
      400
    );

  const source = await getSourceByName(sourceName);
  if (!source)
    throw new HTTPError("La source spécifiée est invalide ou inconnue", 400);

  if (date.toString() === "Invalid Date")
    throw new HTTPError(
      "Le champ 'date_generate' est invalide ou mal formaté dans le fichier data.json",
      400
    );

  if (!files)
    throw new HTTPError(
      "Le champ 'files' contenant les documents est manquant dans le fichier data.json",
      400
    );

  if (files.length !== Object.keys(docPaths).length)
    throw new HTTPError(
      "Le nombre de documents spécifiés dans le champ 'files' ne correspond pas aux fichiers présents",
      400
    );

  for (const file of files) {
    const { type, fileName, originalFileName, content, meta } = file;

    if (!fileName)
      throw new HTTPError(
        `Le champ 'files.name.filename' est manquant pour un fichier`,
        400
      );

    if (!originalFileName)
      throw new HTTPError(
        `Le champ 'files.original.filename' est manquant pour le fichier '${fileName}'`,
        400
      );

    if (!type)
      throw new HTTPError(
        `Le champ 'type' est manquant pour le fichier '${fileName}'`,
        400
      );

    if (!content)
      throw new HTTPError(
        `Le champ 'content' est manquant pour le fichier '${fileName}'`,
        400
      );

    if (!meta && type === "Message")
      throw new HTTPError(
        `Le champ 'meta' est manquant pour le fichier '${fileName}'`,
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
    path.basename(folder)
  );

  const ref = "ABC-" + Math.floor(100 + Math.random() * 900);

  ficheData.ref = ref;
  ficheData.source_id = source.id;
  ficheData.date = date;
  ficheData.object = object;
  ficheData.summary = summary;
  ficheData.file_hash = hash;
  ficheData.file_path = path.join(productPath, path.basename(fichePath));
  ficheData.upload_id = uploadId;
  ficheData.dump = { dump_name: dump };

  pathsMapping.push([fichePath, ficheData.file_path]);

  const jsonNewPath = path.join(productPath, path.basename(jsonPath));
  pathsMapping.push([jsonPath, jsonNewPath]);

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const docData = {};

    if (!docPaths[index]?.sourcePath)
      throw new HTTPError(
        `Le document '${file.fileName}' est manquant dans le téléversement`,
        400
      );
    if (!docPaths[index]?.originalPath)
      throw new HTTPError(
        `L'original du document '${file.fileName}' est manquant dans le téléversement`,
        400
      );

    const { sourcePath, originalPath } = docPaths[index];

    const hash = await calculateFileHash(sourcePath);
    const document = await getDocumentByFileHash(hash);
    if (document)
      throw new HTTPError(
        `Le document '${file.fileName}' existe déjà (hash du fichier déjà enregistré)`,
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
    docData.file_path = path.join(productPath, path.basename(sourcePath));
    docData.file_hash = hash;
    docData.content = content;
    docData.meta = meta;
    docData.dump = { dump_name: dump, file_path: pathInDump };

    pathsMapping.push([sourcePath, docData.file_path]);

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
        file_path: originalNewPath,
        file_hash: originalHash,
      };
      docData.original = original;
    } else if (type === "Message") {
      if (!meta) {
        throw new HTTPError(
          `Les métadonnées (files.meta) du Message '${fileName}' sont absentes dans le fichier data.json`,
          400
        );
      }
      const { from, to, date, object } = meta;
      if (!from || !to || to.length === 0 || !date || !object) {
        throw new HTTPError(
          `Les métadonnées (files.meta) du Message '${fileName}' sont incomplètes ou invalides dans le fichier data.json`,
          400
        );
      }
    }

    docsData.push(docData);
  }

  return { ficheData, docsData, pathsMapping };
};

const transaction = async (ficheData, docsData, pathsMapping) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO fiches (${Object.keys(ficheData).join(", ")}) 
      values (${Object.keys(ficheData)
        .map((_, i) => `$${i + 1}`)
        .join(", ")}) 
      RETURNING id`;

    const values = Object.values(ficheData);

    const { rows, rowCount } = await client.query(query, values);

    if (!rowCount) return null;

    const ficheId = rows[0].id;

    for (const docData of docsData) {
      docData.fiche_id = ficheId;

      const query = `
      INSERT INTO documents (${Object.keys(docData).join(", ")}) 
      values (${Object.keys(docData)
        .map((_, i) => `$${i + 1}`)
        .join(", ")}) 
      RETURNING id`;

      const values = Object.values(docData);

      await client.query(query, values);
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
    throw error;
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

const createFailedFiche = async (folder, filePaths, uploadId, message) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productPaths = getProductPaths(folder, filePaths);
    const jsonPath = productPaths.find((filePath) => isJson(folder, filePath));
    const fichePath = productPaths.find((filePath) =>
      isFiche(folder, filePath)
    );
    const sourceDocPaths = productPaths.filter((filePath) =>
      isSourceDoc(folder, filePath)
    );
    const originDocPaths = productPaths.filter((filePath) =>
      isOriginDoc(folder, filePath)
    );

    const zip = new JSZip();
    let source, dump, date;
    if (jsonPath) {
      const jsonContent = await fsp.readFile(jsonPath, "utf8");
      zip.file(path.basename(jsonPath), jsonContent);

      const jsonObject = JSON.parse(jsonContent);
      source = jsonObject?.source?.name;
      dump = jsonObject?.index;
      date = new Date(jsonObject?.date_generate);
    }
    if (fichePath) {
      const ficheContent = await fsp.readFile(fichePath);
      zip.file(path.basename(fichePath), ficheContent);
    }
    for (const sourceDocPath of sourceDocPaths) {
      const content = await fsp.readFile(sourceDocPath);
      zip.file(path.basename(sourceDocPath), content);
    }
    for (const originDocPath of originDocPaths) {
      const content = await fsp.readFile(originDocPath);
      zip.file(path.basename(originDocPath), content);
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    date = !isNaN(date.getTime()) ? date : undefined;
    const formatDate = date
      ? DateTime.fromJSDate(date).setLocale("fr").toFormat("yyyyMMdd")
      : "unknown";

    const fileName = `Fiche échouée - ${path.basename(folder)}.zip`;
    const filePath = path.join("data", "failedFiches", formatDate, fileName);
    const absFilePath = path.join(FILE_STORAGE_PATH, filePath);

    const data = {};

    if (source) {
      const sourceRecord = await getSourceByName(source);
      if (sourceRecord) {
        data.source_id = sourceRecord.id;
      }
    }
    if (dump) {
      data.dump = { dump_name: dump };
    }

    if (date) {
      data.date = date;
    }
    data.upload_id = uploadId;
    data.file_name = fileName;
    data.file_path = filePath;
    data.message = message;
    data.file_hash = crypto
      .createHash("sha256")
      .update(zipContent)
      .digest("hex");

    const query = `
    INSERT INTO failed_fiches (${Object.keys(data).join(", ")})
    VALUES (${Object.keys(data)
      .map((_, i) => `$${i + 1}`)
      .join(", ")})
    RETURNING id;
  `;
    const values = Object.values(data);

    const { rowCount } = await pool.query(query, values);

    if (!rowCount) return null;

    await fsp.mkdir(path.dirname(absFilePath), { recursive: true });
    await fsp.writeFile(absFilePath, zipContent);

    await client.query("COMMIT");
    client.release();
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
  }
};

// DB
const getUploadById = async (id) => {
  const query = `
      SELECT *
      FROM uploads
      WHERE id = $1`;
  const values = [id];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

const getFicheByFileHash = async (file_hash) => {
  const query = `
    SELECT *
    FROM fiches
    WHERE file_hash = $1
  `;
  const values = [file_hash];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

const getDocumentByFileHash = async (file_hash) => {
  const query = `
    SELECT *
    FROM documents
    WHERE file_hash = $1
  `;
  const values = [file_hash];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

const getSourceByName = async (name) => {
  const query = `
    SELECT id
    FROM sources
    WHERE name = $1
  `;
  const values = [name];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

const createProcess = async (data) => {
  const query = `
    WITH inserted AS (
      INSERT INTO processes (${Object.keys(data).join(", ")})
      VALUES (${Object.keys(data)
        .map((_, i) => `$${i + 1}`)
        .join(", ")})
      RETURNING *
    )
    SELECT inserted.*, users.username
    FROM inserted
    LEFT JOIN users ON inserted.user_id = users.id
  `;

  const values = Object.values(data);

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

const updateProcessById = async (id, update) => {
  const values = [];
  const updateQuery = Object.entries(update)
    .map(([key, value]) => {
      values.push(value);
      return `${key} = $${values.length}`;
    })
    .join(", ");

  values.push(id);

  const query = `
    WITH updated AS (
      UPDATE processes
      SET ${updateQuery}
      WHERE id = $${values.length}
      RETURNING *
    )
    SELECT updated.*, users.username
    FROM updated
    LEFT JOIN users ON updated.user_id = users.id
  `;

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

while (true) {
  try {
    const result = await redis.blPop("processQueue", 0);
    const task = JSON.parse(result?.element);
    const { upload_id, user_id, attempt, taskId } = task;

    const newProcess = {
      upload_id,
      user_id,
      started_at: new Date(),
      status: "processing",
      attempt,
    };

    const process = await createProcess(newProcess);
    const processId = process.id;

    try {
      const upload = await getUploadById(upload_id);

      const outputDir = path.join(TEMP_FOLDER, upload_id);

      let { file_path, file_name } = upload;
      file_path = path.join(FILE_STORAGE_PATH, file_path);

      await processZipFile(file_path, outputDir, file_name, upload_id);

      const process = await updateProcessById(processId, {
        status: "completed",
        ended_at: new Date(),
      });
      await redis.publish(taskId, JSON.stringify(process));
    } catch {
      const process = await updateProcessById(processId, {
        status: "failed",
        ended_at: new Date(),
        remark: "put some remarks here!",
      });
      await redis.publish(taskId, JSON.stringify(process));
    }

    await fsp.rm(TEMP_FOLDER, { recursive: true, force: true });

    console.log(`Processing done with ID: ${upload_id}`);
  } catch (err) {
    console.error("Worker error:", err);
  }
}
