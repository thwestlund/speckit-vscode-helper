import * as vscode from 'vscode';
import { Feature, parseFeatureDirectory } from '../models/feature.js';
import { Artifact, ArtifactType } from '../models/artifact.js';
import { deriveState } from '../models/workflowState.js';
import { deriveActionState } from '../models/actionState.js';
import { ARTIFACT_FILES } from '../constants.js';

export async function discoverFeatures(specsDir: vscode.Uri): Promise<Feature[]> {
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(specsDir);
  } catch {
    return [];
  }

  const featurePromises = entries
    .filter(([, type]) => type === vscode.FileType.Directory)
    .map(([name]) => buildFeature(specsDir, name));

  return Promise.all(featurePromises);
}

async function buildFeature(specsDir: vscode.Uri, dirName: string): Promise<Feature> {
  const { number, shortName } = parseFeatureDirectory(dirName);
  const dirPath = vscode.Uri.joinPath(specsDir, dirName);
  const artifacts = await buildArtifacts(dirPath);

  const tasksArtifact = artifacts.find((a) => a.artifactType === ArtifactType.Tasks);
  let tasksContent: string | undefined;
  if (tasksArtifact?.exists) {
    tasksContent = await readFileContent(vscode.Uri.file(tasksArtifact.filePath));
  }

  const state = deriveState(artifacts, tasksContent);
  const actionState = deriveActionState(state);

  return {
    number,
    shortName,
    branchName: dirName,
    directoryPath: dirPath.fsPath,
    state,
    artifacts,
    actionState,
  };
}

async function buildArtifacts(dirPath: vscode.Uri): Promise<Artifact[]> {
  return Promise.all(
    Array.from(ARTIFACT_FILES.entries()).map(async ([fileName, artifactType]) => {
      const filePath = vscode.Uri.joinPath(dirPath, fileName);
      const exists = await checkExists(filePath);
      return {
        fileName,
        filePath: filePath.fsPath,
        exists,
        artifactType,
      };
    }),
  );
}

async function checkExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function readFileContent(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString('utf-8');
  } catch {
    return undefined;
  }
}
