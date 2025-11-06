# Cactus Jack Shop

## Setup Instructions

### 1. Configure GitHub Secrets

Go to your GitHub repository settings and add the following secrets:

1. Navigate to: **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:
   - `SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - `SUPABASE_ANON_KEY`: Your Supabase anon/public key

### 2. Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Select the `gh-pages` branch
4. Click **Save**

### 3. Deploy

The GitHub Action will automatically:

- Generate the `supabase-config.js` file with your secrets
- Deploy to GitHub Pages

Every push to the `master` branch will trigger a new deployment.

### Local Development

For local development, create a `supabase-config.js` file manually:

```javascript
const SUPABASE_URL = "your-url-here";
const SUPABASE_ANON_KEY = "your-key-here";
// ... rest of the config
```

**Note:** Never commit `supabase-config.js` to the repository. It's in `.gitignore`.

### Security Note

The Supabase anon key is safe to expose in client-side code as it's designed for public use. However, make sure to:

- Configure Row Level Security (RLS) policies in your Supabase database
- Never expose your service_role key
- Use proper authentication for sensitive operations
