import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const ALLOWED_CATEGORIES = new Set([
  "Slovensko",
  "Peniaze a práca",
  "Doprava a regióny",
  "Úrady a služby",
  "Rodina a zdravie",
  "Spotrebiteľ a bezpečnosť",
  "Šport",
]);

const DAILY_CAP = 15;

const JWKS = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function secretKey() {
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  return keys["default"] || "";
}

async function verifyGitHub(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("missing GitHub OIDC token");
  const token = auth.slice(7);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: "https://token.actions.githubusercontent.com",
    audience: "objektiv24-auto-articles",
  });
  if (payload.repository !== "infoznetu-rgb/objektiv24") throw new Error("wrong repository");
  if (payload.ref !== "refs/heads/main") throw new Error("wrong ref");
  const workflowRef = String(payload.workflow_ref || payload.job_workflow_ref || "");
  if (!workflowRef.includes(".github/workflows/auto-articles.yml@refs/heads/main")) {
    throw new Error("wrong workflow");
  }
  return payload;
}

function clean(v: unknown) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}
function cutAtWord(v: string, limit: number) {
  const s=clean(v);
  if(s.length<=limit) return s;
  const slice=s.slice(0,limit+1);
  const i=slice.lastIndexOf(" ");
  return (i>=24?slice.slice(0,i):slice.slice(0,limit)).replace(/[\s,:;–—-]+$/,"").trim();
}
function fallbackSeoTitle(title: string) {
  const t=clean(title).replace(/[.!?]+$/,"");
  if(t.length<=60) return t;
  const first=t.split(/(?<=[.!?])\s+/)[0];
  if(first.length>=25&&first.length<=60) return first;
  return cutAtWord(t,60);
}
function fallbackMetaDescription(intro: string) {
  const t=clean(intro);
  if(t.length<=155) return t;
  const cut=cutAtWord(t,155);
  return /[.!?]$/.test(cut)?cut:cut+".";
}

function allowedSource(raw: string) {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    return [
      "socpoist.sk",
      "financnasprava.sk",
      "ndsas.sk",
      "soi.sk",
      "zssk.sk",
      "slposta.sk",
      "posta.sk",
      "slovensko.sk",
      "minv.sk",
      "employment.gov.sk",
      "health.gov.sk",
      "mindop.sk",
      "economy.gov.sk",
      "svps.sk",
    ].includes(host) || host.endsWith(".gov.sk");
  } catch {
    return false;
  }
}

function fallbackFor(category: string) {
  if (category === "Peniaze a práca") return "/assets/fallback/money.svg";
  if (category === "Doprava a regióny") return "/assets/fallback/transport.svg";
  if (category === "Úrady a služby") return "/assets/fallback/services.svg";
  if (category === "Rodina a zdravie") return "/assets/fallback/health.svg";
  if (category === "Spotrebiteľ a bezpečnosť") return "/assets/fallback/consumer.svg";
  return "/assets/fallback/general.svg";
}

