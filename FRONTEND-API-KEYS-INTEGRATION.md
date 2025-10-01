# 🎨 Frontend Integration Guide - Personal API Keys

## Overview

Users **MUST** connect their own Bybit or Binance API keys to trade. This guide shows frontend developers how to integrate the API key management UI.

---

## 🎯 User Flow

```
1. User logs in
   ↓
2. Dashboard shows "Connect Exchange API Keys" prompt
   ↓
3. User clicks "Connect Bybit" or "Connect Binance"
   ↓
4. Modal/page opens with API key input form
   ↓
5. User enters API key + secret
   ↓
6. System saves and verifies with exchange
   ↓
7. Shows verification status (✅ Verified or ❌ Failed)
   ↓
8. User can now trade with TradingView signals
```

---

## 📡 API Endpoints

Base URL: `http://localhost:3333/api/user-api-keys`

All endpoints require JWT authentication:
```javascript
headers: {
  'Authorization': 'Bearer <JWT_TOKEN>',
  'Content-Type': 'application/json'
}
```

### 1. Get All API Keys Status
```javascript
GET /api/user-api-keys/all/status

Response:
{
  "success": true,
  "tradingMode": "PERSONAL",
  "exchanges": {
    "bybit": {
      "has_key": true,
      "masked_key": "9dUV...VKMh",
      "enabled": true,
      "verified": true,
      "verified_at": "2025-10-01T10:00:00Z"
    },
    "binance": {
      "has_key": false
    }
  }
}
```

### 2. Save API Key
```javascript
POST /api/user-api-keys/bybit
POST /api/user-api-keys/binance

Body:
{
  "apiKey": "9dUVCpuUQJnx6sVKMh",
  "apiSecret": "secret_goes_here"
}

Response:
{
  "success": true,
  "message": "API key saved successfully",
  "masked_key": "9dUV...VKMh"
}

Error Response:
{
  "success": false,
  "error": "Binance API key must be 64 characters"
}
```

### 3. Verify API Key
```javascript
POST /api/user-api-keys/bybit/verify
POST /api/user-api-keys/binance/verify

Response:
{
  "success": true,
  "message": "API key verified successfully",
  "permissions": {
    "can_read": true,
    "can_trade": false,
    "can_withdraw": false
  }
}

Error Response:
{
  "success": false,
  "error": "API key verification failed"
}
```

### 4. Get Single Exchange Status
```javascript
GET /api/user-api-keys/bybit/status
GET /api/user-api-keys/binance/status

Response:
{
  "success": true,
  "has_key": true,
  "masked_key": "9dUV...VKMh",
  "enabled": true,
  "verified": true,
  "verified_at": "2025-10-01T10:00:00Z"
}
```

### 5. Delete API Key
```javascript
DELETE /api/user-api-keys/bybit
DELETE /api/user-api-keys/binance

Response:
{
  "success": true,
  "message": "API key deleted successfully"
}
```

---

## 🎨 UI Components

### 1. Dashboard Banner (if no API keys)
```jsx
{!hasAPIKeys && (
  <Alert severity="warning" sx={{ mb: 2 }}>
    <AlertTitle>Connect Exchange API Keys Required</AlertTitle>
    You must connect your Bybit or Binance API keys to start trading.
    <Button onClick={() => navigate('/settings/api-keys')}>
      Connect Now
    </Button>
  </Alert>
)}
```

### 2. API Keys Management Page
```jsx
// Location: /settings/api-keys

<Grid container spacing={3}>
  {/* Bybit Card */}
  <Grid item xs={12} md={6}>
    <Card>
      <CardHeader
        title="Bybit"
        avatar={<BybitIcon />}
      />
      <CardContent>
        {bybitStatus.has_key ? (
          <>
            <TextField
              label="API Key"
              value={bybitStatus.masked_key}
              disabled
              fullWidth
            />
            <Chip
              label={bybitStatus.verified ? "Verified ✅" : "Not Verified ❌"}
              color={bybitStatus.verified ? "success" : "error"}
            />
            <Typography variant="caption">
              Last verified: {formatDate(bybitStatus.verified_at)}
            </Typography>
          </>
        ) : (
          <Button onClick={() => openBybitModal()}>
            Connect Bybit API Key
          </Button>
        )}
      </CardContent>
      <CardActions>
        {bybitStatus.has_key && (
          <>
            <Button onClick={verifyBybit}>Verify Again</Button>
            <Button onClick={deleteBybit} color="error">Delete</Button>
          </>
        )}
      </CardActions>
    </Card>
  </Grid>

  {/* Binance Card - same structure */}
</Grid>
```

