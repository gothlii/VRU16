import { validatePlan } from './model.js';
const apiKey = 'AIzaSyDPiUeOotJpW_NImkrW_aRLEdnzIpVoAOI';
const url = 'https://firestore.googleapis.com/v1/projects/vrisschema/databases/(default)/documents/vru16_travel/plan';
const storageKey = 'vru16-firebase-session';
let session = null, refreshPromise = null;
try { session = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { sessionStorage.removeItem(storageKey); }
function store(value) { session = value; if(value) sessionStorage.setItem(storageKey,JSON.stringify(value)); else sessionStorage.removeItem(storageKey); }
export function logout() { store(null); }
export function hasSession() { return !!session?.refreshToken; }
async function request(url,options) {
  let response;
  try { response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)}); }
  catch { throw new Error('Ingen kontakt med databasen. Kontrollera anslutningen och försök igen.'); }
  const data=await response.json();
  if(!response.ok) { const error=new Error(data.error?.message || 'Förfrågan misslyckades.');error.status=response.status;throw error; }
  return data;
}
export async function login(username,password) {
  if(username.trim()!=='team16') throw new Error('Fel användarnamn eller lösenord.');
  let data;
  try { data=await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'team16@vru16.internal',password:`VRU16:${password}`,returnSecureToken:true})}); }
  catch(error) { if(error.message.includes('TOO_MANY_ATTEMPTS')) throw new Error('För många inloggningsförsök. Försök igen senare.'); if(error.status) throw new Error('Fel användarnamn eller lösenord.'); throw error; }
  store({idToken:data.idToken,refreshToken:data.refreshToken,expiresAt:Date.now()+Number(data.expiresIn)*1000});
}
async function accessToken() {
  if(!session?.refreshToken) { const e=new Error('Logga in för att öppna reseplanen.'); e.status=401; throw e; }
  if(session.expiresAt>Date.now()+60000) return session.idToken;
  if(!refreshPromise) refreshPromise=(async()=>{
    try { const data=await request(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:session.refreshToken})});store({idToken:data.id_token,refreshToken:data.refresh_token,expiresAt:Date.now()+Number(data.expires_in)*1000});return session.idToken; }
    catch(error) { if(error.status){logout();error.status=401;error.message='Inloggningen har gått ut. Logga in igen.';} throw error; }
    finally { refreshPromise=null; }
  })();
  return refreshPromise;
}
async function headers() { return {'Content-Type':'application/json',Authorization:`Bearer ${await accessToken()}`}; }
export async function loadPlan() {
  const data=await request(url,{headers:await headers()});
  const plan=validatePlan(JSON.parse(data.fields.payload.stringValue));
  return {plan,version:data.updateTime};
}
export async function savePlan(plan,version) {
  validatePlan(plan);
  if(!version) throw new Error('Hämta reseplanen innan du sparar.');
  try {
    const data=await request(`${url}?currentDocument.updateTime=${encodeURIComponent(version)}`,{method:'PATCH',headers:await headers(),body:JSON.stringify({fields:{payload:{stringValue:JSON.stringify(plan)},schemaVersion:{integerValue:'2'}}})});
    return {plan,version:data.updateTime};
  } catch(error) {
    if(error.status===409 || error.status===412 || error.message.includes('FAILED_PRECONDITION')) error.message='Någon annan har ändrat reseplanen. Dina ändringar har inte sparats. Avbryt och välj ”Hämta senaste” innan du försöker igen.';
    else if(error.status===403) error.message='Kontot saknar rättighet att spara reseplanen.';
    throw error;
  }
}
