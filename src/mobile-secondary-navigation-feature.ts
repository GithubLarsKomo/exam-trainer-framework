let observer:MutationObserver|undefined;
let scheduled=false;

function injectSettingsShortcut():void{
  if(document.querySelector('[data-mobile-settings-shortcut]'))return;
  const catalogSwitch=document.querySelector<HTMLElement>('.catalog-switch');
  if(!catalogSwitch)return;
  const button=document.createElement('button');
  button.type='button';
  button.dataset.mobileSettingsShortcut='';
  button.textContent='⚙ Einstellungen';
  button.setAttribute('aria-label','Einstellungen öffnen');
  button.addEventListener('click',()=>{
    document.querySelector<HTMLButtonElement>('.bottom-nav [data-view="settings"]')?.click();
  });
  catalogSwitch.insertAdjacentElement('afterend',button);
}

function schedule():void{
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;injectSettingsShortcut();});
}

export function installMobileSecondaryNavigationFeature():void{
  schedule();
  const root=document.querySelector('#app');
  if(root){observer?.disconnect();observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});}
}