### 3. Add API Key Modal
```jsx
<Dialog open={open} onClose={handleClose} maxWidth="md">
  <DialogTitle>Connect Bybit API Key</DialogTitle>
  <DialogContent>
    <Alert severity="info" sx={{ mb: 2 }}>
      Your API secret is encrypted with AES-256 before storage.
      We never store plaintext secrets.
    </Alert>

    <TextField
      label="API Key"
      value={apiKey}
      onChange={(e) => setApiKey(e.target.value)}
      fullWidth
      sx={{ mb: 2 }}
      helperText="Example: 9dUVCpuUQJnx6sVKMh"
    />

    <TextField
      label="API Secret"
      type="password"
      value={apiSecret}
      onChange={(e) => setApiSecret(e.target.value)}
      fullWidth
      sx={{ mb: 2 }}
      helperText="Your API secret (encrypted before storage)"
    />

    <Alert severity="warning">
      <AlertTitle>Important Security Notes</AlertTitle>
      <ul>
        <li>NEVER enable withdrawal permissions</li>
        <li>Only enable Reading + Trading permissions</li>
        <li>Consider enabling IP whitelisting</li>
        <li>Use 2FA on your exchange account</li>
      </ul>
    </Alert>

    {error && (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button
      onClick={handleSave}
      variant="contained"
      disabled={loading}
    >
      {loading ? <CircularProgress size={24} /> : "Save & Verify"}
    </Button>
  </DialogActions>
</Dialog>
```

---

## 💻 React Hook Example

```javascript
// hooks/useAPIKeys.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAPIKeys = () => {
  const [apiKeys, setApiKeys] = useState({
    bybit: { has_key: false },
    binance: { has_key: false }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all API keys status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user-api-keys/all/status', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setApiKeys(response.data.exchanges);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  // Save API key
  const saveAPIKey = async (exchange, apiKey, apiSecret) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `/api/user-api-keys/${exchange}`,
        { apiKey, apiSecret },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      // Verify immediately after saving
      await verifyAPIKey(exchange);

      // Refresh status
      await fetchStatus();

      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save API key');
      return { success: false, error: err.response?.data?.error };
    } finally {
      setLoading(false);
    }
  };

  // Verify API key
  const verifyAPIKey = async (exchange) => {
    try {
      const response = await axios.post(
        `/api/user-api-keys/${exchange}/verify`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      await fetchStatus();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
      throw err;
    }
  };

  // Delete API key
  const deleteAPIKey = async (exchange) => {
    try {
      setLoading(true);
      await axios.delete(`/api/user-api-keys/${exchange}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      await fetchStatus();
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete API key');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return {
    apiKeys,
    loading,
    error,
    saveAPIKey,
    verifyAPIKey,
    deleteAPIKey,
    refreshStatus: fetchStatus
  };
};

// Helper to get JWT token
const getToken = () => {
  return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
};
```

---

## 📝 Complete Component Example

```javascript
// pages/Settings/APIKeys.jsx
import React, { useState } from 'react';
import {
  Container, Grid, Card, CardHeader, CardContent, CardActions,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, AlertTitle, Chip, Typography, CircularProgress
} from '@mui/material';
import { useAPIKeys } from '../../hooks/useAPIKeys';

