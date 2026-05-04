import crypto from "crypto";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

const passwordHashPrefix = "pbkdf2_sha256";
const iterations = 310000;

const rl = readline.createInterface({ input, output });
const password = await rl.question("Admin password: ");
rl.close();

if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("base64url");
const hash = crypto
  .pbkdf2Sync(password, salt, iterations, 32, "sha256")
  .toString("base64url");

console.log(`${passwordHashPrefix}$${iterations}$${salt}$${hash}`);
