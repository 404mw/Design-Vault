// PreToolUse hook: blocks tool calls that would delete, move, or overwrite
// vault data (data/ — vault.db — and public/uploads/). Exit 2 = block, and
// stderr is shown to Claude as the reason.
import { readFileSync } from "node:fs";

const { tool_name, tool_input = {} } = JSON.parse(readFileSync(0, "utf8"));

const PROTECTED = /(^|[\s"'=/\\])(data[/\\]|public[/\\]uploads)|vault\.db/i;
const DESTRUCTIVE =
  /\b(rm|rmdir|unlink|mv|cp|del|erase|rd|ren|move|truncate|shred|Remove-Item|Move-Item|Rename-Item|Copy-Item|Clear-Content|Set-Content|Add-Content|Out-File|New-Item)\b|(^|[^0-9&>])>{1,2}\s*[^&\s]/i;
const GIT_CLEAN_IGNORED = /\bgit\s+clean\b[^\n;|&]*\s-[a-zA-Z]*[xX]/;

function block(reason) {
  process.stderr.write(
    `Blocked by protect-vault-data hook: ${reason} ` +
      "data/ and public/uploads/ hold the user's local vault (Constitution Rule 004) " +
      "and must never be deleted, moved, or overwritten by an agent. " +
      "If this is genuinely needed, stop and ask the user to do it themselves.",
  );
  process.exit(2);
}

if (tool_name === "Bash" || tool_name === "PowerShell") {
  const cmd = String(tool_input.command ?? "");
  if (PROTECTED.test(cmd) && DESTRUCTIVE.test(cmd)) {
    block("the command modifies a protected vault path.");
  }
  if (GIT_CLEAN_IGNORED.test(cmd)) {
    block("git clean -x would remove the gitignored vault data.");
  }
}

if (["Write", "Edit", "NotebookEdit"].includes(tool_name)) {
  const p = String(tool_input.file_path ?? tool_input.notebook_path ?? "").replace(/\\/g, "/");
  if (/(^|\/)(data|public\/uploads)\//i.test(p) || /vault\.db/i.test(p)) {
    block(`writing to ${p} is not allowed.`);
  }
}

process.exit(0);
