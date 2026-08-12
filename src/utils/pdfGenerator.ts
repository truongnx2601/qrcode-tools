import {
  PDFDocument,
} from "pdf-lib";

import JSZip from "jszip";

import type {
  CalibrationRect,
  QrDecorationOptions,
  QrFile,
} from "../types/pdfQr";

import {
  decorateQr,
} from "./qrDecorator";

// ============================================================
// TYPES
// ============================================================

export interface GenerateProgress {
  current: number;
  total: number;
  qr: QrFile;
}

export interface GeneratePdfOptions {
  onProgress?: (
    current: number,
    total: number,
    qr: QrFile,
  ) => void;
}

// ============================================================
// HELPERS
// ============================================================

async function blobToUint8Array(
  blob: Blob,
): Promise<Uint8Array> {
  const buffer =
    await blob.arrayBuffer();

  return new Uint8Array(
    buffer,
  );
}

// ============================================================
// TYPESCRIPT 6
//
// Uint8Array<ArrayBufferLike>
// không luôn tương thích BlobPart.
//
// Copy sang ArrayBuffer thật.
// ============================================================

function toArrayBuffer(
  bytes: Uint8Array,
): ArrayBuffer {
  const buffer =
    new ArrayBuffer(
      bytes.byteLength,
    );

  new Uint8Array(
    buffer,
  ).set(bytes);

  return buffer;
}

// ============================================================
// FILE NAME
// ============================================================

function removeExtension(
  fileName: string,
): string {
  return fileName.replace(
    /\.[^/.]+$/,
    "",
  );
}

// ============================================================
// GENERATE ONE PDF
// ============================================================

export async function generatePdf(
  templateFile: File,
  qr: QrFile,
  calibration: CalibrationRect,
  options: QrDecorationOptions,
): Promise<Blob> {

  // ==========================================================
  // VALIDATION
  // ==========================================================

  if (!templateFile) {
    throw new Error(
      "Chưa chọn template PDF.",
    );
  }

  if (!qr) {
    throw new Error(
      "Chưa chọn QR Code.",
    );
  }

  if (!calibration) {
    throw new Error(
      "Chưa xác định vùng chèn QR.",
    );
  }

  if (
    calibration.width <= 0 ||
    calibration.height <= 0
  ) {
    throw new Error(
      "Kích thước vùng QR không hợp lệ.",
    );
  }

  // ==========================================================
  // LOAD TEMPLATE
  // ==========================================================

  const templateBytes =
    await blobToUint8Array(
      templateFile,
    );

  const pdfDoc =
    await PDFDocument.load(
      templateBytes,
    );

  // ==========================================================
  // PAGE
  // ==========================================================

  const pageCount =
    pdfDoc.getPageCount();

  if (
    calibration.page < 0 ||
    calibration.page >= pageCount
  ) {
    throw new Error(
      `Page ${
        calibration.page + 1
      } không tồn tại.`,
    );
  }

  const page =
    pdfDoc.getPage(
      calibration.page,
    );

  // ==========================================================
  // PDF PAGE SIZE
  //
  // pdf-lib:
  //
  // origin = BOTTOM LEFT
  // ==========================================================

  const pageHeight =
    page.getHeight();

  // ==========================================================
  // DECORATE QR
  //
  // decorateQr tạo MỘT image duy nhất:
  //
  // ┌───────────────────────┐
  // │       TÊN TRƯỜNG      │
  // │───────────────────────│
  // │                       │
  // │        QR CODE        │
  // │                       │
  // └───────────────────────┘
  //
  // Nếu options.enabled = false:
  //
  // ┌───────────────────────┐
  // │                       │
  // │        QR CODE        │
  // │                       │
  // └───────────────────────┘
  // ==========================================================

  const decorated =
    await decorateQr(
      qr.file,
      qr.schoolName,
      calibration.width,
      calibration.height,
      options,
    );

  // ==========================================================
  // EMBED PNG
  // ==========================================================

  const imageBytes =
    await blobToUint8Array(
      decorated.blob,
    );

  const image =
    await pdfDoc.embedPng(
      imageBytes,
    );

  // ==========================================================
  // CALIBRATION RECTANGLE
  //
  // IMPORTANT:
  //
  // calibration.y được lưu theo TOP-LEFT
  // giống PDF.js.
  //
  // pdf-lib dùng BOTTOM-LEFT.
  //
  // Vì vậy:
  //
  // bottomY =
  // pageHeight
  // - topY
  // - height
  // ==========================================================

  const x =
    calibration.x;

  const topY =
    calibration.y;

  const width =
    calibration.width;

  const height =
    calibration.height;

  const bottomY =
    pageHeight -
    topY -
    height;

  // ==========================================================
  // IMAGE SIZE
  // ==========================================================

  const imageWidth =
    image.width;

  const imageHeight =
    image.height;

  // ==========================================================
  // KEEP PROPORTION
  //
  // Toàn bộ image phải nằm trong rectangle.
  //
  // Không stretch.
  // Không vượt vùng.
  // ==========================================================

  const scale =
    Math.min(
      width / imageWidth,
      height / imageHeight,
    );

  const drawWidth =
    imageWidth * scale;

  const drawHeight =
    imageHeight * scale;

  // ==========================================================
  // CENTER INSIDE CALIBRATION
  // ==========================================================

  const drawX =
    x +
    (width - drawWidth) / 2;

  const drawY =
    bottomY +
    (height - drawHeight) / 2;

  // ==========================================================
  // DRAW
  // ==========================================================

  page.drawImage(
    image,
    {
      x:
        drawX,

      y:
        drawY,

      width:
        drawWidth,

      height:
        drawHeight,
    },
  );

  // ==========================================================
  // SAVE
  // ==========================================================

  const pdfBytes =
    await pdfDoc.save();

  const pdfBuffer =
    toArrayBuffer(
      pdfBytes,
    );

  return new Blob(
    [
      pdfBuffer,
    ],
    {
      type:
        "application/pdf",
    },
  );
}

