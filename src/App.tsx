import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PdfViewer from "./components/PdfViewer";
import QrPanel from "./components/QrPanel";
import CalibrationInfo from "./components/CalibrationInfo";

import {
  downloadBlob,
  generatePdfZip,
} from "./utils/pdfGenerator";

import type {
  CalibrationRect,
  QrDecorationOptions,
  QrFile,
} from "./types/pdfQr";


/*
 * =====================================================
 * DEFAULT OPTIONS
 * =====================================================
 */

const DEFAULT_OPTIONS:
  QrDecorationOptions = {
    enabled: true,

    fontSize: 14,

    minFontSize: 12,

    padding: 0,

    gap: 0,

    textColor: "#dc0000",

    lineEnabled: false,

    lineColor: "#b4b4b4",
  };


/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

/**
 * Parse filename giống Python:
 *
 * if "_" in stem:
 *     school_name, school_code = stem.rsplit("_", 1)
 *
 * Ví dụ:
 *
 * abc_xyz.png
 *
 * schoolName = abc
 * schoolCode = xyz
 */
function parseQrFilename(
  fileName: string,
) {

  const dotIndex =
    fileName.lastIndexOf(".");

  const stem =
    dotIndex >= 0
      ? fileName.slice(
          0,
          dotIndex,
        )
      : fileName;

  const underscore =
    stem.lastIndexOf("_");

  if (
    underscore >= 0
  ) {

    return {
      schoolName:
        stem.slice(
          0,
          underscore,
        ),

      schoolCode:
        stem.slice(
          underscore + 1,
        ),
    };
  }

  return {
    schoolName: stem,
    schoolCode: "",
  };
}


/**
 * Tạo QrFile từ File.
 */
