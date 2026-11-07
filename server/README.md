# block_info server

Express + TypeScript API for resolving Alchemy RPC URLs from multiple EVM chain IDs.

## Setup

```bash
cd server
npm install
cp .env.example .env
# Add your Alchemy API key to .env
npm run dev
```

## API

- `POST /api/mainnet`
- `POST /api/testnet`

Request body:

```json
{ "chain_ids": [1, 42161, 8453] }
```

Response:

```json
{ "rpcurl": ["https://..."] }
```

RPC URL results are cached in memory for 10 minutes. Only EVM-compatible chain IDs configured in the static network files are supported.

**Security:** The API returns complete RPC URLs, including the Alchemy API key, to the caller. This exposes the key to frontend users. Use a backend RPC proxy if the key must remain private.