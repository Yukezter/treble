import cprocess from "child_process";
import os from "os";
import path from "path";
import util from "util";

type ExecScript<T extends unknown> = (
  file: string,
  args?: string[] | cprocess.ExecFileOptions,
  opts?: cprocess.ExecFileOptions
) => T;

type ExecScriptSync = ExecScript<ReturnType<typeof cprocess.execFileSync>>;
type ExecScriptAsync = ExecScript<
  cprocess.PromiseWithChild<{
    stdout: string;
    stderr: string;
  }>
>;

const osTmpDir = os.tmpdir();
const execFileAsync = util.promisify(cprocess.execFile);
const execFileOpts: cprocess.ExecFileOptions = {
  cwd: osTmpDir,
  shell: "bash",
};

let scriptsDir = path.posix.join(__dirname, "..", "scripts");
// running bash on Windows will run WSL's bash
if (os.platform() === "win32") {
  scriptsDir = path.posix.join("/mnt", scriptsDir.replace(/^C:/, "c"));
}

export const execScriptSync: ExecScriptSync = (file, args, opts) => {
  if (!Array.isArray(args)) {
    opts = args;
    args = undefined;
  }

  // TODO: sanitize parameters we're putting in command args array
  return cprocess.execFileSync(path.posix.join(scriptsDir, file), args, {
    ...execFileOpts,
    ...opts,
  });
};

export const execScriptAsync: ExecScriptAsync = (file, args, opts) => {
  if (!Array.isArray(args)) {
    opts = args;
    args = undefined;
  }

  // TODO: sanitize parameters we're putting in command args array
  return execFileAsync(path.posix.join(scriptsDir, file), args, {
    ...execFileOpts,
    timeout: 3000,
    ...opts,
  });
};
