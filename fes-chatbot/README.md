# Flight Experience SG — Chatbot

A customer support chatbot for Flight Experience Singapore with an aviation cockpit dark theme.

---

## Deploy to Vercel (5 minutes, free, no coding)

### Step 1 — Get a free Vercel account
Go to https://vercel.com and sign up for free (use "Continue with GitHub" for easiest setup).

### Step 2 — Get your Anthropic API key
1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click "API Keys" in the sidebar → "Create Key"
4. Copy the key (starts with `sk-ant-...`) — save it somewhere safe

### Step 3 — Upload this project to Vercel
1. Go to https://vercel.com/new
2. Click **"Browse"** to upload files (if you don't have GitHub)
3. Drag and drop the entire `fes-chatbot` folder
4. Click **Deploy**

### Step 4 — Add your API key
1. After deploying, go to your project in Vercel dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: paste your key from Step 2
4. Click **Save**
5. Go to **Deployments** → click the 3 dots on your latest deployment → **Redeploy**

### Step 5 — Done!
Your chatbot is live at the URL Vercel gives you (e.g. `your-project.vercel.app`).

---

## Project Structure

```
fes-chatbot/
├── api/
│   └── chat.js        ← secure backend (holds your API key)
├── public/
│   └── index.html     ← the chatbot UI
└── vercel.json        ← Vercel configuration
```

---

## Customisation
- To update the knowledge base (FAQs, prices, programmes), edit the `SYSTEM` prompt in `api/chat.js`
- To change the look and feel, edit `public/index.html`
