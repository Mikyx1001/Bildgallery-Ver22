/* client.js */

// ----------------------------------------------------
// Globale Variablen
// ----------------------------------------------------
let images = [];
let prompts = {};

let promptToGroupMap = {};
let groupToPromptMap = {};

let promptGroupCoords = [];
let currentPromptGroupIndex = 0;
let isSinglePromptGroupMode = false;

let currentGalleryImages = [];
let currentImageIndex = 0;

let isSlideshowRunning = false;
let slideshowOrder = [];
let slideshowInterval = null;
let slideshowTimeIndex = 3;

let scale = 1;
let offsetY = 0;

let isFavMode = false;
let isIndGroupMode = false;
let isPromptGroupsMergeMode = false;
let markedGroups = [];

// Neu
let isNewMarkMode = false;

// Matrix
let xLetter='A', xActive=false;
let yLetter='A', yActive=false;
let zLetter='A', zActive=false;

// ----------------------------------------------------
// DOM-Elemente
// ----------------------------------------------------
const gallery = document.getElementById('gallery');
const popup   = document.getElementById('popup');
const popupImage = document.getElementById('popupImage');
const popupPrompt = document.getElementById('popupPrompt');
const copyPromptButton = document.getElementById('copyPromptButton');
const popupModelSelect = document.getElementById('popupModelSelect');
const popupNewModelInput = document.getElementById('popupNewModelInput');
const popupDate = document.getElementById('popupDate');

const prevArrow = document.getElementById('prevArrow');
const nextArrow = document.getElementById('nextArrow');
const playStopBtn = document.getElementById('playStopBtn');

const promptGroupNavLeft  = document.getElementById('promptGroupNavLeft');
const promptGroupNavRight = document.getElementById('promptGroupNavRight');

const showNewBtn   = document.getElementById('showNewBtn');
const newAssignmentRow = document.getElementById('newAssignmentRow');
const newPromptInput = document.getElementById('newPromptInput');
const newModelSelect = document.getElementById('newModelSelect');
const newModelInput  = document.getElementById('newModelInput');
const newMatrixInput = document.getElementById('newMatrixInput');
const newOkBtn       = document.getElementById('newOkBtn');

const sortPromptBtn  = document.getElementById('sortPromptBtn');
const sortModelBtn   = document.getElementById('sortModelBtn');
const sortMonthBtn   = document.getElementById('sortMonthBtn');
const sortRandomBtn  = document.getElementById('sortRandomBtn');

const columnCountBtn  = document.getElementById('columnCountBtn');
const slideshowTimeBtn= document.getElementById('slideshowTimeBtn');
const slideshowCurrentBtn= document.getElementById('slideshowCurrentBtn');
const slideshowGalleryBtn= document.getElementById('slideshowGalleryBtn');
const slideshowFavesBtn  = document.getElementById('slideshowFavesBtn');

const promptGroupsBtn      = document.getElementById('promptGroupsBtn');
const promptGroupsMergeBtn = document.getElementById('promptGroupsMergeBtn');

const favShowBtn = document.getElementById('favShowBtn');
const favEditBtn = document.getElementById('favEditBtn');

const matrixBtnX = document.getElementById('matrixBtnX');
const matrixBtnY = document.getElementById('matrixBtnY');
const matrixBtnZ = document.getElementById('matrixBtnZ');
const ingEditBtn = document.getElementById('ingEditBtn');

// Neu: Upload
const uploadButton = document.getElementById('uploadButton');
const imageUpload  = document.getElementById('imageUpload');

// Popup-Schließen bei Klick auf Hintergrund
popup.addEventListener('click',(e)=>{
  if(e.target===popup){
    closePopup();
  }
});
function closePopup(){
  if(isSlideshowRunning) stopSlideshow();
  popup.classList.remove('visible');
}

// Farb-Config
const openColorConfigBtn = document.getElementById('openColorConfigBtn');
const colorConfigOverlay = document.getElementById('colorConfigOverlay');
const colorPreviewBtn = document.getElementById('colorPreviewBtn');
const colorOkBtn = document.getElementById('colorOkBtn');
const colorCancelBtn = document.getElementById('colorCancelBtn');
const colorInputs = [
  { varName: '--main-bg',         textId: 'cc_main_bg',         colorId: 'cc_main_bg_color' },
  { varName: '--menu-bg',         textId: 'cc_menu_bg',         colorId: 'cc_menu_bg_color' },
  { varName: '--menu-btn-bg',     textId: 'cc_menu_btn_bg',     colorId: 'cc_menu_btn_bg_color' },
  { varName: '--menu-btn-text',   textId: 'cc_menu_btn_text',   colorId: 'cc_menu_btn_text_color' },
  { varName: '--popup-bg',        textId: 'cc_popup_bg',        colorId: 'cc_popup_bg_color' },
  { varName: '--text-field-bg',   textId: 'cc_field_bg',        colorId: 'cc_field_bg_color' },
  { varName: '--text-field-text', textId: 'cc_field_text',      colorId: 'cc_field_text_color' },
  { varName: '--arrow-btn-bg',    textId: 'cc_arrow_bg',        colorId: 'cc_arrow_bg_color' },
  { varName: '--arrow-btn-text',  textId: 'cc_arrow_text',       colorId: 'cc_arrow_text_color' },
  { varName: '--slideshow-gallery-bg',  textId: 'cc_slideshow_gallery_bg',  colorId: 'cc_slideshow_gallery_bg_color' },
  { varName: '--slideshow-gallery-text',textId: 'cc_slideshow_gallery_text',colorId: 'cc_slideshow_gallery_text_color' },
];
let originalColors = {};

