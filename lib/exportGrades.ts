"use client";

import { Assessment, AssessmentSubmission, Classroom, UserProfile } from "./types";

export interface GradeRow {
  nama: string;
  nisn: string;
  scores: Record<string, number | null>;
  rataRata: number;
  predikat: string;
}

export function buildGradeMatrix(
  students: UserProfile[],
  assessments: Assessment[],
  submissions: AssessmentSubmission[]
): GradeRow[] {
  return students.map((st) => {
    const scores: Record<string, number | null> = {};
    const vals: number[] = [];
    assessments.forEach((asm) => {
      const sub = submissions.find(
        (s) => s.studentId === st.id && s.assessmentId === asm.id
      );
      if (sub) {
        scores[asm.id] = sub.skor;
        vals.push(sub.skor);
      } else {
        scores[asm.id] = null;
      }
    });
    const avg =
      vals.length > 0
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : 0;
    const predikat =
      vals.length === 0
        ? "-"
        : avg >= 90
        ? "A (Sangat Baik)"
        : avg >= 80
        ? "B (Baik)"
        : avg >= 70
        ? "C (Cukup)"
        : "D (Perlu Bimbingan)";
    return {
      nama: st.nama,
      nisn: st.nomorInduk,
      scores,
      rataRata: avg,
      predikat,
    };
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeFileSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildHtmlTable(
  cls: Classroom,
  assessments: Assessment[],
  rows: GradeRow[]
): string {
  const thCols = assessments
    .map(
      (a) =>
        `<th style="border:1px solid #cbd5e1;padding:8px;background:#006B3F;color:#ffffff;text-align:center;">${a.judul} (${a.jenis})</th>`
    )
    .join("");

  const bodyRows = rows
    .map(
      (r, idx) => `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:7px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #cbd5e1;padding:7px;font-weight:600;">${r.nama}</td>
        <td style="border:1px solid #cbd5e1;padding:7px;">${r.nisn}</td>
        ${assessments
          .map(
            (a) =>
              `<td style="border:1px solid #cbd5e1;padding:7px;text-align:center;">${
                r.scores[a.id] !== null ? r.scores[a.id] : "-"
              }</td>`
          )
          .join("")}
        <td style="border:1px solid #cbd5e1;padding:7px;text-align:center;font-weight:700;">${r.rataRata}</td>
        <td style="border:1px solid #cbd5e1;padding:7px;">${r.predikat}</td>
      </tr>`
    )
    .join("");

  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `
    <div style="font-family:Arial,sans-serif;color:#1e293b;">
      <h2 style="margin:0;color:#005532;">REKAPITULASI NILAI PAI-BP — ${cls.nama}</h2>
      <p style="margin:4px 0 14px 0;font-size:12px;color:#475569;">
        SMAN 1 Pangkalan Kerinci • Guru Pengampu: ${cls.guruNama} • Dicetak: ${today}
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:12px;">
        <thead>
          <tr>
            <th style="border:1px solid #cbd5e1;padding:8px;background:#006B3F;color:#ffffff;">No</th>
            <th style="border:1px solid #cbd5e1;padding:8px;background:#006B3F;color:#ffffff;text-align:left;">Nama Peserta Didik</th>
            <th style="border:1px solid #cbd5e1;padding:8px;background:#006B3F;color:#ffffff;text-align:left;">NISN</th>
            ${thCols}
            <th style="border:1px solid #cbd5e1;padding:8px;background:#005532;color:#ffffff;">Rata-Rata</th>
            <th style="border:1px solid #cbd5e1;padding:8px;background:#005532;color:#ffffff;text-align:left;">Predikat</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

export function exportGradesCSV(
  cls: Classroom,
  assessments: Assessment[],
  rows: GradeRow[]
) {
  const header = [
    "No",
    "Nama Peserta Didik",
    "NISN",
    ...assessments.map((a) => `${a.judul} (${a.jenis})`),
    "Rata-Rata",
    "Predikat",
  ];
  const dataRows = rows.map((r, i) => [
    i + 1,
    r.nama,
    r.nisn,
    ...assessments.map((a) => (r.scores[a.id] !== null ? r.scores[a.id] : "-")),
    r.rataRata,
    r.predikat,
  ]);
  const csv =
    "\uFEFF" +
    [header, ...dataRows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `rekap-nilai-${safeFileSlug(cls.nama)}.csv`
  );
}

export function exportGradesXLSX(
  cls: Classroom,
  assessments: Assessment[],
  rows: GradeRow[]
) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8" /></head><body>${buildHtmlTable(
    cls,
    assessments,
    rows
  )}</body></html>`;
  triggerDownload(
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    `rekap-nilai-${safeFileSlug(cls.nama)}.xlsx`
  );
}

export function exportGradesDOCX(
  cls: Classroom,
  assessments: Assessment[],
  rows: GradeRow[]
) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8" /></head><body>${buildHtmlTable(
    cls,
    assessments,
    rows
  )}<br/><br/><div style="text-align:right;font-family:Arial,sans-serif;font-size:12px;">Pangkalan Kerinci, ${new Date().toLocaleDateString(
    "id-ID"
  )}<br/>Guru PAI-BP,<br/><br/><br/><strong>${cls.guruNama}</strong></div></body></html>`;
  triggerDownload(
    new Blob([html], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8;",
    }),
    `rekap-nilai-${safeFileSlug(cls.nama)}.docx`
  );
}

export function exportGradesPDF(
  cls: Classroom,
  assessments: Assessment[],
  rows: GradeRow[]
) {
  const win = window.open("", "_blank", "width=1000,height=720");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8" /><title>Rekap Nilai ${cls.nama}</title><style>@page{size:A4 landscape;margin:14mm;}body{margin:0;padding:16px;}</style></head><body>${buildHtmlTable(
    cls,
    assessments,
    rows
  )}<div style="margin-top:32px;text-align:right;font-family:Arial,sans-serif;font-size:12px;">Guru Pengampu,<br/><br/><br/><strong>${cls.guruNama}</strong></div><script>window.onload=function(){window.print();};</script></body></html>`);
  win.document.close();
}
