"use client";
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-green">
      🖨️ طباعة / حفظ كـ PDF
    </button>
  );
}
