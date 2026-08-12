import type {
  QrDecorationOptions,
} from "../types/pdfQr";

export interface DecoratedQrResult {
  canvas: HTMLCanvasElement;

  blob: Blob;

  width: number;
  height: number;

  qrX: number;
  qrY: number;

  qrWidth: number;
  qrHeight: number;

  titleX: number;
  titleY: number;

  titleWidth: number;
  titleHeight: number;

  fontSize: number;
}

/**
 * Load image từ File / Blob / URL.
 */
export function loadImage(
  source:
    | Blob
    | string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      let objectUrl:
        string | null = null;

      if (
        typeof source ===
        "string"
      ) {
        image.src =
          source;
      } else {
        objectUrl =
          URL.createObjectURL(
            source
          );

        image.src =
          objectUrl;
      }

      image.onload = () => {
        if (objectUrl) {
          URL.revokeObjectURL(
            objectUrl
          );
        }

        resolve(image);
      };

      image.onerror = () => {
        if (objectUrl) {
          URL.revokeObjectURL(
            objectUrl
          );
        }

        reject(
          new Error(
            "Không thể load QR Code"
          )
        );
      };
    }
  );
}

/**
 * Đo text.
 *
 * Tương đương phần ImageDraw.textbbox()
 * bên Python.
 */
function measureText(
  text: string,
  fontSize: number,
  fontFamily: string
) {
  const canvas =
    document.createElement(
      "canvas"
    );

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Không thể tạo canvas"
    );
  }

  ctx.font =
    `bold ${fontSize}px ${fontFamily}`;

  const metrics =
    ctx.measureText(
      text
    );

  return {
    width:
      metrics.width,

    height:
      metrics.actualBoundingBoxAscent +
      metrics.actualBoundingBoxDescent,
  };
}

/**
 * Tương đương fit_font()
 * của Python.
 *
 * Font sẽ giảm dần cho tới khi
 * tên nằm vừa chiều rộng QR.
 */
export function fitFont(
  text: string,
  width: number,

  fontSize: number,
  minFontSize: number,

  fontFamily =
    "Arial, Helvetica, sans-serif"
) {
  let size =
    fontSize;

  while (
    size >=
    minFontSize
  ) {
    const measured =
      measureText(
        text,
        size,
        fontFamily
      );

    if (
      measured.width <=
      width - 20
    ) {
      return {
        size,

        width:
          measured.width,

        height:
          measured.height,
      };
    }

    size--;
  }

  const measured =
    measureText(
      text,
      minFontSize,
      fontFamily
    );

  return {
    size:
      minFontSize,

    width:
      measured.width,

    height:
      measured.height,
  };
}

/**
 * Canvas → PNG Blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(
              new Error(
                "Không thể tạo PNG"
              )
            );

            return;
          }

          resolve(blob);
        },
        "image/png"
      );
    }
  );
}

/**
 * Decorate QR.
 *
 * containerWidth / containerHeight
 * chính là KÍCH THƯỚC VÙNG MÀ USER
 * CHỌN BẰNG 2 ĐIỂM.
 *
 * Toàn bộ QR + title bắt buộc nằm
 * trong vùng này.
 */
