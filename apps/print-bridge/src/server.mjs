import express from 'express';
import cors from 'cors';
import { listPrinters } from './printers.mjs';
import { printPngBase64 } from './print.mjs';

const PORT = Number(process.env.NIHA_PRINT_PORT ?? 9321);
const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '15mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'niha-print-bridge', version: '1.0.0' });
});

app.get('/printers', async (_req, res) => {
  try {
    const printers = await listPrinters();
    res.json({ ok: true, printers });
  } catch (err) {
    res.status(500).json({ ok: false, message: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/print', async (req, res) => {
  const printer = String(req.body?.printer ?? '').trim();
  const jobs = Array.isArray(req.body?.jobs) ? req.body.jobs : [];

  if (!printer) {
    res.status(400).json({ ok: false, message: 'اسم الطابعة مطلوب' });
    return;
  }
  if (!jobs.length) {
    res.status(400).json({ ok: false, message: 'لا توجد مهام طباعة' });
    return;
  }

  try {
    for (let i = 0; i < jobs.length; i += 1) {
      const job = jobs[i];
      await printPngBase64(
        printer,
        job.pngBase64,
        job.pngHeightPx,
        job.pngWidthPx,
        job.paperWidthMm,
        'portrait',
        job.paperSize,
      );
      if (i < jobs.length - 1) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
    res.json({ ok: true, printer, count: jobs.length });
  } catch (err) {
    res.status(500).json({
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Niha Print Bridge running on http://127.0.0.1:${PORT}`);
});
