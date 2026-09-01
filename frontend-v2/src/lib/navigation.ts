export type RouteId='overview'|'tickets'|'templates'|'system'|'log'|'settings';
export type NavItem={id:RouteId;label:string;hash:string};

export const NAV_ITEMS:NavItem[]=[
  {id:'overview',label:'ОБЗОР',hash:'#/'},
  {id:'tickets',label:'ЗАЯВКИ',hash:'#/tickets'},
  {id:'templates',label:'ШАБЛОНЫ',hash:'#/templates'},
  {id:'system',label:'СИСТЕМА',hash:'#/system'},
  {id:'log',label:'ЖУРНАЛ',hash:'#/log'},
  {id:'settings',label:'НАСТРОЙКИ',hash:'#/settings'}
];

export function routeFromHash(hash:string):RouteId{
  const path=hash.replace(/^#\/?/,'').split('/')[0];
  return NAV_ITEMS.find(x=>x.id===path)?.id??'overview';
}
