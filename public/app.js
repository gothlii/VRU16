import {login,logout,hasSession,loadPlan,savePlan} from './firebase.js';
import {normalizedName,validatePlan,tripCounts,filterTrips,addChild,saturdayDate} from './model.js';
const $=id=>document.getElementById(id);
let plan=null,version=null,draft=null,editingChild=null,addToDraft=false,busy=false;
function element(tag,text,className) {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function showLogin(message='') {
  $('boot-status').hidden=true;$('login-view').hidden=false;$('planner-view').hidden=true;
  plan=null;version=null;draft=null;$('trips-body').replaceChildren();$('roster-list').replaceChildren();$('password').value='';$('login-error').textContent=message;document.title='VRU16 · Visby Roma';
  for(const id of ['trip-dialog','child-dialog']) if($(id).open) $(id).close();
}
async function showPlanner() {
  $('boot-status').hidden=true;$('login-view').hidden=true;$('planner-view').hidden=false;$('search').value='';document.title='Reseplaneraren · VRU16';await refresh();
}
function handleError(error,target) { if(error.status===401) {logout();showLogin('Inloggningen har gått ut. Logga in igen.');} else $(target).textContent=error.message; }
async function refresh() {
  $('load-status').hidden=false;$('load-status').textContent='Hämtar reseplanen…';$('retry').hidden=true;$('trips-table').hidden=true;$('empty').hidden=true;$('new-child').disabled=true;$('save-status').textContent='';
  try {const result=await loadPlan();if(!hasSession())return;plan=result.plan;version=result.version;$('load-status').hidden=true;$('new-child').disabled=false;render();}
  catch(error) {handleError(error,'load-status');$('retry').hidden=false;}
}
function render() {
  if(!plan)return;
  const filtered=filterTrips(plan,$('search').value),names=new Map(plan.children.map(c=>[c.id,c.name]));
  $('trips-body').replaceChildren();$('trip-count').textContent=String(plan.trips.length).padStart(2,'0');
  for(const trip of filtered) {
    const row=element('tr'),week=element('th');week.scope='row';week.append(element('span',String(trip.week),'week-badge'));
    const leaders=element('td',trip.leaders,'leaders'),children=element('td',undefined,'children');
    trip.assignments.forEach((a,i)=>{if(i)children.append(', ');const text=names.get(a.childId)+(a.goalkeeper?' (målvakt)':'')+(a.uncertain?'?':'');children.append(element(a.goalkeeper?'strong':'span',text));});
    const count=element('td');count.append(element('span',trip.assignments.length,'count'));if(trip.note)count.append(element('small',trip.note));
    const actions=element('td'),edit=element('button','Ändra','edit-button');edit.setAttribute('aria-label',`Ändra resa vecka ${trip.week}`);edit.addEventListener('click',()=>openTrip(trip.id));actions.append(edit);
    const date=element('td',saturdayDate(trip.year,trip.week),'date-cell');row.append(week,date,leaders,children,count,actions);$('trips-body').append(row);
  }
  $('trips-table').hidden=filtered.length===0;$('empty').hidden=filtered.length!==0;$('showing').textContent=`Visar ${filtered.length} av ${plan.trips.length} resor`;
  renderRoster();
}
function renderRoster() {
  const counts=tripCounts(plan);$('roster-count').textContent=plan.children.length;$('roster-list').replaceChildren();
  for(const child of [...plan.children].sort((a,b)=>a.name.localeCompare(b.name,'sv'))) {
    const item=element('li'),name=element('span',child.name,'roster-name'),count=counts.get(child.id)||0;
    name.tabIndex=0;name.title=`${child.name} är schemalagd på ${count} ${count===1?'resa':'resor'}.`;name.setAttribute('aria-label',name.title);name.dataset.tooltip=`${count} schemalagda ${count===1?'resa':'resor'}`;
    const badge=element('span',count,'roster-badge');badge.setAttribute('aria-hidden','true');
    const edit=element('button','✎','rename-child');edit.title=`Ändra namn på ${child.name}`;edit.setAttribute('aria-label',edit.title);edit.addEventListener('click',()=>openChild(child.id));item.append(name,badge,edit);$('roster-list').append(item);
  }
}
function openTrip(id) {
  draft=structuredClone(plan.trips.find(t=>t.id===id));$('edit-title').textContent=`Ändra resa · vecka ${draft.week}`;$('edit-week').value=draft.week;$('edit-year').value=draft.year;updateDatePreview();$('edit-leaders').value=draft.leaders;$('edit-note').value=draft.note;$('trip-error').textContent='';renderDraft();$('trip-dialog').showModal();
}
function renderDraft() {
  $('edit-assignments').replaceChildren();
  let list=$('child-options');if(!list){list=element('datalist');list.id='child-options';$('trip-form').append(list);}list.replaceChildren();
  const children=[...plan.children].sort((a,b)=>a.name.localeCompare(b.name,'sv'));
  for(const child of children){const option=element('option');option.value=child.name;list.append(option);}
  for(const [index,a] of draft.assignments.entries()) {
    const row=element('div',undefined,'assignment-row');
    const field=element('input');field.value=a.typedName??plan.children.find(c=>c.id===a.childId)?.name??'';field.setAttribute('list','child-options');field.setAttribute('aria-label',`Barn ${index+1}`);field.autocomplete='off';field.required=true;field.maxLength=100;
    field.addEventListener('input',()=>{a.typedName=field.value;});
    const goalkeeper=element('label',undefined,'checkbox-label'),g=element('input');g.type='checkbox';g.checked=a.goalkeeper;g.addEventListener('change',()=>{a.goalkeeper=g.checked;});goalkeeper.append(g,' Målvakt');
    const uncertain=element('label',undefined,'checkbox-label'),u=element('input');u.type='checkbox';u.checked=a.uncertain;u.addEventListener('change',()=>{a.uncertain=u.checked;});uncertain.append(u,' Osäker');
    const remove=element('button','×','remove-player');remove.type='button';remove.setAttribute('aria-label',`Ta bort ${field.value} från resan`);remove.addEventListener('click',()=>{draft.assignments.splice(index,1);renderDraft();});row.append(field,goalkeeper,uncertain,remove);$('edit-assignments').append(row);
  }
  $('add-player').replaceChildren();const available=children.filter(c=>!draft.assignments.some(a=>a.childId===c.id));
  for(const child of available){const option=element('option',child.name);option.value=child.id;$('add-player').append(option);}
  $('add-player').disabled=available.length===0;$('add-to-trip').disabled=available.length===0;
}
function updateDatePreview() {
  try {$('edit-date').value=saturdayDate(Number($('edit-year').value),Number($('edit-week').value));}
  catch {$('edit-date').value='Ogiltig vecka eller år';}
}
$('edit-week').addEventListener('input',updateDatePreview);$('edit-year').addEventListener('input',updateDatePreview);
async function persist(next) {
  validatePlan(next);const result=await savePlan(next,version);if(!hasSession())return;plan=result.plan;version=result.version;render();$('save-status').textContent='Ändringarna är sparade.';
}
function setBusy(value){busy=value;for(const id of ['save-trip','save-child','cancel-trip','close-trip','cancel-child','close-child']) $(id).disabled=value;}
function openChild(id=null,fromDraft=false) {
  editingChild=id;addToDraft=fromDraft;$('child-title').textContent=id?'Ändra barnets namn':'Lägg till barn';$('child-name').value=id?plan.children.find(c=>c.id===id).name:'';$('child-help').textContent=id?'Namnändringen gäller alla resor där barnet finns med.':'Barnet läggs till i spelarlistan och kan sedan väljas till en resa.';$('child-error').textContent='';$('child-dialog').showModal();
}
$('login-form').addEventListener('submit',async event=>{event.preventDefault();$('login-error').textContent='';$('login-button').disabled=true;try{await login($('username').value,$('password').value);$('password').value='';await showPlanner();}catch(error){$('login-error').textContent=error.message;}finally{$('login-button').disabled=false;}});
$('toggle-password').addEventListener('click',()=>{const visible=$('password').type==='password';$('password').type=visible?'text':'password';$('toggle-password').textContent=visible?'Dölj':'Visa';$('toggle-password').setAttribute('aria-label',visible?'Dölj lösenord':'Visa lösenord');$('toggle-password').setAttribute('aria-pressed',String(visible));});
$('logout').addEventListener('click',()=>{logout();showLogin();});$('search').addEventListener('input',render);$('retry').addEventListener('click',refresh);$('reload-plan').addEventListener('click',refresh);
$('add-to-trip').addEventListener('click',()=>{const id=$('add-player').value;if(!id)return;draft.assignments.push({childId:id,goalkeeper:false,uncertain:false});renderDraft();});
for(const id of ['cancel-trip','close-trip'])$(id).addEventListener('click',()=>{if(!busy){$('trip-dialog').close();draft=null;}});
for(const id of ['cancel-child','close-child'])$(id).addEventListener('click',()=>{if(!busy)$('child-dialog').close();});
for(const id of ['trip-dialog','child-dialog'])$(id).addEventListener('cancel',event=>{if(busy)event.preventDefault();});
$('new-child').addEventListener('click',()=>openChild());$('new-child-in-trip').addEventListener('click',()=>openChild(null,true));
$('trip-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;$('trip-error').textContent='';setBusy(true);
  try {
    const assignments=draft.assignments.map(a=>{const child=a.typedName===undefined?plan.children.find(c=>c.id===a.childId):plan.children.find(c=>normalizedName(c.name)===normalizedName(a.typedName));if(!child)throw new Error('Välj ett barn från spelarlistan, eller lägg först till barnet via ”Lägg till ett nytt barn”.');return {childId:child.id,goalkeeper:a.goalkeeper,uncertain:a.uncertain};});
    const next=structuredClone(plan),index=next.trips.findIndex(t=>t.id===draft.id);next.trips[index]={...draft,week:Number($('edit-week').value),year:Number($('edit-year').value),leaders:$('edit-leaders').value.trim(),note:$('edit-note').value.trim(),assignments};await persist(next);$('trip-dialog').close();draft=null;
  }catch(error){handleError(error,'trip-error');}finally{setBusy(false);}
});
$('child-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;$('child-error').textContent='';setBusy(true);
  try {
    const next=structuredClone(plan);let child;
    if(editingChild){const name=$('child-name').value.trim().replace(/\s+/g,' ');if(next.children.some(c=>c.id!==editingChild&&normalizedName(c.name)===normalizedName(name)))throw new Error('Namnet finns redan i spelarlistan.');child=next.children.find(c=>c.id===editingChild);child.name=name;}
    else child=addChild(next,$('child-name').value);
    await persist(next);if(addToDraft&&draft){draft.assignments.push({childId:child.id,goalkeeper:false,uncertain:false});renderDraft();}$('child-dialog').close();
  }catch(error){handleError(error,'child-error');}finally{setBusy(false);}
});
if(hasSession())await showPlanner();else showLogin();
