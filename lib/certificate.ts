// import { PDFDocument, StandardFonts, rgb } from "pdf-lib"; // Removed static import
import type { Participant } from "@/types/participant";

// Fix for DEP0108: zlib.bytesRead is deprecated
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("warning", (warning) => {
    if (warning.name === "DeprecationWarning" && (warning as NodeJS.ErrnoException).code === "DEP0108") {
      return;
    }
  });
}

const programName = "FRONT END WEB DESIGN ESSENTIAL";

function safePdfText(value: string) {
  return value.replace(/[^\x20-\x7E]/g, "");
}

function centerTextX(text: string, fontSize: number, font: { widthOfTextAtSize: (text: string, size: number) => number }, pageWidth: number) {
  return (pageWidth - font.widthOfTextAtSize(text, fontSize)) / 2;
}

export async function generateCertificatePdf(participant: Participant) {
  // Dynamic import to speed up dev/build
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const deepBrand = rgb(12 / 255, 74 / 255, 110 / 255);
  const brand = rgb(14 / 255, 165 / 255, 164 / 255);
  const lightBrand = rgb(165 / 255, 243 / 255, 252 / 255);
  const ink = rgb(34 / 255, 31 / 255, 48 / 255);
  const muted = rgb(91 / 255, 86 / 255, 111 / 255);

  page.drawRectangle({
    x: 26,
    y: 26,
    width: width - 52,
    height: height - 52,
    borderColor: deepBrand,
    borderWidth: 3
  });

  page.drawRectangle({
    x: 42,
    y: 42,
    width: width - 84,
    height: height - 84,
    borderColor: lightBrand,
    borderWidth: 1
  });

  page.drawRectangle({
    x: 66,
    y: height - 90,
    width: width - 132,
    height: 10,
    color: brand
  });

  const isCommittee = participant.source === "committee";
  const heading = isCommittee ? "CERTIFICATE OF APPRECIATION" : "CERTIFICATE OF PARTICIPATION";
  page.drawText(heading, {
    x: centerTextX(heading, 30, bold, width),
    y: height - 150,
    size: 30,
    font: bold,
    color: deepBrand
  });

  const certify = "This is to certify that";
  page.drawText(certify, {
    x: centerTextX(certify, 15, italic, width),
    y: height - 205,
    size: 15,
    font: italic,
    color: muted
  });

  const name = safePdfText(participant.student_name.toUpperCase());
  page.drawText(name, {
    x: centerTextX(name, 28, bold, width),
    y: height - 255,
    size: 28,
    font: bold,
    color: ink
  });

  const matric = `Matric No: ${safePdfText(participant.matric_no)}`;
  page.drawText(matric, {
    x: centerTextX(matric, 13, regular, width),
    y: height - 292,
    size: 13,
    font: regular,
    color: muted
  });

  const course = `Course: ${safePdfText(participant.student_course)}`;
  page.drawText(course, {
    x: centerTextX(course, 13, regular, width),
    y: height - 315,
    size: 13,
    font: regular,
    color: muted
  });

  const participated = isCommittee ? "has served as committee member for" : "has participated in";
  page.drawText(participated, {
    x: centerTextX(participated, 15, regular, width),
    y: height - 365,
    size: 15,
    font: regular,
    color: muted
  });

  page.drawText(programName, {
    x: centerTextX(programName, 23, bold, width),
    y: height - 405,
    size: 23,
    font: bold,
    color: deepBrand
  });

  const issued = `Issued on ${new Date().toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "long",
    day: "numeric"
  })}`;

  page.drawText(issued, {
    x: centerTextX(issued, 11, regular, width),
    y: 88,
    size: 11,
    font: regular,
    color: muted
  });

  page.drawText("Universiti Sultan Azlan Shah (USAS)", {
    x: centerTextX("Universiti Sultan Azlan Shah (USAS)", 11, bold, width),
    y: 64,
    size: 11,
    font: bold,
    color: brand
  });

  return pdf.save();
}
