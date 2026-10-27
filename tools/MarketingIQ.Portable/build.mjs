import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const check = process.argv[2] === "--check";
if (process.argv.length !== (check ? 3 : 2)) throw new Error("Expected no arguments or --check.");
const runtime = join(root, ".github", "skills", "marketing-iq", "scripts", "portable");
const output = check ? await fs.mkdtemp(join(tmpdir(), "miq-build-check-")) : runtime;
const run = args => {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
    if (result.error || result.status !== 0) throw new Error("Build/check subprocess failed.");
};
try {
    const { version } = JSON.parse(await fs.readFile(join(root, "package.json"), "utf8"));
    run([join(root, "node_modules", "typescript", "bin", "tsc"),
        "-p", join(root, "tools", "MarketingIQ.Portable", "tsconfig.json"), "--outDir", output]);
    await fs.writeFile(join(output, "package.json"),
        JSON.stringify({ private: true, type: "module", version }, null, 2) + "\n");
    if (check) {
        const expected = (await fs.readdir(output)).sort();
        const actual = (await fs.readdir(runtime)).sort();
        if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Generated runtime file-set drift.");
        for (const name of expected) {
            if (!(await fs.readFile(join(output, name))).equals(await fs.readFile(join(runtime, name))))
                throw new Error(`Generated runtime drift: ${name}`);
        }
        run([join(root, "tools", "MarketingIQ.Portable", "plugin.mjs"), "--check"]);
        console.log("Generated runtime and plugin match canonical source.");
    }
} finally {
    if (check) await fs.rm(output, { recursive: true });
}
