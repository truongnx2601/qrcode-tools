import {
  useEffect,
  useState,
} from "react";

import {
  decorateQr,
} from "../utils/qrDecorator";

import type {
  QrDecorationOptions,
  QrFile,
} from "../types/pdfQr";

interface QrPreviewProps {
  qr: QrFile | null;

  width: number;

  height: number;

  options:
    QrDecorationOptions;
}

export default function QrPreview({
  qr,
  width,
  height,
  options,
}: QrPreviewProps) {
  const [
    previewUrl,
    setPreviewUrl,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    let objectUrl:
      string | null = null;

    async function render() {
      if (!qr) {
        setPreviewUrl(
          null
        );

        return;
      }

      if (
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      try {
        setError(null);

        const result =
          await decorateQr(
            qr.file,

            qr.schoolName,

            width,
            height,

            options
          );

        /*
         * KHÔNG dùng:
         *
         * result.buffer
         *
         * vì DecoratedQrResult
         * không có buffer.
         */

        objectUrl =
          URL.createObjectURL(
            result.blob
          );

        setPreviewUrl(
          objectUrl
        );
      } catch (err) {
        console.error(
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tạo preview"
        );
      }
    }

    render();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl
        );
      }
    };
  }, [
    qr,
    width,
    height,
    options,
  ]);

  if (!qr) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
        Chọn một QR Code để preview
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 text-xs font-medium text-slate-500">
        Preview
      </div>

      <div className="flex max-h-[350px] max-w-full items-center justify-center overflow-hidden rounded-xl border bg-white p-2 shadow-sm">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={
              qr.schoolName
            }
            className="max-h-[320px] max-w-full object-contain"
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center text-xs text-slate-400">
            Rendering...
          </div>
        )}
      </div>

      <div className="mt-2 max-w-full truncate text-center text-sm font-medium text-slate-700">
        {qr.schoolName}
      </div>
    </div>
  );
}