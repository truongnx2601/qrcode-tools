import type {
  Point,
  CalibrationRect,
} from "../types/pdfQr";

export function createCalibrationRect(
  point1: Point,
  point2: Point,

  page: number,

  screenWidth: number,
  screenHeight: number,

  pdfWidth: number,
  pdfHeight: number
): CalibrationRect {
  const screenRectWidth =
    point2.x - point1.x;

  const screenRectHeight =
    point2.y - point1.y;

  /*
   * Canvas coordinate
   *
   * → PDF coordinate
   *
   * PyMuPDF cũng dùng origin
   * phía trên bên trái cho page.rect
   * nên không cần đảo Y ở đây.
   */

  const scaleX =
    pdfWidth /
    screenWidth;

  const scaleY =
    pdfHeight /
    screenHeight;

  return {
    page,

    x:
      point1.x * scaleX,

    y:
      point1.y * scaleY,

    width:
      screenRectWidth * scaleX,

    height:
      screenRectHeight * scaleY,

    screenWidth:
      screenRectWidth,

    screenHeight:
      screenRectHeight,
  };
}