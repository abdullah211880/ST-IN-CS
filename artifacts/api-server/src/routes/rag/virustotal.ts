import { Router } from "express";

const router = Router();

function urlToVtId(url: string): string {
  return Buffer.from(url).toString("base64url").replace(/=+$/, "");
}

async function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

router.post("/api/virustotal-scan", async (req, res) => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    res.status(200).json({ notConfigured: true });
    return;
  }

  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  const headers = { "x-apikey": apiKey };

  try {
    const cached = await fetch(
      `https://www.virustotal.com/api/v3/urls/${urlToVtId(url)}`,
      { headers }
    );

    if (cached.ok) {
      const d = await cached.json() as any;
      const stats = d.data?.attributes?.last_analysis_stats ?? {};
      res.json({
        url,
        malicious:  stats.malicious  ?? 0,
        suspicious: stats.suspicious ?? 0,
        undetected: stats.undetected ?? 0,
        harmless:   stats.harmless   ?? 0,
        total: (Object.values(stats) as number[]).reduce((a, b) => a + b, 0),
        scanDate: d.data?.attributes?.last_analysis_date ?? null,
        cached: true,
      });
      return;
    }

    const submit = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ url }).toString(),
    });

    if (!submit.ok) {
      const txt = await submit.text();
      res.status(502).json({ error: `VirusTotal submit error ${submit.status}`, detail: txt });
      return;
    }

    const submitData = await submit.json() as any;
    const analysisId = submitData.data?.id as string | undefined;
    if (!analysisId) {
      res.status(502).json({ error: "No analysis ID returned" });
      return;
    }

    await sleep(4000);

    const analysis = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
      { headers }
    );

    if (!analysis.ok) {
      res.status(502).json({ error: `Analysis fetch failed: ${analysis.status}` });
      return;
    }

    const analysisData = await analysis.json() as any;
    const attrs = analysisData.data?.attributes ?? {};
    const stats = attrs.stats ?? {};

    res.json({
      url,
      malicious:  stats.malicious  ?? 0,
      suspicious: stats.suspicious ?? 0,
      undetected: stats.undetected ?? 0,
      harmless:   stats.harmless   ?? 0,
      total: (Object.values(stats) as number[]).reduce((a, b) => a + b, 0),
      scanDate: null,
      cached: false,
      status: attrs.status ?? "unknown",
    });
  } catch (err) {
    console.error("VirusTotal error:", err);
    res.status(500).json({ error: String(err) });
  }
});

export { router as virusTotalRouter };
