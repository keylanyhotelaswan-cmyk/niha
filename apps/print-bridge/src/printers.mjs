import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export async function listPrinters() {
  const { stdout } = await exec('powershell.exe', [
    '-NoProfile',
    '-Command',
    'Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress',
  ], { windowsHide: true });

  const trimmed = (stdout ?? '').trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed);
  if (Array.isArray(parsed)) return parsed.filter(Boolean);
  return parsed ? [parsed] : [];
}
