import {
  useEffect,
  useRef,
  useState,
} from "react";

import * as pdfjsLib from "pdfjs-dist";

import type {
  Point,
  CalibrationRect,
} from "../types/pdfQr";

// ============================================================
// PDF.JS WORKER
// ============================================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

// ============================================================
// PROPS
// ============================================================

interface PdfViewerProps {
  file: File | null;

  /**
   * currentPage: 1-based
   */
  currentPage: number;

  zoom: number;

  onCalibration?: (
    rect: CalibrationRect | null,
  ) => void;
}

// ============================================================
// COMPONENT
// ============================================================

export default function PdfViewer({
  file,
  currentPage,
  zoom,
  onCalibration,
}: PdfViewerProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  // ==========================================================
  // CLICK POINTS
  //
  // Point 1 = TOP LEFT
  // Point 2 = BOTTOM RIGHT
  // ==========================================================

  const [
    points,
    setPoints,
  ] = useState<Point[]>([]);

  // ==========================================================
  // PDF SIZE
  //
  // Original PDF size - PDF point
  // ==========================================================

  const [
    pdfSize,
    setPdfSize,
  ] = useState({
    width: 0,
    height: 0,
  });

  // ==========================================================
  // RENDERED CANVAS SIZE
  //
  // Canvas internal pixel size.
  // ==========================================================

  const [
    renderedSize,
    setRenderedSize,
  ] = useState({
    width: 0,
    height: 0,
  });

  // ==========================================================
  // RESET WHEN FILE / PAGE / ZOOM CHANGES
  // ==========================================================

  useEffect(() => {
    setPoints([]);

    onCalibration?.(null);
  }, [
    file,
    currentPage,
    zoom,
    onCalibration,
  ]);

  // ==========================================================
  // RENDER PDF
  // ==========================================================

  useEffect(() => {
    if (!file) {
      return;
    }

    const currentFile = file;

    let cancelled = false;

    async function renderPdf() {
      try {
        const bytes =
          await currentFile.arrayBuffer();

        if (cancelled) {
          return;
        }

        const pdf =
          await pdfjsLib
            .getDocument({
              data: bytes,
            })
            .promise;

        if (cancelled) {
          return;
        }

        const page =
          await pdf.getPage(
            currentPage,
          );

        if (cancelled) {
          return;
        }

        // ====================================================
        // DISPLAY VIEWPORT
        // ====================================================

        const viewport =
          page.getViewport({
            scale: zoom,
          });

        // ====================================================
        // ORIGINAL PDF VIEWPORT
        //
        // scale = 1
        // ====================================================

        const originalViewport =
          page.getViewport({
            scale: 1,
          });

        const canvas =
          canvasRef.current;

        if (!canvas) {
          return;
        }

        const context =
          canvas.getContext("2d");

        if (!context) {
          return;
        }

        // ====================================================
        // INTERNAL CANVAS SIZE
        // ====================================================

        canvas.width =
          Math.ceil(
            viewport.width,
          );

        canvas.height =
          Math.ceil(
            viewport.height,
          );

        // ====================================================
        // CSS SIZE
        // ====================================================

        canvas.style.width =
          `${viewport.width}px`;

        canvas.style.height =
          `${viewport.height}px`;

        // ====================================================
        // CLEAR
        // ====================================================

        context.clearRect(
          0,
          0,
          canvas.width,
          canvas.height,
        );

        // ====================================================
        // RENDER
        //
        // pdfjs-dist 6 yêu cầu truyền canvas.
        // ====================================================

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        if (cancelled) {
          return;
        }

        setRenderedSize({
          width:
            viewport.width,

          height:
            viewport.height,
        });

        setPdfSize({
          width:
            originalViewport.width,

          height:
            originalViewport.height,
        });
      } catch (error) {
        if (!cancelled) {
          console.error(
            "PDF render error:",
            error,
          );
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [
    file,
    currentPage,
    zoom,
  ]);

  // ==========================================================
  // GET CANVAS POINT
  // ==========================================================

  function getCanvasPoint(
    event: React.MouseEvent<HTMLCanvasElement>,
  ): Point | null {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect =
      canvas.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return null;
    }

    // ========================================================
    // Browser CSS -> canvas internal pixels
    // ========================================================

    const scaleX =
      canvas.width /
      rect.width;

    const scaleY =
      canvas.height /
      rect.height;

    const x =
      (event.clientX -
        rect.left) *
      scaleX;

    const y =
      (event.clientY -
        rect.top) *
      scaleY;

    // ========================================================
    // CLAMP
    // ========================================================

    return {
      x: Math.max(
        0,
        Math.min(
          x,
          canvas.width,
        ),
      ),

      y: Math.max(
        0,
        Math.min(
          y,
          canvas.height,
        ),
      ),
    };
  }

  // ==========================================================
  // HANDLE CLICK
  // ==========================================================

  function handleCanvasClick(
    event: React.MouseEvent<HTMLCanvasElement>,
  ) {
    if (
      renderedSize.width <= 0 ||
      renderedSize.height <= 0 ||
      pdfSize.width <= 0 ||
      pdfSize.height <= 0
    ) {
      return;
    }

    const point =
      getCanvasPoint(event);

    if (!point) {
      return;
    }

    // ========================================================
    // POINT 1
    //
    // TOP LEFT
    // ========================================================

    if (points.length === 0) {
      setPoints([
        point,
      ]);

      onCalibration?.(
        null,
      );

      return;
    }

    // ========================================================
    // POINT 2
    //
    // BOTTOM RIGHT
    // ========================================================

    const firstPoint =
      points[0];

    if (
      point.x <=
        firstPoint.x ||
      point.y <=
        firstPoint.y
    ) {
      alert(
        "Điểm thứ 2 phải nằm bên phải và bên dưới điểm thứ 1.",
      );

      return;
    }

    const secondPoint =
      point;

    // ========================================================
    // SCREEN RECTANGLE
    //
    // Đây chính xác là vùng user click.
    // ========================================================

    const screenX =
      firstPoint.x;

    const screenY =
      firstPoint.y;

    const screenWidth =
      secondPoint.x -
      firstPoint.x;

    const screenHeight =
      secondPoint.y -
      firstPoint.y;

    // ========================================================
    // SCREEN -> PDF
    //
    // Tại đây CHƯA đảo Y.
    //
    // Calibration lưu Y theo TOP-LEFT.
    //
    // pdfGenerator sẽ đổi sang
    // BOTTOM-LEFT của pdf-lib.
    // ========================================================

    const pdfX =
      screenX *
      pdfSize.width /
      renderedSize.width;

    const pdfYTop =
      screenY *
      pdfSize.height /
      renderedSize.height;

    const pdfWidth =
      screenWidth *
      pdfSize.width /
      renderedSize.width;

    const pdfHeight =
      screenHeight *
      pdfSize.height /
      renderedSize.height;

    // ========================================================
    // CALIBRATION
    // ========================================================

    const calibration: CalibrationRect = {
      page:
        currentPage - 1,

      x:
        pdfX,

      y:
        pdfYTop,

      width:
        pdfWidth,

      height:
        pdfHeight,

      screenWidth,

      screenHeight,
    };

    // ========================================================
    // SAVE POINTS
    // ========================================================

    setPoints([
      firstPoint,
      secondPoint,
    ]);

    // ========================================================
    // SEND TO APP
    // ========================================================

    onCalibration?.(
      calibration,
    );
  }

  // ==========================================================
  // RESET / CHỌN LẠI
  // ==========================================================

  function resetSelection() {
    setPoints([]);

    onCalibration?.(
      null,
    );
  }

  // ==========================================================
  // SCREEN SELECTION
  //
  // Không convert ngược.
  // Overlay dùng trực tiếp tọa độ click.
  // ==========================================================

  const selection =
    points.length === 2
      ? {
          left:
            points[0].x,

          top:
            points[0].y,

          width:
            points[1].x -
            points[0].x,

          height:
            points[1].y -
            points[0].y,
        }
      : null;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ================================================== */}
      {/* PDF */}
      {/* ================================================== */}

      <div className="relative min-h-0 flex-1 overflow-auto bg-slate-200 p-8">

        {!file ? (
          <div className="flex h-full min-h-[400px] items-center justify-center">

            <div className="text-center">

              <div className="text-sm font-medium text-slate-500">
                Chưa chọn file PDF
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Upload PDF template để bắt đầu
              </div>

            </div>

          </div>
        ) : (

          <div className="relative mx-auto w-fit">

            {/* ================================================= */}
            {/* CANVAS */}
            {/* ================================================= */}

            <canvas
              ref={canvasRef}
              onClick={
                handleCanvasClick
              }
              className={[
                "block",
                "cursor-crosshair",
                "bg-white",
                "shadow-xl",
                points.length === 2
                  ? "cursor-default"
                  : "",
              ].join(" ")}
            />

            {/* ================================================= */}
            {/* POINTS */}
            {/* ================================================= */}

            {points.map(
              (
                point,
                index,
              ) => (
                <div
                  key={`${index}-${point.x}-${point.y}`}
                  className="pointer-events-none absolute z-30"
                  style={{
                    left:
                      point.x - 6,

                    top:
                      point.y - 6,
                  }}
                >

                  <div className="h-3 w-3 rounded-full border-2 border-white bg-red-500 shadow-md" />

                  <div className="absolute left-5 top-0 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-[10px] font-medium text-white shadow">

                    Point{" "}
                    {index + 1}

                  </div>

                </div>
              ),
            )}

            {/* ================================================= */}
            {/* SELECTION */}
            {/* ================================================= */}

            {selection && (

              <div
                className="pointer-events-none absolute z-20 border-2 border-blue-500 bg-blue-500/10"
                style={{
                  left:
                    selection.left,

                  top:
                    selection.top,

                  width:
                    selection.width,

                  height:
                    selection.height,
                }}
              >

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white shadow">

                  {Math.round(
                    selection.width,
                  )}{" "}
                  ×{" "}
                  {Math.round(
                    selection.height,
                  )}

                </div>

              </div>

            )}

          </div>
        )}

      </div>

      {/* ================================================== */}
      {/* FOOTER */}
      {/* ================================================== */}

      <div className="flex shrink-0 items-center justify-between border-t bg-white px-4 py-2">

        <div className="text-xs text-slate-500">

          {points.length === 0 && (
            <>
              <span className="font-medium text-slate-700">
                Bước 1:
              </span>{" "}
              Click góc trái trên
            </>
          )}

          {points.length === 1 && (
            <>
              <span className="font-medium text-slate-700">
                Bước 2:
              </span>{" "}
              Click góc phải dưới
            </>
          )}

          {points.length === 2 && (
            <>
              <span className="font-medium text-green-600">
                ✓ Đã chọn vùng
              </span>
            </>
          )}

        </div>

        <button
          type="button"
          onClick={
            resetSelection
          }
          disabled={
            points.length === 0
          }
          className="
            rounded-lg
            border
            border-slate-300
            px-3
            py-1.5
            text-xs
            font-medium
            text-slate-600
            transition
            hover:bg-slate-100
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          {points.length === 2
            ? "Chọn lại vùng"
            : "Hủy chọn"}
        </button>

      </div>

    </div>
  );
}