// ----------------------------------------------------
// DOMContentLoaded
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', async ()=>{

  await loadColors();
  await loadImages();
  await loadPrompts();
  await loadModels();
  initColorConfig();
  initModelInput();     
  initColumnCountButton();
  initColumnCountWheel();
  initSlideshowTimeWheel();
  initMatrixButtons();

  // Upload
  uploadButton.addEventListener('click', ()=>{
    // Klick auf Button öffnet Datei-Dialog
    imageUpload.click();
  });
  imageUpload.addEventListener('change', handleFileUpload);

  // Neu
  showNewBtn.addEventListener('click', async () => {
    exitAllModes();
    await showNewImages();
  });
  newOkBtn.addEventListener('click', handleNewOkClick);

  // Slideshow
  slideshowCurrentBtn.addEventListener('click', ()=>{
    if(!currentGalleryImages.length) return;
    startSlideshow(currentGalleryImages,0);
  });
  slideshowGalleryBtn.addEventListener('click', ()=>{
    if(!images.length) return;
    const arr=[...images].sort(()=>0.5 - Math.random());
    startSlideshow(arr,0);
  });
  slideshowFavesBtn.addEventListener('click',()=>{
    const fav=images.filter(f=>prompts[f]?.isFavorite);
    if(!fav.length) return;
    const arr=fav.sort(()=>0.5 - Math.random());
    startSlideshow(arr,0);
  });

  // Sort/Filter
  sortPromptBtn.addEventListener('click', ()=>{
    exitAllModes();
    const st=window.prompt("Bitte Prompt-Suchbegriff eingeben:");
    if(!st) return;
    const filtered=currentGalleryImages.filter(fname=>{
      const pr=prompts[fname]?.prompt||'';
      return pr.toLowerCase().includes(st.toLowerCase());
    });
    renderGallery(filtered);
  });
  sortModelBtn.addEventListener('click',()=>{
    exitAllModes();
    currentGalleryImages.sort((a,b)=>{
      const ma=(prompts[a]?.model||'').toLowerCase();
      const mb=(prompts[b]?.model||'').toLowerCase();
      return ma.localeCompare(mb);
    });
    renderGallery(currentGalleryImages);
  });
  sortMonthBtn.addEventListener('click',()=>{
    exitAllModes();
    currentGalleryImages.sort((a,b)=>{
      const ma=(prompts[a]?.monthYear||'');
      const mb=(prompts[b]?.monthYear||'');
      return ma.localeCompare(mb);
    });
    renderGallery(currentGalleryImages);
  });
  sortRandomBtn.addEventListener('click',()=>{
    exitAllModes();
    currentGalleryImages.sort(()=>0.5 - Math.random());
    renderGallery(currentGalleryImages);
  });

  // Prompt Gruppen
  promptGroupsBtn.addEventListener('click',()=>{
    exitAllModes();
    showPromptGroupsOverview();
  });
  promptGroupsMergeBtn.addEventListener('click', async ()=>{
    if(!isPromptGroupsMergeMode){
      if(isSinglePromptGroupMode){
        // -> SingleGroup: Bilder entfernen
        isPromptGroupsMergeMode=true;
        promptGroupsMergeBtn.textContent='Fertig';
        disableAllButtonsExcept(promptGroupsMergeBtn);
        showSingleGroupMarkingMode(promptGroupCoords[currentPromptGroupIndex]);
      } else {
        // -> Merge mehrere Gruppen
        isPromptGroupsMergeMode=true;
        promptGroupsMergeBtn.textContent='Fertig';
        disableAllButtonsExcept(promptGroupsMergeBtn);
        showGroupMarkingMode();
      }
    } else {
      // "Fertig"
      if(isSinglePromptGroupMode){
        await finishSingleGroupEdit(promptGroupCoords[currentPromptGroupIndex]);
      } else {
        await mergeSelectedGroups();
      }
      isPromptGroupsMergeMode=false;
      promptGroupsMergeBtn.textContent='Prompt Gruppen+';
      enableAllButtons();
      if(isSinglePromptGroupMode){
        showPromptGroupAtIndex(currentPromptGroupIndex);
      } else {
        showPromptGroupsOverview();
      }
    }
  });

  // Favoriten
  favEditBtn.addEventListener('click',()=>{
    if(!isFavMode){
      isFavMode=true;
      favEditBtn.textContent='★+ bearbeiten';
      disableAllButtonsExcept(favEditBtn);
      renderGallery(); // Markiermodus
    } else {
      // Speichern
      const all=document.querySelectorAll('.image-item');
      all.forEach(div=>{
        const fname=decodeURIComponent(div.querySelector('img').src.split('/images/')[1]);
        if(!prompts[fname]) prompts[fname]={};
        prompts[fname].isFavorite = div.classList.contains('marked');
        if(prompts[fname].isFavorite){
          prompts[fname].promptGroupId='';
        }
        savePromptData(fname);
      });
      isFavMode=false;
      favEditBtn.textContent='★+';
      enableAllButtons();
      showFavorites();
    }
  });
  favShowBtn.addEventListener('click',()=>showFavorites());

  // IndGruppe
  ingEditBtn.addEventListener('click',()=>{
    if(!isIndGroupMode){
      isIndGroupMode=true;
      ingEditBtn.textContent='InG bearbeiten';
      disableAllButtonsExcept(ingEditBtn);
      renderGallery();
    } else {
      const gId=getCurrentMatrixGroupId();
      const all=document.querySelectorAll('.image-item');
      all.forEach(div=>{
        const fname=decodeURIComponent(div.querySelector('img').src.split('/images/')[1]);
        if(!prompts[fname]) prompts[fname]={};
        if(!Array.isArray(prompts[fname].indGroups)) prompts[fname].indGroups=[];
        if(div.classList.contains('marked')){
          if(!prompts[fname].indGroups.includes(gId)){
            prompts[fname].indGroups.push(gId);
          }
        } else {
          prompts[fname].indGroups=prompts[fname].indGroups.filter(x=>x!==gId);
        }
        prompts[fname].promptGroupId='';
        savePromptData(fname);
      });
      isIndGroupMode=false;
      ingEditBtn.textContent='InG +';
      enableAllButtons();
      showIndGroup();
    }
  });

  // Gruppen-Pfeile
  promptGroupNavLeft.addEventListener('click',()=>navPromptGroup(-1));
  promptGroupNavRight.addEventListener('click',()=>navPromptGroup(1));

  // Popup stuff
  popupPrompt.addEventListener('blur', saveAllText);
  popupModelSelect.addEventListener('change', saveAllText);
  copyPromptButton.addEventListener('click',()=>{
    const txt=popupPrompt.textContent.trim();
    if(txt && txt!=='Kein Prompt'){
      navigator.clipboard.writeText(txt).catch(e=>console.error(e));
    }
  });
  prevArrow.addEventListener('click',()=>navImage(-1));
  nextArrow.addEventListener('click',()=>navImage(1));
  popupImage.addEventListener('wheel', evt=>{
    evt.preventDefault();
    const zoomSpeed=0.05;
    const delta=-Math.sign(evt.deltaY)*zoomSpeed;
    scale+=delta;
    if(scale<0.1) scale=0.1;
    if(scale>5)   scale=5;
    applyTransform();
  }, {passive:false});
  popupImage.addEventListener('click',()=>{
    // Klick aufs Bild -> Vollbild toggeln
    if(!document.fullscreenElement) popup.requestFullscreen().catch(()=>{});
    else document.exitFullscreen().catch(()=>{});
  });
  document.addEventListener('keydown',evt=>{
    if(!popup.classList.contains('visible')) return;
    if(evt.key==='Escape'){
      if(isSlideshowRunning) stopSlideshow();
      popup.classList.remove('visible');
      document.exitFullscreen().catch(()=>{});
    } else if(evt.key==='ArrowLeft'){
      navImage(-1);
    } else if(evt.key==='ArrowRight'){
      navImage(1);
    } else if(evt.key==='ArrowUp'){
      offsetY+=30; applyTransform();
    } else if(evt.key==='ArrowDown'){
      offsetY-=30; applyTransform();
    }
  });
  playStopBtn.addEventListener('click',()=>{
    if(!isSlideshowRunning) startSlideshow(currentGalleryImages, currentImageIndex);
    else stopSlideshow();
  });

  // Beispiel: Starte mit Favoriten
  showFavorites();
});