// ============================================================
// DOWNLOAD BLOB
// ============================================================

export function downloadBlob(
  blob: Blob,
  fileName: string,
): void {

  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      "a",
    );

  anchor.href =
    url;

  anchor.download =
    fileName;

  document.body.appendChild(
    anchor,
  );

  anchor.click();

  anchor.remove();

  // Chờ browser sử dụng URL xong
  // rồi mới revoke.
  setTimeout(() => {
    URL.revokeObjectURL(
      url,
    );
  }, 100);
}

// ============================================================
// GENERATE ZIP
// ============================================================

export async function generatePdfZip(
  templateFile: File,
  qrs: QrFile[],
  calibration: CalibrationRect,
  options: QrDecorationOptions,
  onProgress?: (
    current: number,
    total: number,
    qr: QrFile,
  ) => void,
): Promise<Blob> {

  // ==========================================================
  // VALIDATION
  // ==========================================================

  if (!templateFile) {
    throw new Error(
      "Chưa chọn template PDF.",
    );
  }

  if (!qrs.length) {
    throw new Error(
      "Chưa có QR Code.",
    );
  }

  if (!calibration) {
    throw new Error(
      "Chưa xác định vùng chèn QR.",
    );
  }

  // ==========================================================
  // ZIP
  // ==========================================================

  const zip =
    new JSZip();

  const total =
    qrs.length;

  // ==========================================================
  // PROCESS
  // ==========================================================

  for (
    let index = 0;
    index < qrs.length;
    index++
  ) {

    const qr =
      qrs[index];

    if (!qr) {
      continue;
    }

    const current =
      index + 1;

    // ========================================================
    // GENERATE PDF
    // ========================================================

    const pdfBlob =
      await generatePdf(
        templateFile,
        qr,
        calibration,
        options,
      );

    // ========================================================
    // FILE NAME
    //
    // Ví dụ:
    //
    // Nguyen Van A_123.png
    //
    // =>
    //
    // Nguyen Van A_123.pdf
    // ========================================================

    const baseName =
      removeExtension(
        qr.fileName,
      );

    const pdfFileName =
      `${baseName}.pdf`;

    // ========================================================
    // ADD ZIP
    // ========================================================

    zip.file(
      pdfFileName,
      pdfBlob,
    );

    // ========================================================
    // PROGRESS
    // ========================================================

    onProgress?.(
      current,
      total,
      qr,
    );
  }

  // ==========================================================
  // CREATE ZIP
  // ==========================================================

  return await zip.generateAsync(
    {
      type:
        "blob",

      compression:
        "DEFLATE",

      compressionOptions: {
        level: 6,
      },
    },
  );
}