export async function decorateQr(
  qrSource:
    | Blob
    | string,

  schoolName: string,

  containerWidth: number,
  containerHeight: number,

  options:
    QrDecorationOptions
): Promise<DecoratedQrResult> {
  const image =
    await loadImage(
      qrSource
    );

  const width =
    Math.max(
      1,
      Math.round(
        containerWidth
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        containerHeight
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    width;

  canvas.height =
    height;

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Canvas không hỗ trợ"
    );
  }

  /*
   * ============================
   * BACKGROUND
   * ============================
   */

  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  const padding =
    Math.max(
      0,
      options.padding
    );

  const gap =
    Math.max(
      0,
      options.gap
    );

  const availableWidth =
    Math.max(
      1,
      width -
        padding * 2
    );

  const availableHeight =
    Math.max(
      1,
      height -
        padding * 2
    );

  /*
   * ============================
   * KHÔNG CHÈN TÊN
   * ============================
   */

  if (
    !options.enabled ||
    !schoolName.trim()
  ) {
    const scale =
      Math.min(
        availableWidth /
          image.naturalWidth,

        availableHeight /
          image.naturalHeight
      );

    const qrWidth =
      image.naturalWidth *
      scale;

    const qrHeight =
      image.naturalHeight *
      scale;

    const qrX =
      (width -
        qrWidth) /
      2;

    const qrY =
      (height -
        qrHeight) /
      2;

    ctx.imageSmoothingEnabled =
      false;

    ctx.drawImage(
      image,

      qrX,
      qrY,

      qrWidth,
      qrHeight
    );

    const blob =
      await canvasToBlob(
        canvas
      );

    return {
      canvas,
      blob,

      width,
      height,

      qrX,
      qrY,

      qrWidth,
      qrHeight,

      titleX: 0,
      titleY: 0,

      titleWidth: 0,
      titleHeight: 0,

      fontSize: 0,
    };
  }

  /*
   * ============================
   * CÓ CHÈN TÊN
   * ============================
   */

  const fontFamily =
    "Arial, Helvetica, sans-serif";

  /*
   * Đây chính là fit_font()
   * của Python.
   */
  const font =
    fitFont(
      schoolName,

      availableWidth,

      options.fontSize,
      options.minFontSize,

      fontFamily
    );

  const titleHeight =
    font.height;

  /*
   * ============================
   * VÙNG QR CÒN LẠI
   * ============================
   *
   * Không được dùng toàn bộ
   * containerHeight nữa.
   */

  const qrAreaHeight =
    availableHeight -
    titleHeight -
    gap;

  if (
    qrAreaHeight <= 0
  ) {
    throw new Error(
      "Vùng chọn quá nhỏ để chứa tên và QR"
    );
  }

  /*
   * ============================
   * SCALE QR
   * ============================
   */

  const scale =
    Math.min(
      availableWidth /
        image.naturalWidth,

      qrAreaHeight /
        image.naturalHeight
    );

  const qrWidth =
    image.naturalWidth *
    scale;

  const qrHeight =
    image.naturalHeight *
    scale;

  /*
   * ============================
   * TITLE
   * ============================
   */

  const titleX =
    (width -
      font.width) /
    2;

  const titleY =
    padding;

  /*
   * ============================
   * QR
   * ============================
   */

  const qrX =
    (width -
      qrWidth) /
    2;

  const qrY =
    padding +
    titleHeight +
    gap +
    (qrAreaHeight -
      qrHeight) /
      2;

  /*
   * ============================
   * DRAW TITLE
   * ============================
   */

  ctx.font =
    `bold ${font.size}px ${fontFamily}`;

  ctx.fillStyle =
    options.textColor;

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "top";

  ctx.fillText(
    schoolName,
    width / 2,
    titleY
  );

  /*
   * ============================
   * LINE
   * ============================
   */

  if (
    options.lineEnabled
  ) {
    const lineY =
      titleY +
      titleHeight +
      gap / 2;

    ctx.strokeStyle =
      options.lineColor;

    ctx.lineWidth =
      1;

    ctx.beginPath();

    ctx.moveTo(
      padding,
      lineY
    );

    ctx.lineTo(
      width -
        padding,
      lineY
    );

    ctx.stroke();
  }

  /*
   * ============================
   * DRAW QR
   * ============================
   */

  ctx.imageSmoothingEnabled =
    false;

  ctx.drawImage(
    image,

    qrX,
    qrY,

    qrWidth,
    qrHeight
  );

  const blob =
    await canvasToBlob(
      canvas
    );

  return {
    canvas,
    blob,

    width,
    height,

    qrX,
    qrY,

    qrWidth,
    qrHeight,

    titleX,
    titleY,

    titleWidth:
      font.width,

    titleHeight,

    fontSize:
      font.size,
  };
}