// ----------------------------------------------------
// Upload-Funktion
// ----------------------------------------------------
async function handleFileUpload(){
  if(!imageUpload.files.length) return;
  const formData=new FormData();
  for(const file of imageUpload.files){
    formData.append('images', file);
  }
  try {
    const r=await fetch('/api/images', {
      method:'POST',
      body: formData
    });
    if(!r.ok) throw new Error('Fehler beim Hochladen');
    const json=await r.json();
    console.log('Uploaded:', json.uploaded);
    // Danach neu laden
    await loadImages();
    await loadPrompts();
    renderGallery(images);
  } catch(e){
    console.error(e);
  }
  imageUpload.value=''; // Reset File-Input
}

// ----------------------------------------------------
// initModelInput()
// ----------------------------------------------------
function initModelInput(){
  popupNewModelInput.addEventListener('keydown', async (evt)=>{
    if(evt.key==='Enter'){
      const val=popupNewModelInput.value.trim();
      if(!val) return;
      await addNewModel(val);
      popupNewModelInput.value='';
    }
  });
  newModelInput.addEventListener('keydown', async (evt)=>{
    if(evt.key==='Enter'){
      const val=newModelInput.value.trim();
      if(!val) return;
      await addNewModel(val);
      newModelInput.value='';
    }
  });
}
async function addNewModel(modelName){
  try{
    const r=await fetch('/api/models',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({model: modelName})
    });
    if(!r.ok) throw new Error('Fehler beim Hinzufügen des Modells');
  } catch(e){
    console.error(e);
  }
}

