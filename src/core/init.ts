import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_POLICY_TEMPLATE = `version: 1
default: deny

deny:
  prompts: []
  tools:
    http.fetch:
      hosts: []
    fs.read:
      paths: []

allow:
  prompts:
    - ".*"
  tools:
    http.fetch:
      enabled: true
      hosts:
        - "example.com"
      timeoutMs: 5000
      maxBytes: 64000
    fs.read:
      enabled: true
      roots:
        - "./templates"
      maxBytes: 64000
    exec:
      enabled: false
`;

const DEFAULT_CONFIG_TEMPLATE = `version: 1
audit:
  enabled: true
  file: ".sentinex/audit.jsonl"
  maxBytes: 1000000
  maxFiles: 3
approval:
  mode: "prompt"
llm:
  provider: "mock"
  fallbackToMock: false
  model: "gpt-4.1-mini"
  baseUrl: "https://api.openai.com/v1"
  apiKeyEnv: "OPENAI_API_KEY"
  systemPrompt: "Return JSON only. Build an action plan with shape: {\\"actions\\": [...]}."
  timeoutMs: 20000
  maxRetries: 2
  retryDelayMs: 600
  dryRunDefault: false
`;

type InitResult = {
  createdDir: boolean;
  writtenFiles: string[];
  skippedFiles: string[];
};

function resolveTemplatesDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  return path.resolve(currentDir, "../../templates");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadTemplate(fileName: string, fallback: string): Promise<string> {
  const templatesDir = resolveTemplatesDir();
  const templatePath = path.join(templatesDir, fileName);
  if (await fileExists(templatePath)) {
    return readFile(templatePath, "utf8");
  }
  return fallback;
}

export async function initProject(force = false): Promise<InitResult> {
  const projectRoot = process.cwd();
  const sentinexDir = path.join(projectRoot, ".sentinex");
  const policyPath = path.join(sentinexDir, "policy.yaml");
  const configPath = path.join(sentinexDir, "config.yaml");

  const dirExisted = await fileExists(sentinexDir);
  await mkdir(sentinexDir, { recursive: true });

  const policyTemplate = await loadTemplate("policy.yaml", DEFAULT_POLICY_TEMPLATE);
  const configTemplate = await loadTemplate("config.yaml", DEFAULT_CONFIG_TEMPLATE);

  const writtenFiles: string[] = [];
  const skippedFiles: string[] = [];

  const writeTargets: Array<{ path: string; content: string }> = [
    { path: policyPath, content: policyTemplate },
    { path: configPath, content: configTemplate },
  ];

  for (const target of writeTargets) {
    const exists = await fileExists(target.path);
    if (exists && !force) {
      skippedFiles.push(path.relative(projectRoot, target.path));
      continue;
    }
    await writeFile(target.path, target.content, "utf8");
    writtenFiles.push(path.relative(projectRoot, target.path));
  }

  return {
    createdDir: !dirExisted,
    writtenFiles,
    skippedFiles,
  };
}
