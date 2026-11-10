import fs from "node:fs";
import path from "node:path";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const version = process.argv[2] || pkg.version;
const repo = "Izyawastaken/Tachyon";

console.log(`Generating update manifest (latest.json) for Tachyon v${version}...`);

// Look for .sig files generated in target/release/bundle
const nsisBundleDir = "./src-tauri/target/release/bundle/nsis";
const msiBundleDir = "./src-tauri/target/release/bundle/msi";

let signature = "";
let assetName = `tachyon_${version}_x64-setup.nsis.zip`;

const findSignature = (dir) => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    const sigFile = files.find((f) => f.endsWith(".sig"));
    if (sigFile) {
      return {
        sig: fs.readFileSync(path.join(dir, sigFile), "utf-8").trim(),
        asset: sigFile.replace(/\.sig$/, ""),
      };
    }
  }
  return null;
};

const bundleResult = findSignature(nsisBundleDir) || findSignature(msiBundleDir);

if (bundleResult) {
  signature = bundleResult.sig;
  assetName = bundleResult.asset;
  console.log(`Found signature from local bundle: ${bundleResult.asset}`);
} else {
  console.log("No local .sig file found in target bundle. Using placeholder signature.");
  signature = "<PASTE_SIGNATURE_FROM_SIG_FILE_HERE>";
}

const manifest = {
  version: version,
  notes: `Tachyon v${version} update`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: signature,
      url: `https://github.com/${repo}/releases/download/v${version}/${assetName}`,
    },
  },
};

const outputPath = "./latest.json";
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Manifest written to ${outputPath}`);
