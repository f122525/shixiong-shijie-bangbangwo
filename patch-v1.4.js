(function(){
'use strict';

const VERSION='1.4.0';
const CELLBANK_KEY='labcalc_cellbank_v1';
const ROWS=['A','B','C','D','E','F','G','H','I'];
const COLS=[1,2,3,4,5,6,7,8,9];
let selectedCellSlot=null;

function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
function todayLocal(){const d=new Date(),o=d.getTimezoneOffset()*60000;return new Date(d-o).toISOString().slice(0,10)}
function getCellBank(){try{const x=JSON.parse(localStorage.getItem(CELLBANK_KEY)||'[]');return Array.isArray(x)?x:[]}catch(e){return[]}}
function setCellBank(x){localStorage.setItem(CELLBANK_KEY,JSON.stringify(x))}
function storageLabel(v){return v==='ln2'?'液氮':'-80°C'}

function injectStyles(){
  if(document.getElementById('v14-style'))return;
  const s=document.createElement('style');
  s.id='v14-style';
  s.textContent=`
  .v14-subtitle{margin:17px 0 8px;font-size:15px;font-weight:850;color:#0f172a}
  .cellbank-head{display:flex;gap:10px;align-items:end;justify-content:space-between;flex-wrap:wrap}
  .cellbank-head .storage-picker{min-width:170px}
  .cellbank-summary{font-size:12px;color:#64748b;margin-top:6px}
  .cellbox-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:12px;padding-bottom:4px}
  .cellbox-grid{display:grid;grid-template-columns:32px repeat(9,minmax(54px,1fr));gap:5px;min-width:590px;align-items:stretch}
  .cellbox-label{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:850;color:#64748b;min-height:28px}
  .cellbox-cell{min-height:58px;border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:5px 3px;color:#334155;text-align:center;font:inherit;cursor:pointer;overflow:hidden}
  .cellbox-cell .pos{display:block;font-size:10px;color:#64748b;font-weight:800;margin-bottom:4px}
  .cellbox-cell .name{display:block;font-size:11px;line-height:1.2;font-weight:800;word-break:break-all;max-height:27px;overflow:hidden}
  .cellbox-cell.occupied{background:#ecfdf5;border-color:#6ee7b7;color:#065f46}
  .cellbox-cell.selected{outline:3px solid rgba(37,99,235,.22);border-color:#2563eb}
  .cellbank-editor{margin-top:13px;border-top:1px dashed #cbd5e1;padding-top:13px}
  .cellbank-empty{color:#94a3b8;font-size:17px;line-height:1}
  @media(max-width:430px){.cellbox-grid{grid-template-columns:28px repeat(9,50px);min-width:510px}.cellbox-cell{min-height:54px}}
  `;
  document.head.appendChild(s);
}

function injectAliquot(){
  if(document.getElementById('aliquot_card'))return;
  const quick=document.getElementById('quick');
  if(!quick)return;
  const first=quick.querySelector('.card');
  const card=document.createElement('div');
  card.className='card';
  card.id='aliquot_card';
  card.innerHTML=`
    <h2>万能稀释 · 分装</h2>
    <div class="note">输入母液浓度、目标浓度、分装管数和每管体积；自动计算总体系、母液和稀释液。浓度单位可以不同。</div>
    <div class="grid3">
      <div><label>母液浓度</label><input id="ali_c1" type="number" step="any" value="0.4"></div>
      <div><label>母液单位</label><select id="ali_u1"><option>mg/mL</option><option>µg/mL</option><option>ng/mL</option></select></div>
      <div><label>目标浓度</label><input id="ali_c2" type="number" step="any" value="0.08"></div>
      <div><label>目标单位</label><select id="ali_u2"><option>mg/mL</option><option>µg/mL</option><option>ng/mL</option></select></div>
      <div><label>分装管数</label><input id="ali_n" type="number" step="1" min="1" value="5"></div>
      <div><label>每管最终体积</label><input id="ali_each" type="number" step="any" value="1.5"></div>
      <div><label>体积单位</label><select id="ali_vu"><option>mL</option><option>µL</option></select></div>
    </div>
    <div class="row"><button class="btn primary" type="button" onclick="calcAliquot()">计算分装</button><button class="btn" type="button" onclick="saveCalc('万能稀释·分装',document.getElementById('ali_out').innerText)">保存到历史</button></div>
    <div id="ali_out"></div>`;
  first.insertAdjacentElement('afterend',card);
}

window.calcAliquot=function(){
  const c1=toMgMl(+document.getElementById('ali_c1').value,document.getElementById('ali_u1').value);
  const c2=toMgMl(+document.getElementById('ali_c2').value,document.getElementById('ali_u2').value);
  const n=+document.getElementById('ali_n').value;
  const each=+document.getElementById('ali_each').value;
  const vu=document.getElementById('ali_vu').value;
  const out=document.getElementById('ali_out');
  if(!(c1>0&&c2>=0&&Number.isInteger(n)&&n>0&&each>0)){out.innerHTML='<div class="note bad">请检查输入。</div>';return}
  if(c2>c1){out.innerHTML='<div class="note bad">目标浓度高于母液浓度，不能通过稀释获得。</div>';return}
  const total=each*n;
  const stock=total*c2/c1;
  const diluent=total-stock;
  const perStock=stock/n;
  const perDiluent=diluent/n;
  out.innerHTML=`<div class="metrics">
    ${metric('最终总体积',fmt(total,4)+' '+vu)}
    ${metric('需要母液',fmt(stock,4)+' '+vu)}
    ${metric('加入稀释液',fmt(diluent,4)+' '+vu)}
    ${metric('每管母液',fmt(perStock,4)+' '+vu)}
    ${metric('每管稀释液',fmt(perDiluent,4)+' '+vu)}
    ${metric('每管最终体积',fmt(each,4)+' '+vu)}
  </div><div class="note good">共 ${n} 管：每管取 ${fmt(perStock,4)} ${vu} 母液 + ${fmt(perDiluent,4)} ${vu} 稀释液，得到 ${fmt(each,4)} ${vu}。</div>`;
};

function injectCellBank(){
  if(document.getElementById('cellbank_card'))return;
  const page=document.getElementById('inventory');
  if(!page)return;
  const card=document.createElement('div');
  card.className='card';
  card.id='cellbank_card';
  card.innerHTML=`
    <div class="cellbank-head">
      <div><h2 style="margin-bottom:4px">细胞库库存</h2><div class="hint">每个冻存盒为 9×9：行 A–I，列 1–9。点击格子录入或修改。</div></div>
      <div class="storage-picker"><label>保存区域</label><select id="cb_storage" onchange="renderCellBank()"><option value="ln2">液氮</option><option value="minus80">-80°C</option></select></div>
    </div>
    <div id="cb_summary" class="cellbank-summary"></div>
    <div id="cb_grid" class="cellbox-scroll"></div>
    <div id="cb_editor" class="cellbank-editor"><div class="note">请选择一个格子。</div></div>`;
  page.appendChild(card);
}

window.selectCellSlot=function(position){
  selectedCellSlot=position;
  renderCellBank();
  const e=document.getElementById('cb_name');if(e)e.focus();
};

window.renderCellBank=function(){
  const grid=document.getElementById('cb_grid'),editor=document.getElementById('cb_editor'),summary=document.getElementById('cb_summary');
  if(!grid||!editor)return;
  const storage=document.getElementById('cb_storage').value;
  const all=getCellBank();
  const records=all.filter(x=>x.storage===storage);
  const byPos=new Map(records.map(x=>[x.position,x]));
  let html='<div class="cellbox-grid"><div></div>'+COLS.map(c=>`<div class="cellbox-label">${c}</div>`).join('');
  ROWS.forEach(r=>{
    html+=`<div class="cellbox-label">${r}</div>`;
    COLS.forEach(c=>{
      const p=r+c,x=byPos.get(p),cls='cellbox-cell'+(x?' occupied':'')+(selectedCellSlot===p?' selected':'');
      html+=`<button type="button" class="${cls}" onclick="selectCellSlot('${p}')"><span class="pos">${p}</span>${x?`<span class="name">${esc(x.cellName)}</span>`:'<span class="cellbank-empty">＋</span>'}</button>`;
    });
  });
  html+='</div>';
  grid.innerHTML=html;
  summary.textContent=`${storageLabel(storage)}：已用 ${records.length}/81 格，空余 ${81-records.length} 格。`;
  if(!selectedCellSlot){editor.innerHTML='<div class="note">请选择一个格子。</div>';return}
  const current=byPos.get(selectedCellSlot);
  editor.innerHTML=`<div class="v14-subtitle">${storageLabel(storage)} · ${selectedCellSlot}</div>
    <div class="grid">
      <div><label>细胞名</label><input id="cb_name" value="${current?esc(current.cellName):''}" placeholder="例如 HCT116"></div>
      <div><label>冻存日期</label><input id="cb_date" type="date" value="${current?esc(current.freezeDate):todayLocal()}"></div>
    </div>
    <div class="row"><button class="btn primary" type="button" onclick="saveCellSlot()">${current?'保存修改':'保存到该格'}</button>${current?'<button class="btn danger" type="button" onclick="deleteCellSlot()">删除记录</button>':''}</div>`;
};

window.saveCellSlot=function(){
  if(!selectedCellSlot)return;
  const storage=document.getElementById('cb_storage').value;
  const cellName=document.getElementById('cb_name').value.trim();
  const freezeDate=document.getElementById('cb_date').value;
  if(!cellName||!freezeDate){alert('请填写细胞名和冻存日期。');return}
  const all=getCellBank();
  const i=all.findIndex(x=>x.storage===storage&&x.position===selectedCellSlot);
  const rec={id:i>=0?all[i].id:Date.now(),storage,position:selectedCellSlot,cellName,freezeDate,updatedAt:new Date().toISOString()};
  if(i>=0)all[i]=rec;else all.push(rec);
  setCellBank(all);renderCellBank();
};

window.deleteCellSlot=function(){
  if(!selectedCellSlot)return;
  const storage=document.getElementById('cb_storage').value;
  if(!confirm(`删除 ${storageLabel(storage)} ${selectedCellSlot} 的细胞记录？`))return;
  setCellBank(getCellBank().filter(x=>!(x.storage===storage&&x.position===selectedCellSlot)));
  renderCellBank();
};

function upgradeBackup(){
  window.exportData=function(){
    const d={version:2,appVersion:VERSION,exportedAt:new Date().toISOString(),inventory:getInv(),cellBank:getCellBank(),history:getHist()};
    const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download='LabCalc_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);
  };
  window.importData=function(e){
    const f=e.target.files[0];if(!f)return;const r=new FileReader();
    r.onload=()=>{try{const d=JSON.parse(r.result);if(Array.isArray(d.inventory))setInv(d.inventory);if(Array.isArray(d.cellBank))setCellBank(d.cellBank);if(Array.isArray(d.history))localStorage.setItem('labcalc_history',JSON.stringify(d.history));renderInventory();renderCellBank();alert('导入完成。')}catch(x){alert('文件格式错误。')}finally{e.target.value=''}};
    r.readAsText(f);
  };
}

function hookInventoryRender(){
  const old=window.renderInventory;
  if(typeof old==='function')window.renderInventory=function(){old();renderCellBank()};
}

function init(){
  injectStyles();injectAliquot();injectCellBank();upgradeBackup();hookInventoryRender();
  const v=document.querySelector('header h1 .small');if(v)v.textContent='v1.4';
  calcAliquot();renderCellBank();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
