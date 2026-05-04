export function validateMatricInput(value: unknown) {
  if (typeof value !== "string") {
    return { ok: false as const, message: "Please enter a valid matric number." };
  }

  const matricNo = value.trim();

  if (!matricNo) {
    return { ok: false as const, message: "Please enter your matric number." };
  }

  if (matricNo.length > 40 || !/^[a-zA-Z0-9/_-]+$/.test(matricNo)) {
    return { ok: false as const, message: "Please enter a valid matric number." };
  }

  return { ok: true as const, matricNo };
}
