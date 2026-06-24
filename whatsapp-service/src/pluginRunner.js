// Plugin runner: jalankan kode plugin user di worker_thread terisolasi.
// - Hard timeout + terminate() jadi backstop untuk loop tak-henti / async hang.
// - env: {} supaya secret proses induk tidak bocor ke kode user.
// - resourceLimits untuk cap memori.
import { Worker } from 'node:worker_threads';

const WORKER_URL = new URL('./pluginWorker.js', import.meta.url);

/**
 * @param {string} code   body handler JS yang ditulis user
 * @param {object} ctx    { args, rawArgs, text, sender, chatId, sessionId }
 * @param {{timeoutMs?: number}} opts
 * @returns {Promise<{ok:boolean, output?:{text?:string,mediaUrl?:string,mediaType?:string}, logs?:string[], error?:string}>}
 */
export function runPlugin(code, ctx, { timeoutMs = 8000 } = {}) {
  const limit = Math.min(Math.max(Number(timeoutMs) || 8000, 1000), 15000);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (val) => { if (!settled) { settled = true; resolve(val); } };

    let worker;
    try {
      worker = new Worker(WORKER_URL, {
        workerData: { code: String(code ?? ''), ctx: ctx ?? {}, timeoutMs: limit },
        env: {}, // jangan bocorkan env/secret ke kode user
        resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
      });
    } catch (err) {
      return finish({ ok: false, error: `Gagal start plugin: ${err?.message || err}`, logs: [] });
    }

    // Backstop di atas vm timeout (vm.timeout hanya hentikan kode sinkron).
    const killTimer = setTimeout(() => {
      worker.terminate();
      finish({ ok: false, error: `Plugin timeout (> ${limit}ms)`, logs: [] });
    }, limit + 1500);

    worker.on('message', (msg) => {
      clearTimeout(killTimer);
      worker.terminate();
      finish(msg && typeof msg === 'object'
        ? msg
        : { ok: false, error: 'Output plugin tidak valid', logs: [] });
    });

    worker.on('error', (err) => {
      clearTimeout(killTimer);
      worker.terminate();
      finish({ ok: false, error: String(err?.message || err), logs: [] });
    });

    worker.on('exit', (exitCode) => {
      clearTimeout(killTimer);
      if (!settled) finish({ ok: false, error: `Plugin berhenti (exit ${exitCode})`, logs: [] });
    });
  });
}
