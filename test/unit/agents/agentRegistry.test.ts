import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import {
  registerAgent,
  getAgent,
  listAgents,
  checkAvailability,
  type AgentAdapter,
} from '../../../src/agents/agentRegistry.js';
import { CopilotAgent } from '../../../src/agents/copilotAgent.js';
import { ClaudeAgent } from '../../../src/agents/claudeAgent.js';

suite('agentRegistry', () => {
  suite('getAgent / registerAgent', () => {
    test('returns undefined for unknown agent id', () => {
      assert.strictEqual(getAgent('unknown-agent-xyz'), undefined);
    });

    test('returns registered agent by id', () => {
      const agent = new CopilotAgent();
      registerAgent(agent);
      assert.strictEqual(getAgent('copilot'), agent);
    });

    test('returns claude agent by id', () => {
      const agent = new ClaudeAgent();
      registerAgent(agent);
      assert.strictEqual(getAgent('claude'), agent);
    });
  });

  suite('listAgents', () => {
    test('returns array including registered agents', () => {
      registerAgent(new CopilotAgent());
      registerAgent(new ClaudeAgent());
      const agents = listAgents();
      const ids = agents.map((a) => a.id);
      assert.ok(ids.includes('copilot'), 'copilot must be in agent list');
      assert.ok(ids.includes('claude'), 'claude must be in agent list');
    });
  });

  suite('checkAvailability', () => {
    let getExtensionStub: sinon.SinonStub;

    setup(() => {
      getExtensionStub = sinon.stub(vscode.extensions, 'getExtension');
    });

    teardown(() => {
      sinon.restore();
    });

    test('returns false for unknown agent id', () => {
      assert.strictEqual(checkAvailability('nonexistent-agent'), false);
    });

    test('returns true when copilot extension is present', () => {
      getExtensionStub
        .withArgs('github.copilot-chat')
        .returns({ id: 'github.copilot-chat' } as vscode.Extension<unknown>);
      assert.strictEqual(checkAvailability('copilot'), true);
    });

    test('returns false when copilot extension is absent', () => {
      getExtensionStub.withArgs('github.copilot-chat').returns(undefined);
      assert.strictEqual(checkAvailability('copilot'), false);
    });

    test('returns true when claude extension is present', () => {
      getExtensionStub
        .withArgs('anthropic.claude-for-vscode')
        .returns({ id: 'anthropic.claude-for-vscode' } as vscode.Extension<unknown>);
      assert.strictEqual(checkAvailability('claude'), true);
    });

    test('returns false when claude extension is absent', () => {
      getExtensionStub.withArgs('anthropic.claude-for-vscode').returns(undefined);
      assert.strictEqual(checkAvailability('claude'), false);
    });
  });

  suite('AgentAdapter implementations', () => {
    test('CopilotAgent buildPrompt includes step and feature name', () => {
      const agent = new CopilotAgent();
      const prompt = agent.buildPrompt('plan', '001-my-feature');
      assert.ok(prompt.includes('plan'), 'prompt must include step');
      assert.ok(prompt.includes('001-my-feature'), 'prompt must include feature name');
      assert.ok(prompt.startsWith('@github'), 'copilot prompt must start with @github');
    });

    test('CopilotAgent buildPrompt without feature name', () => {
      const agent = new CopilotAgent();
      const prompt = agent.buildPrompt('specify', '');
      assert.ok(prompt.includes('specify'));
      assert.ok(!prompt.includes('undefined'));
    });

    test('ClaudeAgent buildPrompt includes step and feature name', () => {
      const agent = new ClaudeAgent();
      const prompt = agent.buildPrompt('tasks', '002-feature');
      assert.ok(prompt.includes('tasks'));
      assert.ok(prompt.includes('002-feature'));
      assert.ok(prompt.startsWith('@claude'), 'claude prompt must start with @claude');
    });
  });
});