function createQrFile(
  file: File,
): QrFile {

  const parsed =
    parseQrFilename(
      file.name,
    );

  return {
    id:
      `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,

    file,

    fileName:
      file.name,

    schoolName:
      parsed.schoolName,

    schoolCode:
      parsed.schoolCode,

    previewUrl:
      URL.createObjectURL(
        file,
      ),
  };
}

function getOutputFileName(): string {
  const now = new Date();

  const dd = String(now.getDate()).padStart(2, "0");
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `output-${dd}${MM}${yyyy}${hh}${mm}${ss}.zip`;
}

/*
 * =====================================================
 * APP
 * =====================================================
 */

export default function App() {

  /*
   * PDF template
   */

  const [
    pdfFile,
    setPdfFile,
  ] = useState<File | null>(
    null,
  );


  /*
   * QR files
   */

  const [
    qrs,
    setQrs,
  ] = useState<QrFile[]>(
    [],
  );


  /*
   * QR selected
   */

  const [
    selectedQr,
    setSelectedQr,
  ] = useState<QrFile | null>(
    null,
  );


  /*
   * Calibration
   */

  const [
    calibration,
    setCalibration,
  ] =
    useState<CalibrationRect | null>(
      null,
    );


  /*
   * Current PDF page
   *
   * PdfViewer của bạn dùng 1-based.
   */

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);


  /*
   * Zoom
   */

  const [
    zoom,
    setZoom,
  ] = useState(1);


  /*
   * Số page
   */

  const [
    pageCount,
    setPageCount,
  ] = useState(0);


  /*
   * QR options
   */

  const [
    options,
    setOptions,
  ] =
    useState<QrDecorationOptions>(
      DEFAULT_OPTIONS,
    );


  /*
   * Generate state
   */

  const [
    generating,
    setGenerating,
  ] = useState(false);


  /*
   * Progress
   */

  const [
    progress,
    setProgress,
  ] = useState({
    current: 0,
    total: 0,
    name: "",
  });


  /*
   * Message
   */

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  );


  /*
   * =====================================================
   * PREVIEW SIZE
   * =====================================================
   *
   * Calibration screenWidth / screenHeight
   * là kích thước vùng đã click trên PDF.
   *
   * Dùng để preview.
   */

  const previewSize =
    useMemo(() => {

      if (!calibration) {

        return {
          width: 280,
          height: 280,
        };
      }

      /*
       * Preview không cần quá lớn.
       *
       * Giữ tỷ lệ của bounding box.
       */

      const maxWidth = 320;
      const maxHeight = 320;

      const scale =
        Math.min(
          maxWidth /
            calibration.screenWidth,

          maxHeight /
            calibration.screenHeight,
        );

      return {
        width:
          Math.max(
            1,
            calibration.screenWidth *
              scale,
          ),

        height:
          Math.max(
            1,
            calibration.screenHeight *
              scale,
          ),
      };

    }, [
      calibration,
    ]);


  /*
   * =====================================================
   * PDF FILE
   * =====================================================
   */

  function handlePdfChange(
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setPdfFile(file);

    setCurrentPage(1);

    setCalibration(null);

    setMessage(null);

    /*
     * PdfViewer tự render.
     *
     * Page count nếu muốn chính xác có thể
     * lấy từ PDF.js.
     *
     * Hiện tại để 1.
     */

    setPageCount(1);
  }


  /*
   * =====================================================
   * QR FILES
   * =====================================================
   */

  function handleQrChange(
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) {

    const files =
      Array.from(
        event.target.files ?? [],
      );

    if (
      files.length === 0
    ) {
      return;
    }

    /*
     * Chỉ nhận image.
     */

    const imageFiles =
      files.filter(
        file =>
          file.type ===
            "image/png" ||
          file.type ===
            "image/jpeg" ||
          file.type ===
            "image/jpg",
      );

    const newQrs =
      imageFiles.map(
        createQrFile,
      );

    setQrs(
      prev => [
        ...prev,
        ...newQrs,
      ],
    );

    /*
     * Auto select QR đầu tiên
     */

    if (
      !selectedQr &&
      newQrs.length > 0
    ) {
      setSelectedQr(
        newQrs[0],
      );
    }

    setMessage(null);

    /*
     * Cho phép chọn lại cùng file.
     */

    event.target.value = "";
  }


  /*
   * =====================================================
   * REMOVE QR
   * =====================================================
   */

  function removeAllQrs() {

    qrs.forEach(qr => {
      URL.revokeObjectURL(
        qr.previewUrl,
      );
    });

    setQrs([]);

    setSelectedQr(null);
  }


  /*
   * =====================================================
   * GENERATE
   * =====================================================
   */

  async function handleGenerate() {

    setMessage(null);

    /*
     * Validate
     */

    if (!pdfFile) {

      setMessage(
        "Vui lòng chọn PDF template.",
      );

      return;
    }

    if (
      qrs.length === 0
    ) {

      setMessage(
        "Vui lòng chọn ít nhất một QR Code.",
      );

      return;
    }

    if (!calibration) {

      setMessage(
        "Vui lòng chọn vùng QR bằng 2 điểm trên PDF.",
      );

      return;
    }

    /*
     * =================================================
     * GENERATE
     * =================================================
     */

    try {

      setGenerating(true);

      setProgress({
        current: 0,
        total: qrs.length,
        name: "",
      });

      const zipBlob =
        await generatePdfZip(
          pdfFile,

          qrs,

          calibration,

          options,

          (
            current,
            total,
            qr,
          ) => {

            setProgress({
              current,
              total,
              name:
                qr.schoolName,
            });

          },
        );

      /*
       * Download
       */

      const fileName = getOutputFileName();
      
      downloadBlob(
        zipBlob,
        fileName,
      );

      setMessage(
        `Đã tạo ${qrs.length} PDF và đóng gói thành ZIP.`,
      );

    } catch (error) {

      console.error(
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể tạo PDF.",
      );

    } finally {

      setGenerating(
        false,
      );
    }
  }


  /*
   * =====================================================
   * CLEANUP
   * =====================================================
   */

  useEffect(() => {

    return () => {

      qrs.forEach(
        qr => {
          URL.revokeObjectURL(
            qr.previewUrl,
          );
        },
      );

    };

  }, []);


  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (

    <div className="flex h-screen flex-col bg-slate-100">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-5 shadow-sm">

        <div>

          <h1 className="text-lg font-bold text-slate-800">
            PDF QR Generator
          </h1>

          <p className="text-xs text-slate-500">
            Chèn QR Code vào PDF template
          </p>

        </div>


        {/* GENERATE */}

        <button
          type="button"
          onClick={
            handleGenerate
          }
          disabled={
            generating ||
            !pdfFile ||
            qrs.length === 0 ||
            !calibration
          }
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >

          {generating
            ? "Đang tạo..."
            : "Generate PDF"}

        </button>

      </header>


      {/* =================================================
          BODY
      ================================================= */}

      <div className="flex min-h-0 flex-1">

        {/* =================================================
            LEFT SIDEBAR
        ================================================= */}

        <aside className="flex w-80 shrink-0 flex-col border-r bg-white">

          {/* FILE UPLOAD */}

          <div className="border-b p-4">

            <div className="space-y-4">

              {/* PDF */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  PDF Template
                </label>

                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-blue-400 hover:bg-blue-50">

                  <span>
                    {pdfFile
                      ? pdfFile.name
                      : "Chọn PDF template"}
                  </span>

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={
                      handlePdfChange
                    }
                    className="hidden"
                  />

                </label>

              </div>


              {/* QR */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  QR Code
                </label>

                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-blue-400 hover:bg-blue-50">

                  <span>
                    Chọn nhiều QR
                  </span>

                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    multiple
                    onChange={
                      handleQrChange
                    }
                    className="hidden"
                  />

                </label>

              </div>


              {qrs.length > 0 && (

                <button
                  type="button"
                  onClick={
                    removeAllQrs
                  }
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Xóa toàn bộ QR
                </button>

              )}

            </div>

          </div>


          {/* CALIBRATION */}

          <div className="border-b p-4">

            <CalibrationInfo
              calibration={
                calibration
              }
            />

          </div>


          {/* PROGRESS */}

          {generating && (

            <div className="border-b p-4">

              <div className="mb-2 flex items-center justify-between text-xs">

                <span className="font-medium text-slate-600">
                  Đang xử lý
                </span>

                <span className="text-slate-400">
                  {progress.current}
                  /
                  {progress.total}
                </span>

              </div>


              <div className="h-2 overflow-hidden rounded-full bg-slate-200">

                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width:
                      progress.total > 0
                        ? `${(
                            progress.current /
                            progress.total
                          ) * 100}%`
                        : "0%",
                  }}
                />

              </div>


              <div className="mt-2 truncate text-xs text-slate-500">
                {progress.name}
              </div>

            </div>

          )}


          {/* MESSAGE */}

          {message && (

            <div className="p-4">

              <div
                className={[
                  "rounded-lg border p-3 text-xs",

                  message.startsWith(
                    "Đã tạo",
                  )
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700",
                ].join(" ")}
              >
                {message}
              </div>

            </div>

          )}

        </aside>


        {/* =================================================
            PDF
        ================================================= */}

        <main className="min-w-0 flex-1">

          <PdfViewer
            file={
              pdfFile
            }

            currentPage={
              currentPage
            }

            zoom={
              zoom
            }

            onCalibration={
              setCalibration
            }
          />

        </main>


        {/* =================================================
            RIGHT SIDEBAR
        ================================================= */}

        <aside className="flex w-80 shrink-0 flex-col border-l bg-white">

          <QrPanel

            qrs={
              qrs
            }

            selectedQr={
              selectedQr
            }

            onSelect={
              setSelectedQr
            }

            options={
              options
            }

            onOptionsChange={
              setOptions
            }

            previewWidth={
              previewSize.width
            }

            previewHeight={
              previewSize.height
            }

          />

        </aside>

      </div>


      {/* =================================================
          FOOTER / ZOOM
      ================================================= */}

      <footer className="flex h-10 shrink-0 items-center justify-between border-t bg-white px-4">

        <div className="text-xs text-slate-500">

          {pdfFile
            ? pdfFile.name
            : "Chưa chọn PDF"}

        </div>


        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={() =>
              setZoom(
                Math.max(
                  0.5,
                  zoom - 0.1,
                ),
              )
            }
            className="rounded border px-2 py-1 text-xs hover:bg-slate-100"
          >
            −
          </button>

          <span className="w-12 text-center text-xs text-slate-500">
            {Math.round(
              zoom * 100,
            )}
            %
          </span>

          <button
            type="button"
            onClick={() =>
              setZoom(
                Math.min(
                  3,
                  zoom + 0.1,
                ),
              )
            }
            className="rounded border px-2 py-1 text-xs hover:bg-slate-100"
          >
            +
          </button>

        </div>

      </footer>

    </div>
  );
}