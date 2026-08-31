const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const frontend = path.join(root, "frontend");
const packageJsonPath = path.join(frontend, "package.json");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const [major, minor, patch] = packageJson.version.split(".").map(Number);
const version = `${major}.${minor}.${patch + 1}`;

packageJson.version = version;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

const packageLockPath = path.join(frontend, "package-lock.json");
if (fs.existsSync(packageLockPath)) {
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));
  packageLock.version = version;
  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = version;
  }
  fs.writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2) + "\n");
}

execFileSync("git", ["add", "frontend/package.json", "frontend/package-lock.json"], {
  cwd: root,
  stdio: "inherit"
});

execFileSync("git", ["commit", "-m", `release: v${version}`], {
  cwd: root,
  stdio: "inherit"
});

execFileSync("git", ["tag", `v${version}`], {
  cwd: root,
  stdio: "inherit"
});

execFileSync("git", ["push", "origin", "main"], {
  cwd: root,
  stdio: "inherit"
});

execFileSync("git", ["push", "origin", `v${version}`], {
  cwd: root,
  stdio: "inherit"
});

console.log(`Release v${version} enviada para o GitHub.`);