// ----------------------------------------------------
// initColumnCountButton & initColumnCountWheel
// ----------------------------------------------------
function initColumnCountButton(){
  let val=Number(columnCountBtn.textContent);
  if(!val || isNaN(val)) val=6;
  gallery.style.columnCount=val;

  // Klick
  columnCountBtn.addEventListener('click',()=>{
    val++;
    if(val>15) val=1;
    columnCountBtn.textContent=String(val);
    gallery.style.columnCount=val;
  });
  // Rechtsklick
  columnCountBtn.addEventListener('contextmenu',(e)=>{
    e.preventDefault();
    val--;
    if(val<1) val=15;
    columnCountBtn.textContent=String(val);
    gallery.style.columnCount=val;
  });
}
function initColumnCountWheel(){
  columnCountBtn.addEventListener('wheel',(e)=>{
    e.preventDefault();
    if(e.deltaY<0) incrementColumnCount();
    else decrementColumnCount();
  });
}
function incrementColumnCount(){
  let val=Number(columnCountBtn.textContent);
  val++;
  if(val>15) val=1;
  columnCountBtn.textContent=String(val);
  gallery.style.columnCount=val;
}
function decrementColumnCount(){
  let val=Number(columnCountBtn.textContent);
  val--;
  if(val<1) val=15;
  columnCountBtn.textContent=String(val);
  gallery.style.columnCount=val;
}

// ----------------------------------------------------
// Slideshow-Zeit (Wheel etc.)
// ----------------------------------------------------
function initSlideshowTimeWheel(){
  slideshowTimeBtn.addEventListener('wheel',(e)=>{
    e.preventDefault();
    if(e.deltaY<0) incrementSlideshowTime();
    else decrementSlideshowTime();
  });
}
function incrementSlideshowTime(){
  slideshowTimeIndex++;
  if(slideshowTimeIndex>9) slideshowTimeIndex=1;
  slideshowTimeBtn.textContent=String(slideshowTimeIndex);
}
function decrementSlideshowTime(){
  slideshowTimeIndex--;
  if(slideshowTimeIndex<1) slideshowTimeIndex=9;
  slideshowTimeBtn.textContent=String(slideshowTimeIndex);
}
slideshowTimeBtn.addEventListener('click',()=>{
  slideshowTimeIndex++;
  if(slideshowTimeIndex>9) slideshowTimeIndex=1;
  slideshowTimeBtn.textContent=String(slideshowTimeIndex);
});