export default function APIKeysPage() {
  const { apiKeys, loading, error, saveAPIKey, verifyAPIKey, deleteAPIKey } = useAPIKeys();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [saveError, setSaveError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const openModal = (exchange) => {
    setSelectedExchange(exchange);
    setApiKey('');
    setApiSecret('');
    setSaveError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveLoading(true);

    const result = await saveAPIKey(selectedExchange, apiKey, apiSecret);

    if (result.success) {
      setModalOpen(false);
      // Show success notification
      alert('API key saved and verified successfully!');
    } else {
      setSaveError(result.error);
    }

    setSaveLoading(false);
  };

  const handleDelete = async (exchange) => {
    if (!confirm(`Are you sure you want to delete your ${exchange} API key?`)) {
      return;
    }
    await deleteAPIKey(exchange);
  };

  const handleVerify = async (exchange) => {
    try {
      await verifyAPIKey(exchange);
      alert('Verification successful!');
    } catch (err) {
      alert('Verification failed. Please check your API key.');
    }
  };

  if (loading && !apiKeys.bybit && !apiKeys.binance) {
    return <CircularProgress />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Exchange API Keys
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Personal API Keys Required</AlertTitle>
        Connect your own Bybit or Binance API keys to trade. Your funds stay
        in your exchange account - we never hold custody.
      </Alert>

      <Grid container spacing={3}>
        {/* Bybit */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Bybit" />
            <CardContent>
              {apiKeys.bybit?.has_key ? (
                <>
                  <TextField
                    label="API Key"
                    value={apiKeys.bybit.masked_key}
                    disabled
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <Chip
                    label={apiKeys.bybit.verified ? "✅ Verified" : "❌ Not Verified"}
                    color={apiKeys.bybit.verified ? "success" : "error"}
                  />
                  {apiKeys.bybit.verified_at && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Last verified: {new Date(apiKeys.bybit.verified_at).toLocaleString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => openModal('bybit')}
                  fullWidth
                >
                  Connect Bybit API Key
                </Button>
              )}
            </CardContent>
            {apiKeys.bybit?.has_key && (
              <CardActions>
                <Button onClick={() => handleVerify('bybit')}>
                  Verify Again
                </Button>
                <Button onClick={() => handleDelete('bybit')} color="error">
                  Delete
                </Button>
              </CardActions>
            )}
          </Card>
        </Grid>

        {/* Binance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Binance" />
            <CardContent>
              {apiKeys.binance?.has_key ? (
                <>
                  <TextField
                    label="API Key"
                    value={apiKeys.binance.masked_key}
                    disabled
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <Chip
                    label={apiKeys.binance.verified ? "✅ Verified" : "❌ Not Verified"}
                    color={apiKeys.binance.verified ? "success" : "error"}
                  />
                  {apiKeys.binance.verified_at && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Last verified: {new Date(apiKeys.binance.verified_at).toLocaleString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => openModal('binance')}
                  fullWidth
                >
                  Connect Binance API Key
                </Button>
              )}
            </CardContent>
            {apiKeys.binance?.has_key && (
              <CardActions>
                <Button onClick={() => handleVerify('binance')}>
                  Verify Again
                </Button>
                <Button onClick={() => handleDelete('binance')} color="error">
                  Delete
                </Button>
              </CardActions>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Add API Key Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Connect {selectedExchange === 'bybit' ? 'Bybit' : 'Binance'} API Key
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your API secret is encrypted with AES-256 before storage.
          </Alert>

          <TextField
            label="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
            placeholder={selectedExchange === 'binance' ? '64 characters' : 'Your API key'}
          />

          <TextField
            label="API Secret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            placeholder="Your API secret"
          />

          <Alert severity="warning">
            <AlertTitle>Security Requirements</AlertTitle>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>NEVER enable withdrawal permissions</li>
              <li>Only enable Reading + Trading</li>
              <li>Enable 2FA on your exchange</li>
              <li>Consider IP whitelisting</li>
            </ul>
          </Alert>

          {saveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {saveError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saveLoading || !apiKey || !apiSecret}
          >
            {saveLoading ? <CircularProgress size={24} /> : 'Save & Verify'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
```

---

## 🔔 Notifications

Show these notifications to users:

### On Dashboard (if no API keys)
```
⚠️ Trading Disabled - Connect your Bybit or Binance API keys to start trading
[Connect Now Button]
```

### On Successful Save
```
✅ API key saved and verified successfully! You can now trade.
```

### On Failed Verification
```
❌ API key verification failed. Please check:
- API key is correct (64 chars for Binance)
- Trading permissions are enabled
- API key is not expired
- IP whitelisting allows our server
```

### On Delete
```
⚠️ Are you sure? Deleting your API key will disable trading.
[Cancel] [Delete]
```

---

## 🎯 User Guide Link

Add a "How to get API keys" link that opens the user guide:

```jsx
<Button
  startIcon={<HelpIcon />}
  onClick={() => window.open('/docs/api-keys-guide', '_blank')}
>
  How to Get API Keys
</Button>
```

Copy `USER-GUIDE-CONNECT-API-KEYS.md` to your docs folder for users.

---

## ✅ Implementation Checklist

- [ ] Create API Keys settings page (`/settings/api-keys`)
- [ ] Implement useAPIKeys hook
- [ ] Add dashboard banner for users without keys
- [ ] Create add/edit API key modal
- [ ] Add verification status indicators
- [ ] Implement delete confirmation
- [ ] Add user guide link
- [ ] Test with real Bybit testnet keys
- [ ] Test with real Binance testnet keys
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success notifications

---

**Users can now securely connect their exchange API keys and start trading! 🚀**
