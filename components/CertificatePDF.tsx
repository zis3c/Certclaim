import type { Participant } from "@/types/participant";
import { Award, GraduationCap } from "lucide-react";

type CertificatePDFProps = {
  participant: Pick<Participant, "matric_no" | "source" | "student_course" | "student_name">;
};

export default function CertificatePDF({ participant }: CertificatePDFProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-2 shadow-sm backdrop-blur-sm sm:p-3">
      <div className="shimmer relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 px-4 py-6 text-center sm:px-6 sm:py-8">
        {/* Top decorative bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Corner decorations */}
        <div className="absolute left-2 top-2 h-5 w-5 border-l-2 border-t-2 border-primary/30 rounded-tl-sm sm:left-3 sm:top-3 sm:h-6 sm:w-6" />
        <div className="absolute right-2 top-2 h-5 w-5 border-r-2 border-t-2 border-primary/30 rounded-tr-sm sm:right-3 sm:top-3 sm:h-6 sm:w-6" />
        <div className="absolute bottom-2 left-2 h-5 w-5 border-b-2 border-l-2 border-primary/30 rounded-bl-sm sm:bottom-3 sm:left-3 sm:h-6 sm:w-6" />
        <div className="absolute bottom-2 right-2 h-5 w-5 border-b-2 border-r-2 border-primary/30 rounded-br-sm sm:bottom-3 sm:right-3 sm:h-6 sm:w-6" />

        {/* Certificate icon */}
        <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 sm:mb-3 sm:h-8 sm:w-8">
          <GraduationCap className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
        </div>

        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/70 sm:text-[10px] sm:tracking-[0.25em]">
          {participant.source === "committee" ? "Appreciation Preview" : "Certificate Preview"}
        </p>

        <div className="mx-auto my-3 h-px w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent sm:my-4 sm:w-16" />

        <p className="text-[10px] text-muted-foreground sm:text-[11px]">This is to certify that</p>

        <p className="mt-1.5 break-words text-base font-bold uppercase tracking-tight text-foreground sm:mt-2 sm:text-xl">
          {participant.student_name}
        </p>

        <div className="mt-2 flex flex-col items-center gap-0.5 sm:mt-3 sm:gap-1">
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground sm:gap-1.5 sm:text-xs">
            <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span>Matric: <span className="font-semibold text-foreground/80">{participant.matric_no}</span></span>
          </p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">
            Course: <span className="font-semibold text-foreground/80">{participant.student_course}</span>
          </p>
        </div>

        <div className="mx-auto my-3 h-px w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent sm:my-4 sm:w-16" />

        <p className="text-[10px] text-muted-foreground sm:text-[11px]">
          {participant.source === "committee" ? "has served as committee member for" : "has participated in"}
        </p>
        <p className="mt-1 text-xs font-bold text-gradient sm:mt-1.5 sm:text-sm">
          FRONT END WEB DESIGN ESSENTIAL
        </p>

        {/* Bottom decorative bar */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>
    </div>
  );
}
