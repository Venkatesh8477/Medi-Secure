# AI Integration Troubleshooting Guide

## Error: "Failed to generate AI suggestions" / 403 Forbidden

If you're seeing a 403 Forbidden error when trying to use the AI suggestions feature, follow these steps:

### Step 1: Enable Generative Language API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Generative Language API"
5. Click on it and press **Enable**

### Step 2: Verify API Key Permissions

1. Go to **APIs & Services** > **Credentials**
2. Find your API key (the one starting with `AIzaSy...`)
3. Click on it to edit
4. Under **API restrictions**, make sure:
   - Either "Don't restrict key" is selected, OR
   - "Restrict key" is selected and "Generative Language API" is in the allowed APIs list
5. Under **Application restrictions**, you can set restrictions if needed, but for testing, "None" works best
6. Click **Save**

### Step 3: Check API Key Validity

1. Verify the API key in your `.env` file:
   ```
   GEMINI_API_KEY=AIzaSyCCMHbuJJ-9mJODSy6lZIyvL0K5etKLc_A
   ```

2. Make sure there are no extra spaces or quotes around the key

3. Restart your backend server after updating the `.env` file

### Step 4: Test the API Key

Run the test script to verify your API key works:

```bash
cd backend
node test-gemini.js
```

This will show you which models are available and if your API key has proper access.

### Step 5: Check Billing (if required)

Some Gemini models may require billing to be enabled:
1. Go to **Billing** in Google Cloud Console
2. Make sure billing is enabled for your project
3. Some models have free tiers, but newer models (2.5, 2.0) may require billing

### Alternative: Use Free Tier Models

If you continue to have issues, the code will automatically try these models in order:
- `gemini-pro-latest` (most likely to work)
- `gemini-flash-latest` (faster, free tier)
- `gemini-1.5-flash` (older but stable)
- `gemini-1.5-pro` (older but stable)
- `gemini-pro` (legacy)

### Common Error Messages

- **403 Forbidden**: API not enabled or key doesn't have permissions
- **404 Not Found**: Model name is incorrect or not available
- **401 Unauthorized**: API key is invalid or expired

### Still Having Issues?

1. Check the backend console logs for detailed error messages
2. Verify the API key is correct in your `.env` file
3. Make sure you've restarted the backend server after any changes
4. Check Google Cloud Console for any quota or billing issues

### Quick Test

You can test if your API key works by running:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

Replace `YOUR_API_KEY` with your actual key. This should return a list of available models.

