import path from "path";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const generateFiche = async (date, source, object, summary) => {
  const pdfDoc = await PDFDocument.create();
  const pageSize = [595.28, 841.89]; // A4 size
  const margin = 50;
  const fontSize = 12;
  const lineHeight = 18;
  const maxWidth = pageSize[0] - margin * 2;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const formatDate = (d) => {
    const dateObj = new Date(d);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const wrapText = (text, font, size, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
      const testLine = line + word + " ";
      const testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth) {
        lines.push(line.trim());
        line = word + " ";
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line.trim());
    return lines;
  };

  let page = pdfDoc.addPage(pageSize);
  let y = page.getHeight() - margin;

  const addNewPageIfNeeded = () => {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage(pageSize);
      y = page.getHeight() - margin;
    }
  };

  const rightAlignTextWithUnderline = (label, value, yOffset) => {
    const labelFontSize = fontSize;
    const valueFontSize = fontSize;
    const labelWidth = font.widthOfTextAtSize(label, labelFontSize);
    const valueWidth = font.widthOfTextAtSize(value, valueFontSize);
    const totalWidth = labelWidth + valueWidth + 5;

    const x = page.getWidth() - margin - totalWidth;

    page.drawText(label, {
      x,
      y: yOffset,
      size: labelFontSize,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x, y: yOffset - 2 },
      end: { x: x + labelWidth, y: yOffset - 2 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawText(` ${value}`, {
      x: x + labelWidth,
      y: yOffset,
      size: valueFontSize,
      font,
      color: rgb(0, 0, 0),
    });
  };

  const formattedDate = formatDate(date);
  const capitalizedSource = source.charAt(0).toUpperCase() + source.slice(1);

  // Top-right Date & Source
  rightAlignTextWithUnderline("Date :", formattedDate, y);
  y -= lineHeight * 2;

  // Title
  const title = "Fiche de programme";
  const titleSize = fontSize + 6;
  const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
  const titleX = (page.getWidth() - titleWidth) / 2;

  page.drawText(title, {
    x: titleX,
    y,
    size: titleSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= lineHeight;

  rightAlignTextWithUnderline("Source :", capitalizedSource, y);
  y -= lineHeight * 2;

  // Object label (bold)
  page.drawText("Object :", {
    x: margin,
    y,
    size: fontSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= lineHeight;

  // Object content (wrapped, normal font)
  const objectLines = wrapText(object, font, fontSize, maxWidth);
  for (const line of objectLines) {
    addNewPageIfNeeded();
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }

  y -= lineHeight;

  // Summary (wrapped, normal font)
  const summaryLines = wrapText(summary, font, fontSize, maxWidth);
  for (const line of summaryLines) {
    addNewPageIfNeeded();
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

export const getUploadBuffer = async (id, user) => {
  const { data, error } = getUploadById(id, user);

  if (error) return error;

  const { file_path: filePath, file_name: fileName } = data;

  const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
  const fileBuffer = fs.readFileSync(absFilePath);

  return { fileBuffer, fileName };
};

export const getFicheBuffer = async (id, user) => {
  const { data, error } = getFicheById(id, user);

  if (error) return error;

  const { file_path: filePath, file_name: fileName } = data;

  const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
  const fileBuffer = fs.readFileSync(absFilePath);

  return { fileBuffer, fileName };
};

export const getDocumentBuffer = async (id, user) => {
  const { data, error } = getDocumentById(id, user);

  if (error) return error;

  const { file_path: filePath, file_name: fileName } = data;

  const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
  const fileBuffer = fs.readFileSync(absFilePath);

  return { fileBuffer, fileName };
};

export const getFailedFicheBuffer = async (id, user) => {
  const { data, error } = getFailedFicheById(id, user);

  if (error) return error;

  const { file_path: filePath, file_name: fileName } = data;

  const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
  const fileBuffer = fs.readFileSync(absFilePath);

  return { fileBuffer, fileName };
};

export const getReportBuffer = async (id, user, options) => {};
