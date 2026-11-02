// Reading/caret positions contain no article text and are kept separately from backups.
export const VIEW_KEY = 'jujian-view-v1';
export function normalizePosition(raw={}) {
  const number=(value,max)=>Math.min(max,Math.max(0,Math.floor(Number(value)||0)));
  const field=/^(entry-(body|title)|reflection-(position|reason|assumption|counterexample|value|revision))$/.test(raw.field)?raw.field:'entry-body';
  const start=number(raw.start,2000000);
  return {field,start,end:Math.max(start,number(raw.end,2000000)),direction:['forward','backward','none'].includes(raw.direction)?raw.direction:'none',scroll:number(raw.scroll,10000000),innerScroll:number(raw.innerScroll,10000000),reflection:raw.reflection===true};
}
export function normalizeView(raw={}) {
  const positions=Object.fromEntries(Object.entries(raw.positions||{}).filter(([key])=>key.length<=200).slice(-100).map(([key,value])=>[key,normalizePosition(value||{})]));
  return {activeId:typeof raw.activeId==='string'?raw.activeId:null,positions,quickText:typeof raw.quickText==='string'?raw.quickText.slice(0,180):''};
}
