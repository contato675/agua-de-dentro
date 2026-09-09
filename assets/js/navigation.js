/* Accessible mobile navigation; ordinary links remain available without scripts. */
const menu=document.querySelector('[data-navigation]');
const opener=document.querySelector('[data-menu-open]');
const fallback=document.querySelector('[data-mobile-fallback]');
if(menu?.showModal && opener && fallback) {
  const desktop=matchMedia('(min-width: 1024px)');
  const closer=menu.querySelector('[data-menu-close]');
  const visibleControls=()=>[...menu.querySelectorAll('a[href],button:not(:disabled)')].filter(el=>el.getClientRects().length>0);
  const restoreFocus=()=>{
    const target=desktop.matches?document.querySelector('.desktop-navigation a'):opener;
    target?.focus({preventScroll:true});
  };
  function close(restore=true) {
    if(!menu.open)return;
    menu.close();opener.setAttribute('aria-expanded','false');
    document.documentElement.classList.remove('navigation-open');
    if(restore)restoreFocus();
  }
  opener.hidden=false;fallback.hidden=true;
  opener.addEventListener('click',()=>{
    if(desktop.matches)return;
    menu.showModal();opener.setAttribute('aria-expanded','true');
    document.documentElement.classList.add('navigation-open');closer.focus();
  });
  closer.addEventListener('click',()=>close());
  menu.addEventListener('cancel',event=>{event.preventDefault();close();});
  menu.addEventListener('close',()=>{opener.setAttribute('aria-expanded','false');document.documentElement.classList.remove('navigation-open');});
  menu.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const items=visibleControls(),first=items[0],last=items.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===menu)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  const outside=event=>{const r=menu.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  let startedOutside=false;
  menu.addEventListener('pointerdown',event=>{startedOutside=event.target===menu&&outside(event);});
  menu.addEventListener('click',event=>{
    if(startedOutside&&event.target===menu&&outside(event)){close();startedOutside=false;return;}
    startedOutside=false;
    const link=event.target.closest('a[href]');
    if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
    const url=new URL(link.href);
    const samePage=url.origin===location.origin&&url.pathname===location.pathname&&!!url.hash;
    if(samePage)event.preventDefault();
    close(false);
    if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash){
      const section=document.getElementById(decodeURIComponent(url.hash.slice(1)));
      const target=section?.querySelector('h1,h2')||section;
      if(target){
        history.pushState(null,'',url.pathname+url.search+url.hash);
        section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
        target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
      }
    }
  });
  desktop.addEventListener('change',()=>{if(desktop.matches)close();});
  window.addEventListener('popstate',()=>close(false));
  window.addEventListener('pagehide',()=>close(false));
}