// ----------------------------------------------------
// NEU (Markiermodus)
// ----------------------------------------------------
async function showNewImages(){
  await loadImages();
  await loadPrompts();
  for(const fname of images){
    const p=prompts[fname];
    if(!p) continue;
    if(p.prompt && !p.promptGroupId){
      const grp=getOrCreateGroupForPrompt(p.prompt);
      p.promptGroupId=grp;
      await savePromptData(fname);
    }
  }
  const arr=images.filter(f=>!prompts[f]||!prompts[f].prompt);
  newAssignmentRow.style.display='flex';
  renderGalleryMarkMode(arr);
  isNewMarkMode=true;
}
async function handleNewOkClick(){
  const massPrompt=newPromptInput.value.trim();
  let massModel=newModelSelect.value;
  const newMdl=newModelInput.value.trim();
  if(newMdl){
    await addNewModel(newMdl);
    massModel=newMdl;
  }

  const all=document.querySelectorAll('.image-item');
  for(const div of all){
    const fname=decodeURIComponent(div.querySelector('img').src.split('/images/')[1]);
    if(div.classList.contains('marked')){
      if(!prompts[fname]) prompts[fname]={};
      prompts[fname].prompt=massPrompt;
      prompts[fname].model=massModel;
      if(massPrompt){
        const grp=getOrCreateGroupForPrompt(massPrompt);
        prompts[fname].promptGroupId=grp;
      }
      await savePromptData(fname);
    }
  }
  newPromptInput.value='';
  newModelInput.value='';
  newMatrixInput.value='';
  isNewMarkMode=false;

  const arr=images.filter(f=>!prompts[f]||!prompts[f].prompt);
  renderGalleryMarkMode(arr);
  if(!arr.length){
    newAssignmentRow.style.display='none';
  }
}

// ----------------------------------------------------
// Galerie / Render
// ----------------------------------------------------
function renderGallery(arr=null){
  if(!arr) arr=images;
  currentGalleryImages=arr;
  gallery.innerHTML='';
  arr.forEach(fname=>{
    const d=document.createElement('div');
    d.classList.add('image-item');
    const p=prompts[fname]||{};

    let matrixIndex='';
    if(p.promptGroupId && p.promptGroupId.startsWith('ID')){
      matrixIndex=p.promptGroupId.substring(2);
    }
    const imgEl=document.createElement('img');
    imgEl.src='/images/'+encodeURIComponent(fname);
    imgEl.alt=fname;
    imgEl.title=matrixIndex;

    if(isFavMode && p.isFavorite) d.classList.add('marked');
    if(isIndGroupMode){
      const gId=getCurrentMatrixGroupId();
      if(p.indGroups?.includes(gId)) d.classList.add('marked');
    }

    d.addEventListener('click',()=>{
      if(isFavMode || isIndGroupMode || isPromptGroupsMergeMode){
        d.classList.toggle('marked');
      } else {
        openPopupByName(fname);
      }
    });
    d.appendChild(imgEl);
    gallery.appendChild(d);
  });
}
function renderGalleryMarkMode(arr){
  currentGalleryImages=arr;
  gallery.innerHTML='';
  arr.forEach(fname=>{
    const d=document.createElement('div');
    d.classList.add('image-item');
    const imgEl=document.createElement('img');
    imgEl.src='/images/'+encodeURIComponent(fname);
    imgEl.alt=fname;
    d.addEventListener('click',()=>d.classList.toggle('marked'));
    d.appendChild(imgEl);
    gallery.appendChild(d);
  });
}

function openPopupByName(fname){
  currentImageIndex=currentGalleryImages.indexOf(fname);
  showPopup(fname);
}
function showPopup(fname){
  const data=prompts[fname]||{};
  popupImage.src='/images/'+encodeURIComponent(fname);
  popupPrompt.textContent=data.prompt||'Kein Prompt';
  popupModelSelect.value=data.model||'';
  popupDate.value=data.monthYear||'';
  scale=1; offsetY=0;
  applyTransform();
  popup.classList.add('visible');
}
function applyTransform(){
  popupImage.style.transform=`translateY(${offsetY}px) scale(${scale})`;
}
async function saveAllText(){
  if(!popup.classList.contains('visible')) return;
  const fname=currentGalleryImages[currentImageIndex];
  const newPrompt=popupPrompt.textContent.trim();
  const newModel=popupModelSelect.value.trim();
  if(!prompts[fname]) prompts[fname]={};
  prompts[fname].prompt=(newPrompt==='Kein Prompt'?'':newPrompt);
  prompts[fname].model=newModel;
  await savePromptData(fname);
}
function navImage(dir){
  saveAllText();
  currentImageIndex=(currentImageIndex+dir+currentGalleryImages.length)%currentGalleryImages.length;
  showPopup(currentGalleryImages[currentImageIndex]);
}

/* Slideshow */
function startSlideshow(arr,startIndex=0){
  isSlideshowRunning=true;
  playStopBtn.textContent='■';
  popup.classList.add('visible');
  popup.requestFullscreen().catch(()=>{});
  slideshowOrder=[...arr];
  let slideIndex=startIndex;
  popupImage.src='/images/'+encodeURIComponent(slideshowOrder[slideIndex]);
  slideshowInterval=setInterval(()=>{
    slideIndex=(slideIndex+1)%slideshowOrder.length;
    popupImage.src='/images/'+encodeURIComponent(slideshowOrder[slideIndex]);
  }, getSlideshowInterval());
}
function stopSlideshow(){
  isSlideshowRunning=false;
  playStopBtn.textContent='▶';
  clearInterval(slideshowInterval);
  slideshowInterval=null;
  popup.classList.remove('fullscreen');
}
function getSlideshowInterval(){
  return 1000*Math.pow(2, slideshowTimeIndex-1);
}

