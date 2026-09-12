import { execSync } from "node:child_process";

const branch = process.env.GITHUB_REF_NAME || "local";
const result = execSync("npx lighthouse http://127.0.0.1:3000 --quiet --chrome-flags='--headless' --output=json --output-path=./.lighthouse-report.json", { stdio: "inherit" });
console.log(result ? "Lighthouse run completed." : "No output");
console.log(`Lighthouse report generated for branch: ${branch}`);
