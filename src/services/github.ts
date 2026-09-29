import type { AppState, RepositoryConfig, SessionIdentity } from '../domain/types';
import { validateState } from '../domain/engine';

const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
export const GITHUB_STATE_MAX_BYTES = 900 * 1024;
export const GITHUB_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
const JSON_RESPONSE_MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'text/csv',
]);

export class GitHubRepositoryError extends Error {
  constructor(message: string, public readonly status: number | null = null) {
    super(message);
    this.name = 'GitHubRepositoryError';
  }
}

export class GitHubConflictError extends GitHubRepositoryError {
  constructor() {
    super('Otra persona guardó cambios. Tus cambios no se sobrescribieron. Recarga los datos y revisa la operación antes de volver a guardarla.', 409);
    this.name = 'GitHubConflictError';
  }
}

interface GitHubFile {
  type: string;
  sha: string;
  size: number;
  encoding?: string;
  content?: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function safePath(path: string): string {
  if (!path.startsWith('data/') || path.length > 400 || /[\\%\u0000-\u001f\u007f?#]/.test(path)) {
    throw new GitHubRepositoryError('La ruta debe estar dentro de la carpeta privada data.');
  }
  const segments = path.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || !/^[A-Za-z0-9._-]+$/.test(segment))) {
    throw new GitHubRepositoryError('La ruta de datos contiene un nombre no permitido.');
  }
  return path;
}

function safeSha(sha: string): string {
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i.test(sha)) {
    throw new GitHubRepositoryError('La versión del archivo no es válida. Recarga los datos.');
  }
  return sha;
}

function validateConfig(config: RepositoryConfig): RepositoryConfig {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/.test(config.owner) ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(config.repo) ||
      !config.branch || config.branch.length > 250 || /[\u0000-\u0020\u007f~^:?*\[\\]/.test(config.branch) ||
      config.branch.startsWith('-') || config.branch.includes('..') || config.branch.includes('@{')) {
    throw new GitHubRepositoryError('Revisa el propietario, repositorio y rama de GitHub.');
  }
  const path = safePath(config.path);
  if (!path.endsWith('.json')) throw new GitHubRepositoryError('El archivo compartido debe tener extensión .json.');
  return Object.freeze({ ...config, path });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 16_384) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16_384));
  }
  return btoa(binary);
}

function base64ToBytes(encoded: string): Uint8Array {
  try {
    const binary = atob(encoded.replace(/\s/g, ''));
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    throw new GitHubRepositoryError('GitHub devolvió un archivo que no se pudo leer.');
  }
}