// ----------------------------------------------------
// Prompt Gruppen
// ----------------------------------------------------
function showPromptGroupsOverview(){
  promptGroupCoords = Object.keys(groupToPromptMap).filter(coord=>
    images.some(f=>prompts[f]?.promptGroupId===coord)
  );
  if(!promptGroupCoords.length){
    renderGallery([]);
    return;
  }
  isSinglePromptGroupMode=false;
  hideGroupNavArrows();

  gallery.innerHTML='';
  promptGroupCoords.forEach(coord=>{
    const arr=images.filter(f=>prompts[f]?.promptGroupId===coord);
    if(!arr.length) return;
    const rnd=arr[Math.floor(Math.random()*arr.length)];
    const d=document.createElement('div');
    d.classList.add('image-item');
    const imgEl=document.createElement('img');
    imgEl.src='/images/'+encodeURIComponent(rnd);
    imgEl.alt=rnd;
    if(coord.startsWith('ID')) imgEl.title=coord.substring(2);
    d.appendChild(imgEl);

    d.addEventListener('click',()=>{
      const idx=promptGroupCoords.indexOf(coord);
      enterSinglePromptGroup(idx);
    });
    gallery.appendChild(d);
  });
}
function enterSinglePromptGroup(index){
  if(index<0) index=0;
  currentPromptGroupIndex=index;
  isSinglePromptGroupMode=true;
  showPromptGroupAtIndex(currentPromptGroupIndex);
  if(promptGroupCoords.length>1){
    showGroupNavArrows();
  } else {
    hideGroupNavArrows();
  }
}
function showPromptGroupAtIndex(idx){
  const coord=promptGroupCoords[idx];
  const arr=images.filter(f=>prompts[f]?.promptGroupId===coord);
  renderGallery(arr);
}
function navPromptGroup(dir){
  currentPromptGroupIndex=(currentPromptGroupIndex+dir+promptGroupCoords.length)%promptGroupCoords.length;
  showPromptGroupAtIndex(currentPromptGroupIndex);
}
function showGroupNavArrows(){
  promptGroupNavLeft.style.display='block';
  promptGroupNavRight.style.display='block';
}
function hideGroupNavArrows(){
  promptGroupNavLeft.style.display='none';
  promptGroupNavRight.style.display='none';
}

// Merge + SingleGroup
function showGroupMarkingMode(){
  markedGroups=[];
  const coords=Object.keys(groupToPromptMap).filter(coord=>
    images.some(f=>prompts[f]?.promptGroupId===coord)
  );
  gallery.innerHTML='';
  coords.forEach(coord=>{
    const groupImgs=images.filter(f=>prompts[f]?.promptGroupId===coord);
    if(!groupImgs.length) return;
    const rnd=groupImgs[Math.floor(Math.random()*groupImgs.length)];

    const d=document.createElement('div');
    d.classList.add('image-item');
    const imgEl=document.createElement('img');
    imgEl.src='/images/'+encodeURIComponent(rnd);
    imgEl.alt=rnd;
    if(coord.startsWith('ID')) imgEl.title=coord.substring(2);

    d.addEventListener('click',()=>{
      if(d.classList.contains('marked')){
        d.classList.remove('marked');
        markedGroups=markedGroups.filter(x=>x!==coord);
      } else {
        d.classList.add('marked');
        markedGroups.push(coord);
      }
    });
    d.appendChild(imgEl);
    gallery.appendChild(d);
  });
}
function showSingleGroupMarkingMode(coord){
  markedGroups=[coord];
  gallery.innerHTML='';
  const groupImgs=images.filter(f=>prompts[f]?.promptGroupId===coord);
  groupImgs.forEach(fname=>{
    const d=document.createElement('div');
    d.classList.add('image-item','marked');
    const imgEl=document.createElement('img');
    imgEl.src='/images/'+encodeURIComponent(fname);
    imgEl.alt=fname;
    if(coord.startsWith('ID')) imgEl.title=coord.substring(2);

    d.addEventListener('click',()=>{
      d.classList.toggle('marked');
    });
    d.appendChild(imgEl);
    gallery.appendChild(d);
  });
}
async function finishSingleGroupEdit(coord){
  const all=document.querySelectorAll('.image-item');
  for(const div of all){
    if(!div.classList.contains('marked')){
      const fname=decodeURIComponent(div.querySelector('img').src.split('/images/')[1]);
      if(prompts[fname]){
        prompts[fname].promptGroupId='';
        await savePromptData(fname);
      }
    }
  }
}
async function mergeSelectedGroups(){
  if(markedGroups.length<2) return;
  const targetCoord=markedGroups[0];
  for(let i=1;i<markedGroups.length;i++){
    const oldCoord=markedGroups[i];
    const groupImgs=images.filter(f=>prompts[f]?.promptGroupId===oldCoord);
    for(const fname of groupImgs){
      prompts[fname].promptGroupId=targetCoord;
      await savePromptData(fname);
    }
    delete groupToPromptMap[oldCoord];
  }
}

