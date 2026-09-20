import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";

function secretKey(){
  try{
    const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
    return String(keys["default"]||"");
  }catch{return""}
}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const key=secretKey();
    const url=Deno.env.get("SUPABASE_URL")||"";
    if(!key||!url)return json({error:"Server configuration unavailable"},503);
    if((req.headers.get("authorization")||"")!=="Bearer "+key)return json({error:"Unauthorized"},401);

    const input=await req.json().catch(()=>({}));
    const draftId=String(input?.draft_id||"").trim();
    const title=String(input?.title||"Nový návrh").trim().slice(0,180);
    if(!draftId)return json({error:"draft_id required"},400);

    const publicKey=Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey=Deno.env.get("VAPID_PRIVATE_KEY");
    const subject=Deno.env.get("VAPID_SUBJECT")||"mailto:admin@objektiv24.sk";
    if(!publicKey||!privateKey)return json({error:"VAPID keys unavailable"},503);
    webpush.setVapidDetails(subject,publicKey,privateKey);

    const db=await fetch(url+"/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth&editor_alerts=eq.true",{
      headers:{apikey:key,Authorization:"Bearer "+key}
    });
    if(!db.ok)throw new Error("Subscription query failed: "+db.status+" "+await db.text());
    const subs=await db.json();

    const payload=JSON.stringify({
      title:"Nový návrh na úpravu",
      body:title,
      url:"https://objektiv24.sk/redakcia.html?draft="+encodeURIComponent(draftId),
      tag:"editor-draft-"+draftId
    });
    let sent=0,removed=0,failed=0;
    for(const s of subs||[]){
      try{
        await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload);
        sent++;
      }catch(e){
        const status=(e as any)?.statusCode;
        if(status===404||status===410){
          await fetch(url+"/rest/v1/push_subscriptions?id=eq."+encodeURIComponent(s.id),{
            method:"DELETE",headers:{apikey:key,Authorization:"Bearer "+key}
          });
          removed++;
        }else{
          console.error("Editor push failed",status,(e as any)?.message||e);
          failed++;
        }
      }
    }
    return json({ok:true,sent,removed,failed,subscribers:(subs||[]).length});
  }catch(error){
    console.error(error);
    return json({error:error instanceof Error?error.message:String(error)},500);
  }
});