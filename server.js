const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── ANTHROPIC PROXY ──
app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── OPENAI TTS PROXY ──
app.post('/api/speak', async (req, res) => {
  const { text, voice } = req.body;
  const key = (process.env.OPENAI_KEY || '').trim();
  console.log('[TTS] voice:', voice, 'textLen:', (text||'').length);
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice || 'alloy',
        response_format: 'mp3'
      })
    });
    console.log('[TTS] status:', response.status);
    if (!response.ok) {
      const err = await response.text();
      console.log('[TTS] error:', err);
      return res.status(response.status).json({ error: err });
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    response.body.pipe(res);
  } catch (err) {
    console.log('[TTS] exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ward Rounds running on port ${PORT}`));
