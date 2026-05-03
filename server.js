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

// ── ELEVENLABS PROXY ──
app.post('/api/speak', async (req, res) => {
  const { voiceId, text, voiceSettings } = req.body;
  const key = (process.env.ELEVENLABS_KEY || '').trim();
  console.log(`[EL] key present: ${!!key}, prefix: ${key.slice(0,8)}, voiceId: ${voiceId}, textLen: ${(text||'').length}`);
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: voiceSettings || {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true
          }
        })
      }
    );
    console.log(`[EL] status: ${response.status}`);
    if (!response.ok) {
      const err = await response.text();
      console.log(`[EL] error: ${err}`);
      return res.status(response.status).json({ error: err });
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    response.body.pipe(res);
  } catch (err) {
    console.log(`[EL] exception: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ward Rounds running on port ${PORT}`));
