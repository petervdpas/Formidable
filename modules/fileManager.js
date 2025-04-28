// modules/fileManager.js

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { log, warn, error } = require('./nodeLogger');

const baseDir = __dirname.includes('modules')
  ? path.resolve(__dirname, '..')
  : __dirname;

const setupDir = path.join(baseDir, 'setup');

log("[FileManager] Base directory:", baseDir);
log("[FileManager] Setup directory:", setupDir);

// Ensure setup folder and basic.yaml exist
function ensureSetupEnvironment() {
  if (!fs.existsSync(setupDir)) {
    fs.mkdirSync(setupDir, { recursive: true });
    log("[FileManager] Created setup directory at:", setupDir);
  } else {
    log("[FileManager] Setup directory already exists.");
  }

  const basicYamlPath = path.join(setupDir, 'basic.yaml');
  if (!fs.existsSync(basicYamlPath)) {
    const content = `
name: Basic Form
markdown_dir: ./markdowns/basic
fields:
  - key: title
    type: text
    label: Title
    default: ""
  - key: published
    type: boolean
    label: Published
    default: false
  - key: category
    type: dropdown
    label: Category
    options: [News, Tutorial, Opinion]
    default: News
`.trimStart();
    try {
      fs.writeFileSync(basicYamlPath, content, 'utf-8');
      log("[FileManager] Created basic.yaml at:", basicYamlPath);
    } catch (err) {
      error("[FileManager] Failed to create basic.yaml:", err);
    }
  } else {
    log("[FileManager] basic.yaml already exists.");
  }
}

// List all YAML setup files
function getSetupYamlList() {
  ensureSetupEnvironment(); // Ensure setup exists first
  try {
    const files = fs.readdirSync(setupDir).filter(f => f.endsWith('.yaml'));
    log(`[FileManager] Found ${files.length} setup YAML file(s).`);
    return files;
  } catch (err) {
    error("[FileManager] Failed to list setup YAML files:", err);
    return [];
  }
}

// Load a setup YAML by name
function loadSetupYaml(name) {
  const filePath = path.join(setupDir, name);
  if (!fs.existsSync(filePath)) {
    error(`[FileManager] Setup file not found: ${name}`);
    throw new Error(`Setup file not found: ${name}`);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    log(`[FileManager] Loaded setup YAML: ${name}`);
    return yaml.load(content);
  } catch (err) {
    error(`[FileManager] Failed to load setup YAML ${name}:`, err);
    throw err;
  }
}

module.exports = {
  ensureSetupEnvironment,
  getSetupYamlList,
  loadSetupYaml,
};
