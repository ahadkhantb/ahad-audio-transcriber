# AHAD Audio Transcriber

A free-tier starter project:
- Frontend: Netlify (static website)
- Backend: Hugging Face Spaces (Docker + FastAPI + WhisperX)
- Exports: JSON, TXT, SRT
- Sentence/segment timestamps from WhisperX

## Important limitations
- Free hosting is not unlimited. Hugging Face free Spaces can sleep, have CPU/RAM limits, and may time out on long audio.
- The first request may be slow while the backend loads the model.
- WhisperX's segment timestamps are segment-level, not guaranteed to match perfect grammatical sentence boundaries.
- This starter does not include user accounts. Anyone who can access the site can submit audio to the public backend. Do not upload private/sensitive recordings.
- Bengali transcription quality and alignment can vary. This app uses WhisperX transcription segments and does not run forced word alignment.

## 1. Create the GitHub repository
Create a repository named `ahad-audio-transcriber`, then upload the files keeping this folder structure.

## 2. Deploy the backend to Hugging Face Spaces
1. Create a new Space at https://huggingface.co/new-space
2. Choose **Docker** as the Space SDK.
3. Name it `ahad-audio-backend`.
4. Upload everything inside the `backend/` folder to the root of that Space.
5. Wait for the Space to build. Its URL will look like:
   `https://YOUR-USERNAME-ahad-audio-backend.hf.space`

## 3. Deploy the frontend to Netlify
1. Create a new site at https://app.netlify.com/
2. Import the GitHub repository.
3. Set **Base directory** to `frontend`.
4. Leave Build command empty.
5. Leave Publish directory as `.` (or `frontend`, depending on Netlify's base-directory UI).
6. After deploy, open `frontend/config.js` in GitHub and replace the backend URL with your actual Hugging Face Space URL, then commit the change. Netlify will redeploy.

## 4. Test
Open the Netlify site, choose a short audio file (30–60 seconds), select Bengali or Auto, and click Transcribe.
The backend may take several minutes on a free CPU Space.

## Configuration
In `frontend/config.js`, set `API_BASE` to your backend Space URL.
In the Hugging Face Space settings, you can set:
- `WHISPER_MODEL`: `base` (default), `small`, or `tiny`
- `MAX_UPLOAD_MB`: default `25`
- `ALLOWED_ORIGIN`: your Netlify site URL, e.g. `https://your-site.netlify.app`
- `HF_TOKEN`: not required for public Space inference

## Privacy and access
This basic version has no login or team permissions. A public Netlify site plus public backend means the upload endpoint is public. Use only audio you have permission to process. For a private team system, add authentication and rate limiting before sharing widely.
