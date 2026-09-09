const modal=document.querySelector('[data-video-modal]');
if(modal?.showModal){
  const frame=modal.querySelector('[data-video-frame]');
  const title=modal.querySelector('[data-video-modal-title]');
  const close=modal.querySelector('[data-video-close]');
  let trigger=null;
  const stop=()=>{frame.replaceChildren();};
  const shut=()=>{if(modal.open)modal.close();stop();trigger?.focus({preventScroll:true});};
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-video-id]');
    if(!button)return;
    trigger=button;
    const id=button.dataset.videoId, name=button.dataset.videoTitle||'';
    const iframe=document.createElement('iframe');
    iframe.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    iframe.title=name; iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen=true; iframe.referrerPolicy='strict-origin-when-cross-origin';
    frame.replaceChildren(iframe); title.textContent=name; modal.showModal(); close.focus();
  });
  close?.addEventListener('click',shut);
  modal.addEventListener('cancel',event=>{event.preventDefault();shut();});
  modal.addEventListener('click',event=>{if(event.target===modal)shut();});
  modal.addEventListener('close',stop);
}
