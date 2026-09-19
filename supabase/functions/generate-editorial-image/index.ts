import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGIN = "https://objektiv24.sk";
const BUCKET = "article-images";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_MODEL = "gpt-image-2";

const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {...cors, "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"},
});

function secretKey() {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return String(keys["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  } catch {
    return String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  }
}
function clean(v: unknown, limit = 4000) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}
function isFallback(url: unknown) {
  return !clean(url) || /\/assets\/fallback\//i.test(clean(url));
}
function isSensitiveTopic(draft: any) {
  const text = clean([
    draft?.title, draft?.category, draft?.intro, draft?.what_happened
  ].join(" ")).toLocaleLowerCase("sk").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const blocked = [
    /\b(volb|volieb|parlament|politick|koalici|opozici|prezident|premier|minister|poslanec)\b/,
    /\b(nehod|havari|poziar|vrazd|utok|strelb|vybuch|vojna|nasil|kriminal|polici|zatkn|obvinen|sud)\b/,
    /\b(zomrel|umrt|trag|hospitaliz|zachranar|zasah zachran)\b/
  ];
  return blocked.some(r => r.test(text));
}
function sceneFor(draft: any) {
  const text = clean([draft?.title,draft?.category,draft?.intro].join(" ")).toLocaleLowerCase("sk");
  if (/dôchod|penzi|sociáln/.test(text)) {
    return {
      prompt: "an older adult at a kitchen table calmly reviewing neutral paperwork beside a laptop or smartphone, reading glasses nearby, ordinary Slovak home",
      alt: "Starší človek pri stole vybavuje administratívu s notebookom a dokumentmi"
    };
  }
  if (/digital|online|elektron|služb|úrad/.test(text)) {
    return {
      prompt: "an adult citizen at home or at a simple desk using a laptop and smartphone to handle an online public service, neutral paperwork nearby, believable Slovak or Central European setting",
      alt: "Občan používa notebook a mobil pri vybavovaní služby online"
    };
  }
  if (/cest|diaľnic|tunel|dopr|vlak|autobus|výluk|uzáver/.test(text)) {
    return {
      prompt: "a calm everyday transport scene in Slovakia or Central Europe relevant to the article, a road, railway station or public transport setting, no accident and no emergency response",
      alt: "Ilustračná dopravná scéna v bežnom slovenskom prostredí"
    };
  }
  if (/spotreb|reklam|výrobok|bezpeč|podvod/.test(text)) {
    return {
      prompt: "a person at a kitchen or home desk carefully checking a consumer notice or product information on a laptop, neutral household setting, no visible brand logos",
      alt: "Spotrebiteľ si doma overuje informácie na notebooku"
    };
  }
  if (/zdrav|lekár|poist|rodin|dieťa|škôlk|škol/.test(text)) {
    return {
      prompt: "a calm non-clinical everyday family or administrative scene relevant to the article, natural Slovak home or office environment, no illness, distress or identifiable patient",
      alt: "Pokojná ilustračná scéna k rodinnej alebo zdravotnej administratíve"
    };
  }
  return {
    prompt: "an authentic everyday Slovak or Central European scene directly relevant to the article, one ordinary adult as the clear focal subject, natural environment and believable objects",
    alt: "Fotorealistická ilustračná scéna k téme článku"
  };
}
function buildPrompt(draft: any) {
  const scene = sceneFor(draft);
  const context = clean(draft?.intro || draft?.what_happened || "", 700);
  return `Create a highly photorealistic editorial news photograph for the Slovak news website Objektív24.

Article topic: ${clean(draft?.title, 220)}
Section: ${clean(draft?.category, 100)}
Editorial context: ${context}
Visible scene: ${scene.prompt}.

Visual direction: authentic documentary photography, believable Slovak or Central European environment, natural daylight, subtle realistic colors, 35mm or 50mm photojournalistic lens, eye-level perspective, natural body language, realistic skin and hands, physically correct objects, shallow-to-moderate depth of field.

Composition: horizontal editorial hero image, one clear focal subject, strong but natural composition, enough clean space for responsive cropping, readable as a small mobile thumbnail.

Do not create an illustration, vector art, 3D render, poster, infographic, collage, stock-photo cliché, advertising composition or futuristic scene. Do not show large currency symbols, charts, arrows, floating icons, UI overlays, captions, readable document text, logos, watermarks, fake headlines or brand marks. Do not invent official uniforms, official seals, exact documents or recognizable real people. Never imply that an AI-created scene is a documentary photograph of a specific real event.

The mood should be calm, credible and observational rather than dramatic, promotional or sensational. The result is an AI-generated illustrative editorial photograph.`.trim();
}
function decodeBase64(value: string) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function internalSecret(supabase: any, key: string) {
  const res = await supabase.from("internal_secrets").select("secret_value").eq("secret_key", key).maybeSingle();
  if (res.error) return "";
  return clean(res.data?.secret_value, 20000);
}
async function providerKey(supabase: any) {
  const env = clean(Deno.env.get("OPENAI_API_KEY") || "", 20000);
  if (env) return env;
  return await internalSecret(supabase, "openai_api_key");
}
async function authorize(req: Request, supabaseUrl: string, adminKey: string, supabase: any) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return {ok:false, status:401, error:"Unauthorized"};
  const bearer = auth.slice(7);
  if (bearer === adminKey) return {ok:true, kind:"internal"};

  const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
    headers: {apikey: adminKey, Authorization: auth},
  });
  if (!userRes.ok) return {ok:false, status:401, error:"Unauthorized"};
  const user = await userRes.json();
  const editorId = await internalSecret(supabase, "editor_user_id");
  if (!user?.id || !editorId || user.id !== editorId) return {ok:false, status:403, error:"Forbidden"};
  return {ok:true, kind:"editor", userId:user.id};
}
async function failGeneration(supabase: any, draftId: string, error: unknown) {
  const message = clean(error instanceof Error ? error.message : error, 900) || "Image generation failed";
  console.error("generate-editorial-image", draftId, message);
  await supabase.from("drafts").update({
    image_generation_status:"failed",
    image_error:message,
    updated_at:new Date().toISOString(),
  }).eq("id", draftId);
}
async function runGeneration(supabase: any, draft: any, prompt: string, mode: string) {
  try {
    const key = await providerKey(supabase);
    if (!key) throw new Error("OPENAI_API_KEY is not configured");

    const response = await fetch(OPENAI_IMAGE_URL, {
      method:"POST",
      headers:{
        "Authorization":"Bearer " + key,
        "Content-Type":"application/json",
      },
      body:JSON.stringify({
        model:OPENAI_IMAGE_MODEL,
        prompt,
        n:1,
        size:"1536x1024",
        quality:"medium",
        output_format:"webp",
        output_compression:85,
        background:"opaque",
        moderation:"auto",
      }),
    });
    const requestId = response.headers.get("x-request-id") || "";
    const raw = await response.text();
    let result: any = {};
    try { result = JSON.parse(raw); } catch {}
    if (!response.ok) {
      const code = clean(result?.error?.code || result?.error?.type || "", 120);
      const msg = clean(result?.error?.message || raw || ("HTTP " + response.status), 650);
      throw new Error((code ? code + ": " : "") + msg + (requestId ? " [request " + requestId + "]" : ""));
    }
    const b64 = clean(result?.data?.[0]?.b64_json || "", 12000000);
    if (!b64) throw new Error("Image API returned no image data");
    const bytes = decodeBase64(b64);
    if (!bytes.byteLength) throw new Error("Generated image is empty");
    if (bytes.byteLength > 6 * 1024 * 1024) throw new Error("Generated image exceeds the 6 MB storage limit");

    const now = new Date();
    const path = [
      "system","assets","ai",
      String(now.getUTCFullYear()),
      String(now.getUTCMonth()+1).padStart(2,"0"),
      String(draft.id) + "-" + crypto.randomUUID() + ".webp"
    ].join("/");

    const upload = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType:"image/webp",
      cacheControl:"31536000",
      upsert:false,
    });
    if (upload.error) throw upload.error;
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = clean(pub.data?.publicUrl || "", 2000);
    if (!publicUrl) throw new Error("Storage public URL was not created");

    const scene = sceneFor(draft);
    const update = await supabase.from("drafts").update({
      image_url:publicUrl,
      image_type:"ai",
      image_alt:scene.alt,
      image_source_url:"",
      image_credit:"Objektív24 · AI",
      image_license:"AI-generated editorial illustration",
      image_position:"50% 50%",
      image_reviewed:false,
      image_generation_status:"done",
      image_generation_mode:mode,
      image_prompt:prompt,
      image_generated_at:new Date().toISOString(),
      image_error:null,
      updated_at:new Date().toISOString(),
    }).eq("id", draft.id);
    if (update.error) throw update.error;
    console.log("AI image generated", draft.id, path);
  } catch (error) {
    await failGeneration(supabase, String(draft.id), error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, {status:204, headers:cors});

  const adminKey = secretKey();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  if (!adminKey || !supabaseUrl) return json({error:"Server configuration unavailable"},503);
  const supabase = createClient(supabaseUrl, adminKey, {
    auth:{persistSession:false, autoRefreshToken:false},
  });

  if (req.method === "GET") {
    return json({ok:true, provider:"openai", model:OPENAI_IMAGE_MODEL});
  }
  if (req.method !== "POST") return json({error:"Method not allowed"},405);

  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== ORIGIN) return json({error:"Origin not allowed"},403);

    const authz = await authorize(req, supabaseUrl, adminKey, supabase);
    if (!authz.ok) return json({error:authz.error}, authz.status);

    const input = await req.json().catch(() => ({}));
    const action = clean(input?.action || "generate", 80);

    if (action === "provider_status") {
      return json({ok:true, provider:"openai", model:OPENAI_IMAGE_MODEL, configured:Boolean(await providerKey(supabase))});
    }

    if (action === "configure_provider") {
      if (authz.kind !== "editor") return json({error:"Only the editor can configure the image provider"},403);
      const apiKey = clean(input?.api_key || "", 20000);
      if (apiKey.length < 24 || !apiKey.startsWith("sk-")) return json({error:"Neplatný formát OpenAI API kľúča"},400);

      const verify = await fetch("https://api.openai.com/v1/models", {
        headers:{"Authorization":"Bearer " + apiKey},
      });
      if (!verify.ok) {
        const raw = clean(await verify.text(), 700);
        return json({error:"OpenAI API kľúč sa nepodarilo overiť: " + raw},400);
      }

      const saved = await supabase.from("internal_secrets").upsert({
        secret_key:"openai_api_key",
        secret_value:apiKey,
        updated_at:new Date().toISOString(),
      }, {onConflict:"secret_key"});
      if (saved.error) throw saved.error;
      return json({ok:true, configured:true, provider:"openai", model:OPENAI_IMAGE_MODEL});
    }

    const draftId = clean(input?.draft_id || input?.draftId, 100);
    const mode = input?.mode === "manual" ? "manual" : "auto";
    const force = Boolean(input?.force);
    if (!draftId) return json({error:"draft_id is required"},400);

    const row = await supabase.from("drafts").select(
      "id,title,category,intro,what_happened,state,image_url,image_type,image_generation_status,image_generation_started_at,image_generation_attempts"
    ).eq("id",draftId).maybeSingle();
    if (row.error) throw row.error;
    if (!row.data) return json({error:"Article not found"},404);
    const draft: any = row.data;

    if (!force && !isFallback(draft.image_url)) {
      return json({ok:true, skipped:true, reason:"article already has a non-fallback image", image_url:draft.image_url});
    }
    if (force && !isFallback(draft.image_url) && !["ai",""].includes(clean(draft.image_type))) {
      return json({ok:true, skipped:true, reason:"protected real/official image will not be overwritten"});
    }
    if (isSensitiveTopic(draft)) {
      await supabase.from("drafts").update({
        image_generation_status:"blocked_sensitive",
        image_generation_mode:mode,
        image_error:"Automatic AI image generation is disabled for sensitive or event-specific topics",
        updated_at:new Date().toISOString(),
      }).eq("id",draftId);
      return json({ok:true, blocked:true, status:"blocked_sensitive"});
    }

    if (draft.image_generation_status === "running" && !force) {
      const started = Date.parse(String(draft.image_generation_started_at || ""));
      if (Number.isFinite(started) && Date.now() - started < 6 * 60 * 1000) {
        return json({ok:true, accepted:true, status:"running"});
      }
    }

    const key = await providerKey(supabase);
    if (!key) {
      await supabase.from("drafts").update({
        image_generation_status:"failed",
        image_generation_mode:mode,
        image_error:"OPENAI_API_KEY is not configured",
        updated_at:new Date().toISOString(),
      }).eq("id",draftId);
      return json({ok:false, error:"Image generator is not configured", code:"provider_not_configured"},503);
    }

    const prompt = buildPrompt(draft);
    const startedAt = new Date().toISOString();
    const attempt = Math.min(20, Number(draft.image_generation_attempts || 0) + 1);
    const mark = await supabase.from("drafts").update({
      image_generation_status:"running",
      image_generation_mode:mode,
      image_prompt:prompt,
      image_generation_started_at:startedAt,
      image_generation_attempts:attempt,
      image_error:null,
      updated_at:startedAt,
    }).eq("id",draftId);
    if (mark.error) throw mark.error;

    EdgeRuntime.waitUntil(runGeneration(supabase, draft, prompt, mode));
    return json({ok:true, accepted:true, status:"running", draft_id:draftId},202);
  } catch (error) {
    console.error(error);
    return json({error:error instanceof Error ? error.message : String(error)},500);
  }
});
