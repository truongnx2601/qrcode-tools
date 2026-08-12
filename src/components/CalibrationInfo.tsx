import type {
  CalibrationRect,
} from "../types/pdfQr";

interface Props {
  calibration:
    | CalibrationRect
    | null;
}

export default function CalibrationInfo({
  calibration,
}: Props) {
  if (!calibration) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
        Chưa chọn vùng QR.
        <br />
        Click góc trái trên rồi click góc phải dưới trên PDF.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 font-semibold">
        Vùng QR
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">
            Page
          </span>

          <div>
            {calibration.page + 1}
          </div>
        </div>

        <div>
          <span className="text-slate-500">
            X
          </span>

          <div>
            {calibration.x.toFixed(2)}
          </div>
        </div>

        <div>
          <span className="text-slate-500">
            Y
          </span>

          <div>
            {calibration.y.toFixed(2)}
          </div>
        </div>

        <div>
          <span className="text-slate-500">
            Width
          </span>

          <div>
            {calibration.width.toFixed(2)}
          </div>
        </div>

        <div>
          <span className="text-slate-500">
            Height
          </span>

          <div>
            {calibration.height.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}