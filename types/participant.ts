export type ClaimStatus = "OPEN" | "CLOSED";
export type RecipientSource = "participant" | "committee";

export type Participant = {
  source: RecipientSource;
  sourceLabel: string;
  rowNumber: number;
  email_address: string;
  timestamp: string;
  student_email: string;
  student_name: string;
  matric_no: string;
  phone_no: string;
  student_course: string;
  payment_receipt: string;
  certificate_status: string;
  invoice_email: string;
  claim_status: string;
  claimed_at: string;
  attendance_status: string;
  attended_at: string;
};

export type PublicParticipant = {
  matric_no: string;
  source: RecipientSource;
  sourceLabel: string;
  certificateApproved: boolean;
  attendanceVerified: boolean;
};

export const ELIGIBLE_CERTIFICATE_VALUES = ["YES", "ELIGIBLE", "LAYAK", "SIAP", "APPROVED"];
export const ATTENDED_VALUES = ["ATTENDED", "HADIR", "YES"];

export function normalizeMatric(value: string) {
  return value.trim().toUpperCase();
}

export function isCertificateEligible(value: string) {
  return ELIGIBLE_CERTIFICATE_VALUES.includes(value.trim().toUpperCase());
}

export function hasAttended(value: string) {
  return ATTENDED_VALUES.includes(value.trim().toUpperCase());
}

export function canClaimCertificate(participant: Pick<Participant, "certificate_status" | "attendance_status">) {
  return isCertificateEligible(participant.certificate_status) && hasAttended(participant.attendance_status);
}

export function recipientSourceLabel(source: RecipientSource) {
  return source === "committee" ? "Committee" : "Participant";
}