async function responseBytes(response: Response, maximum: number): Promise<Uint8Array> {
  const declaredSize = Number(response.headers.get('content-length'));
  if (declaredSize > maximum) throw new GitHubRepositoryError('El archivo supera el tamaño permitido.');
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new GitHubRepositoryError('El archivo supera el tamaño permitido.');
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

function extensionFor(file: File): string {
  const byType: Record<string, string> = {
    'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg',
    'image/webp': 'webp', 'text/plain': 'txt', 'text/csv': 'csv',
  };
  return byType[file.type];
}

/** GitHub stores the complete state as one compare-and-swap commit. No token is persisted. */
export class GitHubRepository {
  readonly config: RepositoryConfig;
  #token: string;
  #identity: SessionIdentity | null = null;
  readonly #root: string;

  constructor(config: RepositoryConfig, token: string) {
    this.config = validateConfig(config);
    const trimmed = token.trim();
    if (!trimmed || /\s/.test(trimmed) || trimmed.length > 300) {
      throw new GitHubRepositoryError('Introduce un token personal de GitHub válido.');
    }
    this.#token = trimmed;
    this.#root = this.config.path.slice(0, this.config.path.lastIndexOf('/') + 1);
  }

  get #repoRoute(): string {
    return `/repos/${encodeURIComponent(this.config.owner)}/${encodeURIComponent(this.config.repo)}`;
  }

  #contentRoute(path: string, ref = this.config.branch): string {
    return `${this.#repoRoute}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`;
  }

  async #fetch(route: string, init: RequestInit = {}, allowMissing = false): Promise<Response> {
    if (!this.#token) throw new GitHubRepositoryError('La sesión terminó. Conecta tu cuenta de GitHub de nuevo.');
    let response: Response;
    try {
      response = await fetch(`${API}${route}`, {
        ...init,
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.#token}`,
          'X-GitHub-Api-Version': API_VERSION,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      });
    } catch {
      throw new GitHubRepositoryError('No se pudo confirmar la operación con GitHub. Revisa la conexión y recarga antes de repetirla: una solicitud puede haberse recibido aunque su respuesta no llegue.');
    }
    if (response.ok || (allowMissing && response.status === 404)) return response;
    if (response.status === 409) throw new GitHubConflictError();
    if (response.status === 422 && init.method === 'PUT') {
      // GitHub also uses 422 when a create/update omitted or supplied an obsolete SHA.
      let mentionsSha = false;
      try {
        const problem: unknown = JSON.parse(new TextDecoder().decode(await responseBytes(response, 64 * 1024)));
        mentionsSha = isObject(problem) && (String(problem.message).toLowerCase().includes('sha') ||
          (Array.isArray(problem.errors) && problem.errors.some(error => isObject(error) && error.field === 'sha')));
      } catch { /* A malformed error response never becomes a retry or overwrite. */ }
      if (mentionsSha) throw new GitHubConflictError();
    }
    const messages: Record<number, string> = {
      401: 'GitHub no aceptó el token. Revisa su vigencia o genera uno nuevo.',
      403: response.headers.get('x-ratelimit-remaining') === '0'
        ? 'GitHub alcanzó su límite temporal de solicitudes. Espera unos minutos antes de volver a intentarlo.'
        : 'El token no permite esta operación. Revisa el acceso al repositorio y el permiso Contents: lectura y escritura.',
      404: 'No se encontró el repositorio, la rama o el archivo, o tu cuenta no tiene acceso.',
      413: 'El archivo supera el tamaño que GitHub acepta.',
      422: 'GitHub no aceptó los datos de esta operación. Recarga los datos y revisa la configuración.',
      429: 'GitHub solicitó esperar antes de realizar otra operación. No se guardaron cambios.',
    };
    throw new GitHubRepositoryError(messages[response.status] || 'GitHub no pudo completar la operación. No se guardaron cambios.', response.status);
  }

  async #json(route: string, init?: RequestInit): Promise<unknown> {
    const response = await this.#fetch(route, init);
    try { return JSON.parse(new TextDecoder().decode(await responseBytes(response, JSON_RESPONSE_MAX_BYTES))); }
    catch (error) {
      if (error instanceof GitHubRepositoryError) throw error;
      throw new GitHubRepositoryError('No se pudo interpretar la respuesta de GitHub.');
    }
  }

  async #privateWritable(): Promise<void> {
    const repo = await this.#json(this.#repoRoute);
    if (!isObject(repo) || repo.private !== true) {
      throw new GitHubRepositoryError('Los datos reales sólo pueden guardarse en un repositorio privado. Este repositorio es público; utiliza la demostración o configura un repositorio privado de datos.');
    }
    if (!isObject(repo.permissions) || repo.permissions.push !== true) {
      throw new GitHubRepositoryError('Tu cuenta necesita permiso de escritura en el repositorio privado. Solicita acceso a su propietaria o propietario.');
    }
  }

  async #authorized(): Promise<void> {
    if (!this.#identity) throw new GitHubRepositoryError('Conecta primero tu cuenta de GitHub.');
    // Recheck visibility and access before each operation; do not rely on yesterday's session.
    await this.#privateWritable();
  }

  async connect(): Promise<SessionIdentity> {
    this.#identity = null;
    const user = await this.#json('/user');
    if (!isObject(user) || typeof user.login !== 'string' || typeof user.id !== 'number') {
      throw new GitHubRepositoryError('No se pudo verificar la identidad de tu cuenta de GitHub.');
    }
    await this.#privateWritable();
    await this.#json(`${this.#repoRoute}/branches/${encodeURIComponent(this.config.branch)}`);
    this.#identity = {
      login: user.login,
      name: typeof user.name === 'string' && user.name ? user.name : user.login,
      id: user.id,
      avatarUrl: typeof user.avatar_url === 'string' ? user.avatar_url : '',
      canWrite: true,
      privateRepo: true,
    };
    return { ...this.#identity };
  }

  async #file(path: string, ref: string, maximum: number): Promise<{ bytes: Uint8Array; sha: string } | null> {
    const response = await this.#fetch(this.#contentRoute(path, ref), {
      headers: { Accept: 'application/vnd.github.object+json' },
    }, true);
    if (response.status === 404) return null;
    let metadata: unknown;
    try { metadata = JSON.parse(new TextDecoder().decode(await responseBytes(response, JSON_RESPONSE_MAX_BYTES))); }
    catch (error) {
      if (error instanceof GitHubRepositoryError) throw error;
      throw new GitHubRepositoryError('No se pudo leer la información del archivo.');
    }
    if (!isObject(metadata) || metadata.type !== 'file' || typeof metadata.sha !== 'string' || typeof metadata.size !== 'number') {
      throw new GitHubRepositoryError('La ruta seleccionada no es un archivo de datos válido.');
    }
    const file = metadata as unknown as GitHubFile;
    if (file.size > maximum) throw new GitHubRepositoryError('El archivo supera el tamaño permitido. Exporta y revisa los datos antes de continuar.');
    let bytes: Uint8Array;
    if (file.encoding === 'base64' && typeof file.content === 'string') bytes = base64ToBytes(file.content);
    else {
      // Contents omits base64 content above 1 MiB. Fetch the same immutable Git blob,
      // never download_url or the moving branch, so bytes and returned SHA agree.
      const raw = await this.#fetch(`${this.#repoRoute}/git/blobs/${safeSha(file.sha)}`, {
        headers: { Accept: 'application/vnd.github.raw+json' },
      });
      bytes = await responseBytes(raw, maximum);
    }
    if (bytes.length > maximum) throw new GitHubRepositoryError('El archivo supera el tamaño permitido.');
    return { bytes, sha: safeSha(file.sha) };
  }

  #parseState(bytes: Uint8Array): AppState {
    let input: unknown;
    try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw new GitHubRepositoryError('El archivo compartido no contiene datos JSON válidos. No se modificó el archivo.'); }
    return validateState(input);
  }

  async load(): Promise<{ state: AppState | null; sha: string | null }> {
    await this.#authorized();
    const file = await this.#file(this.config.path, this.config.branch, GITHUB_STATE_MAX_BYTES);
    return file ? { state: this.#parseState(file.bytes), sha: file.sha } : { state: null, sha: null };
  }

  async save(state: AppState, expectedSha: string | null, message: string): Promise<{ sha: string }> {
    // Validate before any outgoing write; the complete state, not individual ledgers,
    // forms one commit. The engine has already applied financial/domain commands.
    const valid = validateState(state);
    const bytes = new TextEncoder().encode(JSON.stringify(valid));
    if (bytes.length > GITHUB_STATE_MAX_BYTES) {
      throw new GitHubRepositoryError('Los datos superan 900 KiB. Exporta una copia y consulta al equipo antes de seguir guardando; no se borraron registros.');
    }
    if (expectedSha !== null) safeSha(expectedSha);
    await this.#authorized();
    return this.#put(this.config.path, bytes, expectedSha, message);
  }

  async #put(path: string, bytes: Uint8Array, expectedSha: string | null, message: string): Promise<{ sha: string }> {
    const cleanMessage = message.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 180) || 'Actualizar datos del negocio';
    const result = await this.#json(this.#contentRoute(path).split('?')[0], {
      method: 'PUT',
      body: JSON.stringify({
        message: cleanMessage,
        content: bytesToBase64(bytes),
        branch: this.config.branch,
        ...(expectedSha !== null ? { sha: expectedSha } : {}),
      }),
    });
    if (!isObject(result) || !isObject(result.content) || typeof result.content.sha !== 'string') {
      throw new GitHubRepositoryError('GitHub recibió la solicitud pero no confirmó su versión. Recarga antes de repetir la operación.');
    }
    return { sha: safeSha(result.content.sha) };
  }

  #attachmentPath(path: string): string {
    safePath(path);
    if (!path.startsWith(`${this.#root}attachments/`)) {
      throw new GitHubRepositoryError('El archivo no pertenece a la carpeta de adjuntos de este negocio.');
    }
    return path;
  }

  async readAttachment(path: string): Promise<Blob> {
    this.#attachmentPath(path);
    await this.#authorized();
    const file = await this.#file(path, this.config.branch, GITHUB_ATTACHMENT_MAX_BYTES);
    if (!file) throw new GitHubRepositoryError('El adjunto no está disponible en GitHub.', 404);
    const extension = path.split('.').pop()?.toLowerCase();
    const mime: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain', csv: 'text/csv' };
    return new Blob([new Uint8Array(file.bytes).buffer], { type: mime[extension || ''] || 'application/octet-stream' });
  }

  async writeAttachment(file: File, entityType: string, entityId: string): Promise<{ path: string; sha: string; hash: string }> {
    if (!/^[A-Za-z0-9_-]{1,60}$/.test(entityType) || !/^[A-Za-z0-9_-]{1,100}$/.test(entityId)) {
      throw new GitHubRepositoryError('El registro al que pertenece el adjunto no es válido.');
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      throw new GitHubRepositoryError('Adjunta un PDF, imagen PNG/JPG/WebP, texto o CSV.');
    }
    if (file.size < 1 || file.size > GITHUB_ATTACHMENT_MAX_BYTES) {
      throw new GitHubRepositoryError('El adjunto debe tener contenido y ocupar como máximo 8 MiB.');
    }
    await this.#authorized();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const hashBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const hash = Array.from(hashBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const path = `${this.#root}attachments/${entityType}/${entityId}/${crypto.randomUUID()}.${extensionFor(file)}`;
    this.#attachmentPath(path);
    const result = await this.#put(path, bytes, null, `Adjuntar archivo a ${entityType} ${entityId}`);
    return { path, sha: result.sha, hash };
  }

  async revisions(limit = 20): Promise<Array<{ sha: string; date: string; message: string; url: string }>> {
    await this.#authorized();
    const count = Math.min(50, Math.max(1, Math.floor(Number.isFinite(limit) ? limit : 20)));
    const result = await this.#json(`${this.#repoRoute}/commits?path=${encodeURIComponent(this.config.path)}&sha=${encodeURIComponent(this.config.branch)}&per_page=${count}`);
    if (!Array.isArray(result)) throw new GitHubRepositoryError('No se pudo consultar el historial del archivo.');
    return result.map(commit => {
      if (!isObject(commit) || typeof commit.sha !== 'string' || !isObject(commit.commit)) {
        throw new GitHubRepositoryError('El historial devolvió una versión no válida.');
      }
      const author = isObject(commit.commit.committer) ? commit.commit.committer : commit.commit.author;
      return {
        sha: safeSha(commit.sha),
        date: isObject(author) && typeof author.date === 'string' ? author.date : '',
        message: typeof commit.commit.message === 'string' ? commit.commit.message : '',
        url: `https://github.com/${encodeURIComponent(this.config.owner)}/${encodeURIComponent(this.config.repo)}/commit/${safeSha(commit.sha)}`,
      };
    });
  }

  async loadRevision(commit: string): Promise<AppState> {
    safeSha(commit);
    await this.#authorized();
    const file = await this.#file(this.config.path, commit, GITHUB_STATE_MAX_BYTES);
    if (!file) throw new GitHubRepositoryError('Esta versión no contiene el archivo de datos.', 404);
    return this.#parseState(file.bytes);
  }

  disconnect(): void {
    this.#token = '';
    this.#identity = null;
  }
}
