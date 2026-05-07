# AGENTS.md

## Project Structure

- **server/**: Express backend (port 3001), handles file upload, metadata extraction/cleaning via exiftool-vendored
- **client/**: React 19 + TypeScript + Vite frontend (vite dev defaults to port 5173)

## Commands

### Server
```bash
cd server && npm run dev    # Start with nodemon (ignores uploads/)
cd server && npm start     # Production start
```

### Client
```bash
cd client && npm run dev    # Dev server (port 5173)
cd client && npm run build # Build: tsc -b && vite build
cd client && npm run lint  # ESLint
```

## Key Constraints

- **API endpoint**: Client hardcoded to `http://localhost:3001` (server must run first)
- **In-memory storage**: Server uses `filesMap` - files lost on restart
- **Upload dir**: `server/uploads/` is gitignored, ignored by nodemon
- **TypeScript**: Client uses project references (`tsconfig.app.json`, `tsconfig.node.json`) - build must run `tsc -b` first

## Architecture Notes

- Server: `index.js` (Express routes) + `metadataService.js` (exiftool-vendored)
- Client: `App.tsx` (main UI), `main.tsx` (entrypoint)
- Client expects backend at `localhost:3001` - CORS enabled on server