// ----------------------------------------------------
// Favoriten
// ----------------------------------------------------
function showFavorites(){
  exitAllModes();
  const fav=images.filter(f=>prompts[f]?.isFavorite);
  newAssignmentRow.style.display='none';
  renderGallery(fav);
}

// ----------------------------------------------------
// Matrix
// ----------------------------------------------------
function initMatrixButtons(){
  updateMatrixButtons();
  matrixBtnX.addEventListener('click',()=>{
    xActive=!xActive;updateMatrixButtons();
  });
  matrixBtnX.addEventListener('wheel',(e)=>{
    e.preventDefault();
    if(!xActive)return;
    if(e.deltaY<0)xLetter=nextLetter(xLetter);
    else xLetter=prevLetter(xLetter);
    updateMatrixButtons();
    if(!isIndGroupMode) showIndGroup();
  });

  matrixBtnY.addEventListener('click',()=>{
    yActive=!yActive;updateMatrixButtons();
  });
  matrixBtnY.addEventListener('wheel',(e)=>{
    e.preventDefault();
    if(!yActive)return;
    if(e.deltaY<0)yLetter=nextLetter(yLetter);
    else yLetter=prevLetter(yLetter);
    updateMatrixButtons();
    if(!isIndGroupMode) showIndGroup();
  });

  matrixBtnZ.addEventListener('click',()=>{
    zActive=!zActive;updateMatrixButtons();
  });
  matrixBtnZ.addEventListener('wheel',(e)=>{
    e.preventDefault();
    if(!zActive)return;
    if(e.deltaY<0)zLetter=nextLetter(zLetter);
    else zLetter=prevLetter(zLetter);
    updateMatrixButtons();
    if(!isIndGroupMode) showIndGroup();
  });
}
function updateMatrixButtons(){
  matrixBtnX.textContent=xLetter;
  matrixBtnY.textContent=yLetter;
  matrixBtnZ.textContent=zLetter;
  matrixBtnX.classList.toggle('active', xActive);
  matrixBtnY.classList.toggle('active', yActive);
  matrixBtnZ.classList.toggle('active', zActive);
}
function nextLetter(ch){
  let code=ch.charCodeAt(0);
  if(code<'Z'.charCodeAt(0)) code++;
  return String.fromCharCode(code);
}
function prevLetter(ch){
  let code=ch.charCodeAt(0);
  if(code>'A'.charCodeAt(0)) code--;
  return String.fromCharCode(code);
}
function getCurrentMatrixGroupId(){
  return 'ID'+xLetter+yLetter+zLetter;
}
function showIndGroup(){
  const gId=getCurrentMatrixGroupId();
  const arr=images.filter(f=>prompts[f]?.indGroups?.includes(gId));
  renderGallery(arr);
}

// ----------------------------------------------------
// Laden / Speichern
// ----------------------------------------------------
async function loadColors(){
  try{
    const r=await fetch('/api/colors');
    if(!r.ok) throw new Error('Fehler Colors');
    const c=await r.json();
    Object.keys(c).forEach(k=>{
      document.documentElement.style.setProperty(`--${k}`, c[k]);
    });
  }catch(e){ console.error(e); }
}
async function loadImages(){
  try{
    const r=await fetch('/api/images');
    if(!r.ok) throw new Error('Fehler Images');
    images=await r.json();
  }catch(e){ console.error(e); }
}
async function loadPrompts(){
  try{
    const r=await fetch('/api/prompts');
    if(!r.ok) throw new Error('Fehler Prompts');
    prompts=await r.json();

    promptToGroupMap={};
    groupToPromptMap={};
    for(const fname of Object.keys(prompts)){
      const p=prompts[fname];
      if(!p.prompt) continue;
      if(!p.promptGroupId) continue;
      if(!groupToPromptMap[p.promptGroupId]){
        groupToPromptMap[p.promptGroupId]=p.prompt;
      }
      if(!promptToGroupMap[p.prompt]){
        promptToGroupMap[p.prompt]=p.promptGroupId;
      }
    }

    // Bilder ohne Prompt zuerst
    images.sort((a,b)=>{
      const ha=!!(prompts[a]?.prompt);
      const hb=!!(prompts[b]?.prompt);
      if(ha===hb) return 0;
      return ha?1:-1;
    });
  }catch(e){ console.error(e); }
}
async function loadModels(){
  try{
    const r=await fetch('/api/models');
    if(!r.ok) throw new Error('Fehler Models');
    const ml=await r.json();
    newModelSelect.innerHTML='';
    popupModelSelect.innerHTML='';
    ml.forEach(m=>{
      const opt=document.createElement('option');
      opt.value=m;
      opt.textContent=m;
      newModelSelect.appendChild(opt.cloneNode(true));
      popupModelSelect.appendChild(opt);
    });
  }catch(e){ console.error(e); }
}
async function savePromptData(fname){
  const p=prompts[fname]||{};
  await fetch('/api/prompts/'+encodeURIComponent(fname),{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      prompt:p.prompt||'',
      model:p.model||'',
      promptGroupId:p.promptGroupId||'',
      isFavorite:!!p.isFavorite,
      indGroups:Array.isArray(p.indGroups)?p.indGroups:[]
    })
  });
}

