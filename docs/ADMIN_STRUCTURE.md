# Admin Panel Structure - Refactored

## 🗂️ **New Folder Structure**

```
src/app/admin/
├── page.tsx              ← List all launchpads (NEW)
├── layout.tsx            ← Shared layout
├── add/
│   └── page.tsx          ← Create new collection (MOVED from /admin)
└── [address]/
    └── page.tsx          ← Edit collection by address (NEW)
```

---

## 📋 **Routes**

### 1. `/admin` - Launchpad List (NEW)
**Purpose:** Display all created launchpads from database

**Features:**
- ✅ Table showing all launchpads
- ✅ Search by name, symbol, contract address
- ✅ Filter by chain (MegaETH, Ethereum, etc.)
- ✅ Filter by status (active, completed, paused)
- ✅ Stats cards (total, active, completed, volume)
- ✅ Edit button → navigate to `/admin/[address]`
- ✅ "Create New Collection" button → navigate to `/admin/add`
- ✅ Refresh button to reload data

**Table Columns:**
- Collection (name + symbol)
- Contract address (with explorer link)
- Status badge
- Supply (minted / total)
- Progress bar (mint percentage)
- Volume (ETH)
- Created (days ago)
- Actions (Edit button)

**Data Source:**
```typescript
GET /api/admin/launchpads?chainId=6342&limit=100
```

---

### 2. `/admin/add` - Create Collection (MOVED)
**Purpose:** Create new NFT collection

**Features:**
- ✅ Creator Studio component
- ✅ Upload metadata (ZIP or single image)
- ✅ Configure collection details
- ✅ Add mint phases (whitelist + public)
- ✅ Upload to IPFS (images + metadata)
- ✅ Deploy to blockchain
- ✅ Save to database

**This is the SAME page as before, just moved to `/admin/add`**

---

### 3. `/admin/[address]` - Edit Collection (NEW)
**Purpose:** Edit existing launchpad by contract address

**Features:**
- ✅ Display collection info (read-only)
  - Contract address
  - Creator wallet
  - Total supply
  - Minted count
  - Volume
  - Created date

- ✅ Editable fields:
  - **Status** (active, paused, completed, cancelled)

- ✅ Read-only fields (on-chain data):
  - Description
  - External link
  - Base URI
  - All other metadata

**Actions:**
- Save changes (updates database status)
- Cancel → back to list

**Data Source:**
```typescript
GET /api/admin/launchpads?chainId=[all]
POST /api/admin/launchpads (action: update_status)
```

---

## 🎨 **UI Components Used**

### List Page (`/admin`):
- ✅ Card component
- ✅ Table (custom HTML table)
- ✅ Badge for status
- ✅ Input for search
- ✅ Select for filters
- ✅ Button components
- ✅ Progress bar (mint percentage)
- ✅ Stats cards

### Edit Page (`/admin/[address]`):
- ✅ Card component
- ✅ Input (read-only)
- ✅ Select (for status)
- ✅ Badge (for chain)
- ✅ Back button
- ✅ Save button

---

## 🔄 **User Flow**

### View Launchpads:
```
1. Navigate to /admin
2. See list of all launchpads
3. Filter by chain/status/search
4. View stats
```

### Create New Launchpad:
```
1. Click "Create New Collection" on /admin
2. Redirected to /admin/add
3. Fill form, upload files
4. Deploy to blockchain
5. Redirected back to /admin
```

### Edit Launchpad:
```
1. On /admin, click "Edit" button
2. Redirected to /admin/0x123...
3. View collection details
4. Change status
5. Click "Save"
6. Redirected back to /admin
```

---

## 📊 **Data Flow**

### List Page:
```
Browser → GET /api/admin/launchpads?chainId=6342
        → Database (Prisma)
        → Return launchpads[]
        → Display in table
```

### Edit Page:
```
Browser → GET /api/admin/launchpads (search by address)
        → Database (Prisma)
        → Return launchpad details
        → Display in form

User clicks Save:
Browser → POST /api/admin/launchpads (update_status)
        → Database (Prisma.update)
        → Success
        → Redirect to /admin
```

---

## 🎯 **Key Differences from `/` (Public Page)**

| Feature | `/` (Public) | `/admin` (Admin) |
|---------|-------------|------------------|
| **Purpose** | View collections | Manage collections |
| **Data** | Blockchain + DB | Database only |
| **Actions** | Mint NFTs | Edit status |
| **Filters** | Basic | Advanced (chain, status) |
| **Create** | No | Yes (/admin/add) |
| **Edit** | No | Yes (/admin/[address]) |
| **Stats** | No | Yes (cards) |

---

## ✅ **Completed Tasks**

- [x] Move `/admin` → `/admin/add`
- [x] Create new `/admin` list page
- [x] Create `/admin/[address]` edit page
- [x] Add search functionality
- [x] Add filter by chain
- [x] Add filter by status
- [x] Add stats cards
- [x] Add table with all data
- [x] Add edit button navigation
- [x] Add create button navigation
- [x] Fetch data from database API
- [x] Update status functionality

---

## 🚀 **Ready to Test**

```bash
npm run dev
```

### Test Flow:
1. Navigate to `/admin`
   - ✅ Should see launchpad list
   - ✅ Should see stats cards
   - ✅ Should see filters

2. Click "Create New Collection"
   - ✅ Should navigate to `/admin/add`
   - ✅ Should see Creator Studio

3. On list, click "Edit" for a collection
   - ✅ Should navigate to `/admin/0x...`
   - ✅ Should see collection details
   - ✅ Can change status
   - ✅ Save updates database

---

## 📝 **Notes**

- ✅ All launchpads from database are shown
- ✅ Multi-chain support (filter by chain)
- ✅ Real-time stats calculation
- ✅ Clean URLs: `/admin`, `/admin/add`, `/admin/0x123...`
- ✅ Responsive design (works on mobile)
- ✅ Fast filtering (client-side)

Perfect for managing NFT collections! 🎉
