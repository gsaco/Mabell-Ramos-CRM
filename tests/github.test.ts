import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState, RepositoryConfig } from '../src/domain/types';

const validate = vi.hoisted(() => vi.fn((input: unknown) => input));
vi.mock('../src/domain/engine', () => ({ validateState: validate }));

import {
  GitHubRepository, GitHubConflictError, GitHubRepositoryError,
  GITHUB_STATE_MAX_BYTES,
} from '../src/services/github';

const config: RepositoryConfig = { owner: 'example-owner', repo: 'private-demo-data', branch: 'main', path: 'data/state.json' };
const token = 'github_pat_ficticio_no_utilizable';
const oldSha = 'a'.repeat(40);
const newSha = 'b'.repeat(40);
const state = {
  schemaVersion: 1, revision: 3, updatedAt: '2026-09-29T12:00:00Z', businessId: 'ficticio',
  settings: { businessName: 'Mabell Ramos · datos ficticios', note: 'Cañihua y lúcuma' },
} as unknown as AppState;

function json(value: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

type Handler = (url: string, init: RequestInit) => Response | Promise<Response> | undefined;
function mockAPI(handler: Handler = () => undefined) {
  const mock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const chosen = await handler(url, init);
    if (chosen) return chosen;
    if (url.endsWith('/user')) return json({ login: 'ana-ficticia', id: 12, name: 'Ana Joya', avatar_url: 'https://avatars.githubusercontent.com/u/12' });
    if (url.includes('/branches/')) return json({ name: 'main' });
    if (url.includes('/contents/')) return json({ message: 'Not found' }, 404);
    if (url.includes('/repos/example-owner/private-demo-data') && !url.includes('/commits')) {
      return json({ private: true, permissions: { push: true } });
    }
    throw new Error(`Unexpected mocked API route: ${url}`);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

beforeEach(() => { validate.mockReset(); validate.mockImplementation(input => input); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('GitHub data repository boundary', () => {
  it('verifies the GitHub identity, private repository and existing branch', async () => {
    const fetchMock = mockAPI();
    const repo = new GitHubRepository(config, token);
    const identity = await repo.connect();
    expect(identity).toMatchObject({ login: 'ana-ficticia', canWrite: true, privateRepo: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers).toMatchObject({ Authorization: `Bearer ${token}` });
      expect(init.credentials).toBe('omit');
      expect(init.redirect).toBe('error');
    }
    expect(JSON.stringify(repo)).not.toContain(token);
  });

  it('refuses a public repository before requesting business data', async () => {
    const fetchMock = mockAPI(url => url.endsWith('/private-demo-data')
      ? json({ private: false, permissions: { push: true } }) : undefined);
    const repo = new GitHubRepository(config, token);
    await expect(repo.connect()).rejects.toThrow('repositorio es público');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/contents/'))).toBe(false);
  });

  it('requires repository write access rather than presenting a false writable session', async () => {
    mockAPI(url => url.endsWith('/private-demo-data')
      ? json({ private: true, permissions: { push: false } }) : undefined);
    await expect(new GitHubRepository(config, token).connect()).rejects.toThrow('permiso de escritura');
  });

  it('rechecks repository visibility when saving an already connected session', async () => {
    let isPrivate = true;
    const fetchMock = mockAPI(url => url.endsWith('/private-demo-data')
      ? json({ private: isPrivate, permissions: { push: true } }) : undefined);
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    isPrivate = false;
    await expect(repo.save(state, oldSha, 'Cambio ficticio')).rejects.toThrow('repositorio es público');
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'PUT')).toHaveLength(0);
  });

  it('distinguishes an absent state file from a corrupt state', async () => {
    mockAPI();
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    expect(await repo.load()).toEqual({ state: null, sha: null });
  });

  it('decodes UTF-8 data and validates it before exposing the loaded state', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    mockAPI(url => url.includes('/contents/data/state.json')
      ? json({ type: 'file', sha: oldSha, size: bytes.length, encoding: 'base64', content: base64(bytes) }) : undefined);
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    expect(await repo.load()).toEqual({ state, sha: oldSha });
    expect(validate).toHaveBeenCalledWith(state);
  });

  it('saves the entire state with the exact expected SHA and UTF-8 content', async () => {
    const fetchMock = mockAPI((_url, init) => init.method === 'PUT'
      ? json({ content: { sha: newSha } }, 200) : undefined);
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    expect(await repo.save(state, oldSha, 'Actualizar pedido ficticio')).toEqual({ sha: newSha });
    const write = fetchMock.mock.calls.find(([, init]) => init.method === 'PUT');
    expect(write).toBeDefined();
    const body = JSON.parse(String(write![1].body));
    expect(body.sha).toBe(oldSha);
    expect(body.branch).toBe('main');
    expect(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'))).toEqual(state);
    expect(body).not.toHaveProperty('author');
    expect(body).not.toHaveProperty('committer');
  });

  it('does not refresh SHA or retry a conflict', async () => {
    const fetchMock = mockAPI((_url, init) => init.method === 'PUT'
      ? json({ message: 'sha does not match' }, 409) : undefined);
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    await expect(repo.save(state, oldSha, 'Actualizar ejemplo')).rejects.toBeInstanceOf(GitHubConflictError);
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'PUT')).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/contents/'))).toHaveLength(1);
  });

  it('treats a concurrent initial creation as a conflict, without overwriting it', async () => {
    const fetchMock = mockAPI((_url, init) => init.method === 'PUT'
      ? json({ message: 'Invalid request: sha was not supplied' }, 422) : undefined);
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    await expect(repo.save(state, null, 'Primer ejemplo')).rejects.toBeInstanceOf(GitHubConflictError);
    const writes = fetchMock.mock.calls.filter(([, init]) => init.method === 'PUT');
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String(writes[0][1].body))).not.toHaveProperty('sha');
  });

  it('rejects invalid state before issuing any write', async () => {
    const fetchMock = mockAPI();
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    validate.mockImplementationOnce(() => { throw new Error('Estado inválido'); });
    await expect(repo.save(state, oldSha, 'No válido')).rejects.toThrow('Estado inválido');
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'PUT')).toHaveLength(0);
  });

  it('preserves data and blocks writes when the state exceeds the documented limit', async () => {
    const fetchMock = mockAPI();
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    const large = { ...state, note: 'a'.repeat(GITHUB_STATE_MAX_BYTES) } as AppState;
    await expect(repo.save(large, oldSha, 'Demasiado grande')).rejects.toThrow('900 KiB');
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'PUT')).toHaveLength(0);
  });

  it.each(['../state.json', 'data/../state.json', 'data/%2e%2e/state.json', 'data\\state.json', 'public/state.json', 'data//state.json'])(
    'rejects an unsafe configured path: %s', path => {
      expect(() => new GitHubRepository({ ...config, path }, token)).toThrow(GitHubRepositoryError);
    },
  );

  it.each(['data/state.json', 'data/attachments/../state.json', 'data/attachments/a/%2fsecret.pdf', 'data/other/file.pdf'])(
    'does not fetch an attachment outside its exact allowed folder: %s', async path => {
      const fetchMock = mockAPI();
      const repo = new GitHubRepository(config, token);
      await repo.connect();
      const calls = fetchMock.mock.calls.length;
      await expect(repo.readAttachment(path)).rejects.toThrow(GitHubRepositoryError);
      expect(fetchMock.mock.calls.length).toBe(calls);
    },
  );

  it('fetches large attachments by immutable blob SHA, without using download_url', async () => {
    const bytes = new Uint8Array(1_200_000).fill(31);
    const fetchMock = mockAPI(url => {
      if (url.includes('/contents/data/attachments/order/example/file.pdf')) {
        return json({ type: 'file', sha: oldSha, size: bytes.length, encoding: 'none', content: '', download_url: 'https://untrusted.invalid/token' });
      }
      if (url.includes(`/git/blobs/${oldSha}`)) return new Response(bytes);
      return undefined;
    });
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    const blob = await repo.readAttachment('data/attachments/order/example/file.pdf');
    expect(blob.size).toBe(bytes.length);
    expect(blob.type).toBe('application/pdf');
    const raw = fetchMock.mock.calls.find(([url]) => String(url).includes('/git/blobs/'));
    expect(raw![1].headers).toMatchObject({ Accept: 'application/vnd.github.raw+json' });
    expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith('https://api.github.com/'))).toBe(true);
  });

  it('uploads an unchanged PDF to a unique safe path and records its SHA-256', async () => {
    const fetchMock = mockAPI((_url, init) => init.method === 'PUT'
      ? json({ content: { sha: newSha } }, 201) : undefined);
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    const file = new File(['%PDF-1.7\ncomprobante ficticio'], 'Comprobante de ejemplo.pdf', { type: 'application/pdf' });
    const result = await repo.writeAttachment(file, 'orders', 'ficticio-1');
    expect(result.path).toMatch(/^data\/attachments\/orders\/ficticio-1\/[a-f0-9-]+\.pdf$/);
    expect(result.sha).toBe(newSha);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    const write = fetchMock.mock.calls.find(([, init]) => init.method === 'PUT');
    const body = JSON.parse(String(write![1].body));
    expect(Buffer.from(body.content, 'base64').toString('utf8')).toBe(await file.text());
    expect(body).not.toHaveProperty('sha');
  });

  it('reads revisions for the state only and does not restore them implicitly', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    const fetchMock = mockAPI(url => {
      if (url.includes('/commits?')) return json([{ sha: newSha, commit: { message: 'Ejemplo', committer: { date: '2026-09-29T12:00:00Z' } } }]);
      if (url.includes('/contents/data/state.json')) return json({ type: 'file', sha: oldSha, size: bytes.length, encoding: 'base64', content: base64(bytes) });
      return undefined;
    });
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    expect(await repo.revisions(1000)).toEqual([{ sha: newSha, date: '2026-09-29T12:00:00Z', message: 'Ejemplo', url: `https://github.com/example-owner/private-demo-data/commit/${newSha}` }]);
    expect(await repo.loadRevision(newSha)).toEqual(state);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`ref=${newSha}`))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('per_page=50'))).toBe(true);
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'PUT')).toHaveLength(0);
  });

  it('disconnects without retaining a usable authenticated session', async () => {
    const fetchMock = mockAPI();
    const repo = new GitHubRepository(config, token);
    await repo.connect();
    repo.disconnect();
    const calls = fetchMock.mock.calls.length;
    await expect(repo.load()).rejects.toThrow('Conecta primero');
    await expect(repo.connect()).rejects.toThrow('La sesión terminó');
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
