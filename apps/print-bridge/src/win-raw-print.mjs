import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const PS_SCRIPT = String.raw`
param([string]$PrinterName, [string]$FilePath)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
public class NihaRawPrint {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DOCINFOW {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, ref DOCINFOW pDocInfo);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
  public static void Send(string printerName, byte[] bytes) {
    IntPtr h = IntPtr.Zero;
    if (!OpenPrinter(printerName, out h, IntPtr.Zero)) throw new System.ComponentModel.Win32Exception();
    try {
      var di = new DOCINFOW { pDocName = "Niha ESC/POS", pDataType = "RAW" };
      if (!StartDocPrinter(h, 1, ref di)) throw new System.ComponentModel.Win32Exception();
      try {
        if (!StartPagePrinter(h)) throw new System.ComponentModel.Win32Exception();
        try {
          int written;
          if (!WritePrinter(h, bytes, bytes.Length, out written)) throw new System.ComponentModel.Win32Exception();
        } finally { EndPagePrinter(h); }
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
'@
$bytes = [System.IO.File]::ReadAllBytes($FilePath)
[NihaRawPrint]::Send($PrinterName, $bytes)
Write-Output 'OK'
`;

/**
 * @param {string} printerName
 * @param {Buffer} data
 */
export async function sendRawToPrinter(printerName, data) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpDir = os.tmpdir();
  const binPath = path.join(tmpDir, `niha-raw-${stamp}.bin`);
  const psPath = path.join(tmpDir, `niha-raw-${stamp}.ps1`);

  await fs.writeFile(binPath, data);
  await fs.writeFile(psPath, PS_SCRIPT, 'utf8');

  try {
    await exec('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', psPath,
      '-PrinterName', printerName,
      '-FilePath', binPath,
    ], { windowsHide: true, timeout: 30000 });
  } finally {
    await fs.unlink(binPath).catch(() => {});
    await fs.unlink(psPath).catch(() => {});
  }
}
