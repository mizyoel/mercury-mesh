const fs = require("node:fs");
const path = require("node:path");

const packageRoot = __dirname;
const templatesDir = path.join(packageRoot, ".mesh", "templates");
const docsDir = path.join(packageRoot, "docs");
const skillsDir = path.join(packageRoot, ".copilot", "skills");
const agentPromptPath = path.join(
  packageRoot,
  ".github",
  "agents",
  "mercury-mesh.agent.md"
);

function resolveTemplatePath(...segments) {
  return path.join(templatesDir, ...segments);
}

function resolveDocPath(...segments) {
  return path.join(docsDir, ...segments);
}

function resolveSkillPath(...segments) {
  return path.join(skillsDir, ...segments);
}

function existsAt(filePath) {
  return fs.existsSync(filePath);
}

module.exports = {
  packageRoot,
  templatesDir,
  docsDir,
  skillsDir,
  agentPromptPath,
  resolveTemplatePath,
  resolveDocPath,
  resolveSkillPath,
  existsAt
};