const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const baseDir = __dirname.includes('modules')
  ? path.resolve(__dirname, '..')
  : __dirname;

const setupDir = path.join(baseDir, 'setup');

// Ensure setup folder and basic.yaml exist
function ensureSetupEnvironment() {
  if (!fs.existsSync(setupDir)) {
    fs.mkdirSync(setupDir, { recursive: true });
    console.log('Created setup directory at:', setupDir);
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
    fs.writeFileSync(basicYamlPath, content, 'utf-8');
    console.log('Created basic.yaml');
  }
}

// List all YAML setup files
function getSetupYamlList() {
  ensureSetupEnvironment(); // lazy init
  return fs.readdirSync(setupDir).filter(f => f.endsWith('.yaml'));
}

// Load a setup YAML by name
function loadSetupYaml(name) {
  const filePath = path.join(setupDir, name);
  if (!fs.existsSync(filePath)) throw new Error(`Setup file not found: ${name}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content);
}

module.exports = {
  ensureSetupEnvironment,
  getSetupYamlList,
  loadSetupYaml
};
