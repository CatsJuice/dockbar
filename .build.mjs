import fs from "fs"
import { dirname, resolve } from "path"
import { execa } from "execa"
import { writeFile, readFile } from "fs/promises"
import { execSync } from "child_process"
import { fileURLToPath } from "url"
import chalk from "chalk";
import prompts from "prompts";
import brotliSize from "brotli-size";
import prettyBytes from "pretty-bytes";


const info = (m) => console.log(chalk.blue(m))
const error = (m) => console.log(chalk.red(m))
const success = (m) => console.log(chalk.green(m))
const details = (m) => console.log(chalk.pink(m))

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname)
const distDir = resolve(rootDir, "dist")
const isPublishing = process.argv.includes("--publish")

async function getPackageJSON() {
  const packageJSONPath = resolve(rootDir, "package.json")
  const raw = await readFile(packageJSONPath, "utf-8")
  return JSON.parse(raw)
}

async function clean() {
  if (!fs.existsSync(`${rootDir}/dist`)) return
  info("Cleaning dist folder...")
  await execa("shx", ["rm", "-rf", "dist"])
}

async function build() {
  info("Building components & types declarations...")
  await execa("pnpm", ["build:dockbar"])
}

async function addPackageJSON() {
  info("Writing package.json to dist")
  const packageInfo = await getPackageJSON()
  delete packageInfo.private
  delete packageInfo.scripts
  delete packageInfo.devDependencies
  await writeFile(
    resolve(distDir, "package.json"),
    JSON.stringify(packageInfo, null, 2)
  )
}

async function addAssets() {
  info("Copying assets...")
  const assetsList = [
    "README.md",
    "LICENSE",
  ]
  for (const asset of assetsList) {
    await execa("shx", [
      "cp", "-rf", 
      resolve(rootDir, asset), 
      resolve(distDir, asset)]
    )
  }
}

async function prepareForPublishing() {
  info("Preparing for publication")
  if (!/npm-cli\.js$/.test(process.env.npm_execpath)) {
    error(`⚠️ You must run this command with npm instead of yarn | pnpm.`)
    info("Please try again with:\n\n» npm run publish\n\n")
    process.exit()
  }
  const isClean = !execSync(`git status --untracked-files=no --porcelain`, {
    encoding: "utf-8",
  })
  if (!isClean) {
    error("Commit your changes before publishing.")
    process.exit()
  }
  const packageJSON = await getPackageJSON()
  const response = await prompts([
    {
      type: "confirm",
      name: "value",
      message: `Confirm you want to publish version ${chalk.red(
        packageJSON.version
      )}?`,
      initial: false,
    },
  ])
  if (!response.value) {
    error("Please adjust the version and try again")
    process.exit()
  }
}

async function publish() {
  const response = await prompts([
    {
      type: "confirm",
      name: "value",
      message: `Project is build. Ready to publish?`,
      initial: false,
    },
  ])
  if (response.value) {
    execSync("npm publish --registry https://registry.npmjs.org")
  }
}

async function outputSize() {
  const raw = await readFile(resolve(rootDir, "dist/dockbar.js"), "utf8");
  console.log("Brotli size: " + prettyBytes(brotliSize.sync(raw)));
}

if (isPublishing) prepareForPublishing()
await clean()
await build()
await addPackageJSON()
await addAssets()
await outputSize()
if (isPublishing) await publish()

success("Done!")