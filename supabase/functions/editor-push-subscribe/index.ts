import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGIN="https://objektiv24.sk";
const cors={
  "Access-Control-Allow-Origin":ORIGIN,
  "Access-Control-Allow-Headers":"authorization, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Max-Age":"86400",
  "Vary":"Origin"
};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
  status,
  headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});
function secretKey(){
  try{
    const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
    return String(keys["default"]||"");
  }catch{return""}
}
function validEndpoint(value:string){
  if(!value||value.length>2000)return false;
  try{return new URL(value).protocol==="https:"}catch{return false}
}
async function requireEditor(req:Request,key:string,url:string){
  const auth=req.headers.get("authorization")||"";
  if(!auth.startsWith("Bearer "))throw new Error("missing editor session");
  const token=auth.slice(7);
  const [userRes,configRes]=await Promise.all([
    fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:"Bearer "+token}}),
    fetch(url+"/rest/v1/internal_secrets?select=secret_value&secret_key=eq.editor_user_id",{
      headers:{apikey:key,Authorization:"Bearer "+key}
    })
  ]);
  if(!userRes.ok)throw new Error("invalid editor session");
  if(!configRes.ok)throw new Error("editor authorization unavailable");
  const user=await userRes.json();
  const rows=await configRes.json();
  const editorId=String(rows?.[0]?.secret_value||"");
  if(!user?.id||!editorId||user.id!==editorId)throw new Error("editor not authorized");
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const origin=req.headers.get("origin");
  if(origin&&origin!==ORIGIN)return json({error:"Origin not allowed"},403);

  try{
    const key=secretKey();
    const url=Deno.env.get("SUPABASE_URL")||"";
    if(!key||!url)return json({error:"Server configuration unavailable"},503);
    await requireEditor(req,key,url);

    const body=await req.json().catch(()=>null);
    if(!body||typeof body!=="object")return json({error:"Invalid JSON"},400);
    const action=String(body.action||"status");
    const endpoint=String(body.endpoint||"").trim();
    if(!validEndpoint(endpoint))return json({error:"Invalid endpoint"},400);

    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

    if(action==="status"){
      const {data,error}=await supabase.from("push_subscriptions")
        .select("editor_alerts").eq("endpoint",endpoint).maybeSingle();
      if(error)throw error;
      return json({ok:true,enabled:Boolean(data?.editor_alerts)});
    }

    if(action==="unsubscribe"){
      const {error}=await supabase.from("push_subscriptions")
        .update({editor_alerts:false,updated_at:new Date().toISOString()})
        .eq("endpoint",endpoint);
      if(error)throw error;
      return json({ok:true,enabled:false});
    }

    if(action!=="subscribe")return json({error:"Unsupported action"},400);

    const p256dh=String(body.p256dh||"").trim();
    const authKey=String(body.auth||"").trim();
    const userAgent=String(body.user_agent||"").slice(0,500);
    if(!p256dh||p256dh.length>500||!authKey||authKey.length>500){
      return json({error:"Missing subscription keys"},400);
    }

    const now=new Date().toISOString();
    const {error}=await supabase.from("push_subscriptions").upsert({
      endpoint,p256dh,auth:authKey,user_agent:userAgent||null,
      editor_alerts:true,updated_at:now
    },{onConflict:"endpoint"});
    if(error)throw error;
    return json({ok:true,enabled:true});
  }catch(error){
    console.error(error);
    const msg=error instanceof Error?error.message:String(error);
    const status=/not authorized|invalid editor|missing editor/i.test(msg)?401:500;
    return json({error:msg},status);
  }
});