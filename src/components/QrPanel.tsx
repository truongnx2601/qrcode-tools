import type {
  QrDecorationOptions,
  QrFile,
} from "../types/pdfQr";

import QrPreview from "./QrPreview";

interface QrPanelProps {
  qrs: QrFile[];

  selectedQr:
    | QrFile
    | null;

  onSelect: (
    qr: QrFile
  ) => void;

  options:
    QrDecorationOptions;

  onOptionsChange: (
    options:
      QrDecorationOptions
  ) => void;

  previewWidth: number;

  previewHeight: number;
}

export default function QrPanel({
  qrs,
  selectedQr,
  onSelect,
  options,
  onOptionsChange,

  previewWidth,
  previewHeight,
}: QrPanelProps) {
  function updateOptions(
    patch: Partial<QrDecorationOptions>
  ) {
    onOptionsChange({
      ...options,
      ...patch,
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* HEADER */}

      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">
          QR Code
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {qrs.length} QR Code
        </p>
      </div>

      {/* LIST */}

      <div className="max-h-52 shrink-0 overflow-y-auto p-3">
        <div className="space-y-2">
          {qrs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-400">
              Chưa có QR Code
            </div>
          ) : (
            qrs.map(qr => {
              const selected =
                selectedQr?.id ===
                qr.id;

              return (
                <button
                  key={qr.id}
                  type="button"
                  onClick={() =>
                    onSelect(
                      qr
                    )
                  }
                  className={[
                    "flex w-full items-center gap-3 rounded-lg border p-2 text-left transition",
                    selected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50",
                  ].join(
                    " "
                  )}
                >
                  <img
                    src={
                      qr.previewUrl
                    }
                    alt=""
                    className="h-12 w-12 shrink-0 rounded border bg-white object-contain"
                  />

                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-700">
                      {
                        qr.schoolName
                      }
                    </div>

                    {qr.schoolCode && (
                      <div className="mt-0.5 truncate text-xs text-slate-400">
                        {
                          qr.schoolCode
                        }
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* PREVIEW */}

      <div className="shrink-0 border-y bg-slate-50 p-4">
        <QrPreview
          qr={
            selectedQr
          }
          width={
            previewWidth
          }
          height={
            previewHeight
          }
          options={
            options
          }
        />
      </div>

      {/* OPTIONS */}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">
          Cấu hình QR
        </h3>

        {/* ENABLE */}

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={
              options.enabled
            }
            onChange={e =>
              updateOptions({
                enabled:
                  e.target.checked,
              })
            }
            className="h-4 w-4"
          />

          Chèn tên phía trên QR
        </label>

        {options.enabled && (
          <div className="mt-5 space-y-4">
            {/* FONT */}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Font size
              </label>

              <input
                type="number"
                min={12}
                max={100}
                value={
                  options.fontSize
                }
                onChange={e =>
                  updateOptions({
                    fontSize:
                      Number(
                        e.target.value
                      ),
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <p className="mt-1 text-[11px] text-slate-400">
                Font sẽ tự giảm nếu tên quá dài.
              </p>
            </div>

            {/* MIN FONT */}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Font tối thiểu
              </label>

              <input
                type="number"
                min={8}
                max={50}
                value={
                  options.minFontSize
                }
                onChange={e =>
                  updateOptions({
                    minFontSize:
                      Number(
                        e.target.value
                      ),
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* PADDING */}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Padding
              </label>

              <input
                type="number"
                min={0}
                value={
                  options.padding
                }
                onChange={e =>
                  updateOptions({
                    padding:
                      Number(
                        e.target.value
                      ),
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* GAP */}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Khoảng cách tên / QR
              </label>

              <input
                type="number"
                min={0}
                value={
                  options.gap
                }
                onChange={e =>
                  updateOptions({
                    gap:
                      Number(
                        e.target.value
                      ),
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* LINE */}

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={
                  options.lineEnabled
                }
                onChange={e =>
                  updateOptions({
                    lineEnabled:
                      e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              Hiển thị đường kẻ
            </label>
          </div>
        )}
      </div>
    </div>
  );
}