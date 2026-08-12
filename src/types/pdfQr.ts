export interface Point {
  x: number;
  y: number;
}

export interface CalibrationRect {
  page: number;

  x: number;
  y: number;

  width: number;
  height: number;

  /**
   * Kích thước vùng trên canvas preview.
   * Dùng để render preview đúng tỷ lệ.
   */
  screenWidth: number;
  screenHeight: number;
}

export interface QrFile {
  id: string;

  file: File;

  fileName: string;

  schoolName: string;

  schoolCode: string;

  previewUrl: string;
}

export interface QrDecorationOptions {
  /**
   * Có chèn tên phía trên QR hay không.
   */
  enabled: boolean;

  /**
   * Font bắt đầu.
   */
  fontSize: number;

  /**
   * Font nhỏ nhất.
   */
  minFontSize: number;

  /**
   * Padding bên trong vùng.
   */
  padding: number;

  /**
   * Khoảng cách giữa tên và QR.
   */
  gap: number;

  /**
   * Màu chữ.
   */
  textColor: string;

  /**
   * Có đường kẻ hay không.
   */
  lineEnabled: boolean;

  /**
   * Màu đường kẻ.
   */
  lineColor: string;
}