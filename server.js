/* server.js */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

// ----------------------------------------------------
// Pfade / Dateien
// ----------------------------------------------------
const IMAGE_DIR = path.join(__dirname, 'images');         // Bilder
const PROMPT_FILE = path.join(__dirname, 'prompts.json'); // Prompt-Infos
const MODELS_FILE = path.join(__dirname, 'models.json');  // Modelle
const COLORS_FILE = path.join(__dirname, 'colors.json');  // Farbconfig

// ----------------------------------------------------
// Hilfsfunktionen
// ----------------------------------------------------
function loadIfExists(filePath, fallback) {
  if (fs.existsSync(filePath)) {
    try {
      const txt = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(txt);
    } catch (err) {
      console.error(`Konnte ${filePath} nicht laden:`, err);
      return fallback;
    }
  }
  return fallback;
}
function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Daten in ${filePath} gespeichert.`);
  } catch (err) {
    console.error(`Konnte ${filePath} nicht schreiben:`, err);
  }
}
function formatMonthYear(dateObj) {
  const months = ['Jan','Feb','Mär','Apr','Mai','Jun',
                  'Jul','Aug','Sep','Okt','Nov','Dez'];
  return `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

// ----------------------------------------------------
// In-Memory-Objekte
// ----------------------------------------------------
let modelList   = loadIfExists(MODELS_FILE, []);
let colorConfig = loadIfExists(COLORS_FILE, {});

// ----------------------------------------------------
// App-Setup
// ----------------------------------------------------
app.use(express.json());

// Statische Dateien aus "public"
app.use(express.static(path.join(__dirname, 'public')));

// Bilder aus /images
app.use('/images', express.static(IMAGE_DIR));

// Multer für Datei-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGE_DIR),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// ----------------------------------------------------
// Routen
// ----------------------------------------------------

// 1) Bilder auflisten
app.get('/api/images', (req, res) => {
  fs.readdir(IMAGE_DIR, (err, files) => {
    if (err) return res.status(500).send('Fehler beim Lesen von images/');
    const found = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    res.json(found);
  });
});

// 2) Bilder hochladen
app.post('/api/images', upload.array('images', 20), (req, res) => {
  const up = req.files.map(f => f.originalname);
  res.json({ uploaded: up });
});

// 3) Prompts
app.get('/api/prompts', (req, res) => {
  if (!fs.existsSync(PROMPT_FILE)) {
    return res.json({});
  }
  try {
    const data = JSON.parse(fs.readFileSync(PROMPT_FILE, 'utf-8'));
    res.json(data);
  } catch (err) {
    console.error('Fehler beim Lesen prompts.json:', err);
    res.status(500).json({ error: 'Prompts-Ladefehler' });
  }
});
app.post('/api/prompts/:name', (req, res) => {
  const fname = req.params.name;
  const { prompt, model, promptGroupId, isFavorite, indGroups } = req.body;

  let allPrompts = {};
  if (fs.existsSync(PROMPT_FILE)) {
    try {
      allPrompts = JSON.parse(fs.readFileSync(PROMPT_FILE, 'utf-8'));
    } catch (err) {
      console.error('Fehler beim Lesen prompts.json:', err);
    }
  }

  if (!allPrompts[fname]) {
    allPrompts[fname] = {};
  }
  allPrompts[fname].prompt        = prompt        || '';
  allPrompts[fname].model         = model         || '';
  allPrompts[fname].promptGroupId = promptGroupId || '';
  allPrompts[fname].isFavorite    = !!isFavorite;
  allPrompts[fname].indGroups     = Array.isArray(indGroups) ? indGroups : [];

  // Datum
  const pathImg = path.join(IMAGE_DIR, fname);
  try {
    const stats = fs.statSync(pathImg);
    allPrompts[fname].monthYear = formatMonthYear(stats.mtime);
  } catch (err) {
    allPrompts[fname].monthYear = '';
  }

  fs.writeFileSync(PROMPT_FILE, JSON.stringify(allPrompts, null, 2), 'utf-8');
  res.sendStatus(200);
});

// 4) Modelle
app.get('/api/models', (req, res) => {
  res.json(modelList);
});
app.post('/api/models', (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'Kein Modell' });
  if (!modelList.some(x => x.toLowerCase() === model.toLowerCase())) {
    modelList.push(model);
    saveJson(MODELS_FILE, modelList);
  }
  res.sendStatus(200);
});

// 5) Farben
app.get('/api/colors', (req, res) => {
  res.json(colorConfig);
});
app.post('/api/colors', (req, res) => {
  colorConfig = req.body;
  saveJson(COLORS_FILE, colorConfig);
  res.sendStatus(200);
});

// 6) Fallback => index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------
// Start
// ----------------------------------------------------
app.listen(port, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${port}`);
});