// ----------------------------------------------------
// Farb-Config
// ----------------------------------------------------
function initColorConfig(){
  colorInputs.forEach(ci=>{
    originalColors[ci.varName] = getComputedStyle(document.documentElement).getPropertyValue(ci.varName).trim();
  });
  openColorConfigBtn.addEventListener('click',()=>showColorConfig(true));
  colorPreviewBtn.addEventListener('click',previewColors);
  colorOkBtn.addEventListener('click',applyColorsAndClose);
  colorCancelBtn.addEventListener('click',cancelColorsAndClose);

  colorInputs.forEach(ci=>{
    const colorPicker=document.getElementById(ci.colorId);
    const textInput=document.getElementById(ci.textId);
    colorPicker.addEventListener('input',()=>{
      textInput.value=colorPicker.value;
    });
    textInput.addEventListener('input',()=>{
      const validHex=validColor(textInput.value);
      colorPicker.value=validHex;
    });
  });
}
function showColorConfig(vis){
  colorConfigOverlay.classList.toggle('visible', vis);
  if(vis){
    colorInputs.forEach(ci=>{
      let val=getComputedStyle(document.documentElement).getPropertyValue(ci.varName).trim()||'#ffffff';
      const txt=document.getElementById(ci.textId);
      if(ci.colorId){
        const col=document.getElementById(ci.colorId);
        txt.value=val;
        col.value=validColor(val);
      } else {
        txt.value=val;
      }
    });
  }
}
function previewColors(){
  colorInputs.forEach(ci=>{
    const txtVal=document.getElementById(ci.textId).value.trim();
    document.documentElement.style.setProperty(ci.varName, txtVal);
  });
}
async function applyColorsAndClose(){
  const newCols={};
  for(const ci of colorInputs){
    const txtVal=document.getElementById(ci.textId).value.trim();
    document.documentElement.style.setProperty(ci.varName, txtVal);
    newCols[ci.varName.replace(/^--/,'')]=txtVal;
  }
  try{
    const r=await fetch('/api/colors',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(newCols)
    });
    if(!r.ok) throw new Error('Fehler beim Speichern der Farben');
  } catch(e){
    console.error(e);
  }
  showColorConfig(false);
}
function cancelColorsAndClose(){
  Object.keys(originalColors).forEach(vn=>{
    document.documentElement.style.setProperty(vn, originalColors[vn]);
  });
  showColorConfig(false);
}
function validColor(val){
  const hexRegex=/^#([0-9A-F]{3}){1,2}$/i;
  if(!hexRegex.test(val)) return '#ffffff';
  return val;
}

// ----------------------------------------------------
function exitAllModes(){
  isFavMode=false;
  isIndGroupMode=false;
  isPromptGroupsMergeMode=false;
  isSinglePromptGroupMode=false;
  isNewMarkMode=false;
  markedGroups=[];

  xActive=false;yActive=false;zActive=false;
  updateMatrixButtons();

  newAssignmentRow.style.display='none';
  promptGroupsMergeBtn.textContent='Prompt Gruppen+';
  favEditBtn.textContent='★+';
  ingEditBtn.textContent='InG +';

  hideGroupNavArrows();
  enableAllButtons();
}
function disableAllButtonsExcept(...exceptions){
  const buttons=document.querySelectorAll('.menu-row1 button, .menu-row2 button');
  buttons.forEach(btn=>{
    if(btn!==columnCountBtn && btn!==slideshowTimeBtn && !exceptions.includes(btn)){
      btn.disabled=true;
      btn.setAttribute('aria-disabled','true');
    }
  });
}
function enableAllButtons(){
  const buttons=document.querySelectorAll('.menu-row1 button, .menu-row2 button');
  buttons.forEach(btn=>{
    btn.disabled=false;
    btn.setAttribute('aria-disabled','false');
  });
}
