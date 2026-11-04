// Appended by the localhost server only. Never shipped in dist/.
const previewBar=document.createElement('nav');
previewBar.setAttribute('aria-label','보스 미리보기');
previewBar.style.cssText='display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:12px;color:#bed4d8;font-size:12px';
const previewLabel=document.createElement('span');previewLabel.textContent='LOCAL QA · 보스 등장';previewBar.append(previewLabel);
function previewBoss(id){game.save=()=>{};game.start('warrior',id);game.stage=5;game.makeRoom();game.player.hp=game.player.maxHp=10000;syncMode();updateHUD();canvas.focus();}
for(const d of DUNGEONS){const b=document.createElement('button');b.textContent=d.bossName;b.style.cssText='background:#1c2b34;color:#dae6e6;border:1px solid #66858c;padding:6px 12px';b.onclick=()=>previewBoss(d.id);previewBar.append(b);}
document.querySelector('main').after(previewBar);

const relicPreview=document.createElement('button');relicPreview.textContent='유물 선택';relicPreview.style.cssText='background:#1c2b34;color:#dae6e6;border:1px solid #66858c;padding:6px 12px';relicPreview.onclick=()=>{game.save=()=>{};game.start('warrior','forest');game.introTime=0;game.choices=game.rollRelics();game.setMode('upgrade');syncMode();updateHUD();};previewBar.append(relicPreview);