function normalizedTitle(v: string) {
  return v.toLocaleLowerCase("sk")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalUrl(raw: string) {
  try {
    const u = new URL(raw);
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.hash = "";
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch {
    return clean(raw).replace(/^https?:\/\/www\./i, "https://").replace(/\/+$/, "");
  }
}

const STOP = new Set([
  "a","aj","ale","alebo","aby","ako","do","na","za","z","zo","v","vo","od","pre","pri",
  "sa","si","je","su","bol","bola","boli","bude","budu","ma","maju","mat","o","k","ku",
  "po","pod","nad","cez","medzi","bez","ktory","ktora","ktore","ich","jej","jeho","tento",
  "tato","toto","cast","konca","roku","dnes","novy","nova","nove"
]);

function titleStems(v: string) {
  return normalizedTitle(v).split(" ")
    .filter(w => w.length >= 4 && !STOP.has(w))
    .map(w => w.length >= 6 ? w.slice(0, 6) : w);
}

function likelyDuplicate(a: string, b: string) {
  const aa = new Set(titleStems(a));
  const bb = new Set(titleStems(b));
  if (!aa.size || !bb.size) return false;
  let common = 0;
  for (const x of aa) if (bb.has(x)) common++;
  const dice = (2 * common) / (aa.size + bb.size);
  return common >= 3 && dice >= 0.30;
}

function extractUrls(v: string) {
  return clean(v).match(/https?:\/\/[^\s"'\]\|]+/gi) || [];
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const claims = await verifyGitHub(req);
    const key = secretKey();
    if (!key) return json({ error: "Supabase secret key unavailable" }, 503);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const input = await req.json().catch(() => ({}));
    const action = clean(input?.action || "status");

    if (action === "status") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [{ count }, recent, sourceItems] = await Promise.all([
        supabase.from("drafts").select("id", { count: "exact", head: true })
          .eq("state", "published").gte("published_at", since),
        supabase.from("drafts").select("title,sources,published_at")
          .eq("state", "published").order("published_at", { ascending: false }).limit(120),
        supabase.from("automation_source_items").select("source_url")
          .order("updated_at", { ascending: false }).limit(300),
      ]);
      const recentRows = recent.data || [];
      const draftUrls = recentRows.flatMap((x: any) => extractUrls(x.sources || ""));
      return json({
        ok: true,
        published_last_24h: count || 0,
        daily_cap: DAILY_CAP,
        recent_titles: recentRows.map((x: any) => x.title),
        recent_source_urls: [...new Set(draftUrls.map(canonicalUrl))],
        known_sources: (sourceItems.data || []).map((x: any) => canonicalUrl(x.source_url)),
        run_sha: claims.sha || null,
      });
    }

    if (action !== "publish" && action !== "reject") return json({ error: "unsupported action" }, 400);

    const a = input?.article || {};
    const sourceUrl = clean(a.source_url);
    const sourceName = clean(a.source_name);
    const sourceTitle = clean(a.source_title);
    const title = clean(a.title);
    const category = clean(a.category);
    const intro = clean(a.intro);
    const whatHappened = clean(a.what_happened);
    const whatItMeans = clean(a.what_it_means);
    const nextStep = clean(a.next_step);
    const seoTitle = clean(a.seo_title) || fallbackSeoTitle(title);
    const metaDescription = clean(a.meta_description) || fallbackMetaDescription(intro);

    if (!allowedSource(sourceUrl)) return json({ error: "source URL is not allowed" }, 400);
    if (action === "reject") {
      const reason = clean(input?.reason || "rejected by local QA").slice(0, 800);
      const rejected = await supabase.from("automation_source_items").upsert({
        source_url: sourceUrl,
        source_name: sourceName,
        source_title: sourceTitle,
        status: "rejected",
        last_error: reason,
        updated_at: new Date().toISOString(),
      });
      if (rejected.error) throw rejected.error;
      return json({ ok: true, recorded: true, status: "rejected" });
    }
    if (!ALLOWED_CATEGORIES.has(category)) return json({ error: "invalid category" }, 400);
    if (title.length < 25 || title.length > 105 ||
        intro.length < 80 || intro.length > 220 ||
        whatHappened.length < 250 || whatHappened.length > 520 ||
        whatItMeans.length < 180 || whatItMeans.length > 360 ||
        nextStep.length < 100 || nextStep.length > 280 ||
        seoTitle.length < 25 || seoTitle.length > 70 ||
        metaDescription.length < 80 || metaDescription.length > 180) {
      return json({ error: "article field length is outside allowed range" }, 400);
    }
    if (/\b(a|aj|ale|alebo|do|na|o|od|po|pod|pre|pri|s|so|v|vo|z|za|zo|že)$/i.test(title) ||
        /\b(a|aj|ale|alebo|do|na|o|od|po|pod|pre|pri|s|so|v|vo|z|za|zo|že)$/i.test(seoTitle) ||
        /zamestnávateľi/i.test(title+" "+seoTitle)) {
      return json({ error: "title failed language/completeness check" }, 400);
    }

    const political = /\b(voľb|volieb|parlament|politick|koalíci|opozíci|prezident|premiér|minister|poslanec|politická strana)\b/i;
    if (political.test(title + " " + intro)) return json({ skipped: true, reason: "political topic" });

    const sourceCanonical = canonicalUrl(sourceUrl);
    const allSourceItems = await supabase.from("automation_source_items")
      .select("source_url,status,draft_id").limit(500);
    if ((allSourceItems.data || []).some((x: any) => canonicalUrl(x.source_url) === sourceCanonical)) {
      return json({ skipped: true, reason: "source already processed" });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const daily = await supabase.from("drafts").select("id", { count: "exact", head: true })
      .eq("state", "published").gte("published_at", since);
    if ((daily.count || 0) >= DAILY_CAP) return json({ skipped: true, reason: "24h publication cap reached" });

    const recent = await supabase.from("drafts").select("id,title,sources")
      .in("state", ["draft", "published"]).order("updated_at", { ascending: false }).limit(250);
    const nt = normalizedTitle(title);
    for (const row of recent.data || []) {
      const rowTitle = clean((row as any).title);
      const rt = normalizedTitle(rowTitle);
      if (rt === nt || (nt.length > 38 && (rt.includes(nt) || nt.includes(rt))) ||
          likelyDuplicate(title, rowTitle) || likelyDuplicate(sourceTitle, rowTitle)) {
        await supabase.from("automation_source_items").upsert({
          source_url: sourceUrl, source_name: sourceName, source_title: sourceTitle,
          status: "skipped", last_error: "semantic duplicate title", updated_at: new Date().toISOString()
        });
        return json({ skipped: true, reason: "semantic duplicate" });
      }
      const rowSources = extractUrls(clean((row as any).sources)).map(canonicalUrl);
      if (rowSources.includes(sourceCanonical)) {
        await supabase.from("automation_source_items").upsert({
          source_url: sourceUrl, source_name: sourceName, source_title: sourceTitle,
          status: "skipped", last_error: "duplicate source", updated_at: new Date().toISOString()
        });
        return json({ skipped: true, reason: "duplicate source" });
      }
    }

    const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 2 });
    if (users.error) throw users.error;
    if (users.data.users.length !== 1) return json({ error: "expected exactly one auth user" }, 409);
    const userId = users.data.users[0].id;

    const image = "https://objektiv24.sk" + fallbackFor(category);
    const insert = await supabase.from("drafts").insert({
      user_id: userId,
      title,
      seo_title: seoTitle,
      meta_description: metaDescription,
      category,
      intro,
      what_happened: whatHappened,
      what_it_means: whatItMeans,
      next_step: nextStep,
      sources: sourceUrl,
      state: "published",
      image_url: image,
      image_type: "",
      image_alt: clean(a.image_alt) || ("Ilustračná grafika k téme: " + title),
      image_source_url: image,
      image_credit: "Objektív24",
      image_license: "Interná ilustračná grafika",
      image_position: "50% 50%",
      image_search_query: clean(a.image_search_query),
      image_reviewed: true,
      image_generation_status: "pending",
      image_generation_mode: "auto",
      image_error: null,
      verified_at: new Date().toISOString(),
    }).select("id,title,slug,published_at,push_sent_at").single();

    if (insert.error) {
      await supabase.from("automation_source_items").upsert({
        source_url: sourceUrl, source_name: sourceName, source_title: sourceTitle,
        status: "failed", last_error: insert.error.message, updated_at: new Date().toISOString()
      });
      throw insert.error;
    }

    await supabase.from("automation_source_items").upsert({
      source_url: sourceUrl,
      source_name: sourceName,
      source_title: sourceTitle,
      status: "published",
      draft_id: insert.data.id,
      last_error: "",
      updated_at: new Date().toISOString(),
    });

    // Image generation is deliberately non-blocking: the article remains published
    // even when the external image provider is temporarily unavailable.
    EdgeRuntime.waitUntil(
      fetch((Deno.env.get("SUPABASE_URL") || "") + "/functions/v1/generate-editorial-image", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + key,
          "apikey": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draft_id: insert.data.id,
          mode: "auto",
          force: false,
        }),
      }).then(async (r) => {
        if (!r.ok) console.warn("Automatic image generation request failed:", r.status, await r.text());
      }).catch((error) => {
        console.warn("Automatic image generation request failed:", error?.message || error);
      })
    );

    return json({
      ok: true,
      published: true,
      article: insert.data,
      public_url: "https://objektiv24.sk/clanky/" + insert.data.slug + "/",
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
