# CSV Enrichment - Do This First

Before any backend work can be tested with real data, the Nashville CSV needs to be enriched.
This blocks Lucas's import script.

**File to edit:** `nashville_template_tasks.csv` (in project root)

---

## Step 1 - Upload to Google Sheets

1. Go to [sheets.google.com](https://sheets.google.com)
2. File → Import → Upload `nashville_template_tasks.csv`
3. Make sure it opens with columns split correctly

---

## Step 2 - Fix Existing Column

The `verification_type` column needs its values renamed:

| Current value | Change to |
|---------------|-----------|
| `location_based_tracking` | `gps` |
| `ai_photo_verification` | `photo` |

---

## Step 3 - Add These New Columns

Add the following columns to the right of the existing ones:

### `vibe_tags`
Comma-separated, no spaces. Use values from this list only (keep it consistent):

`foodie`, `adventurous`, `chill`, `cultural`, `nightlife`, `music`, `outdoors`, `photography`, `social`, `history`, `active`, `romantic`

Use the category as a guide:

| Category | Suggested vibe_tags |
|----------|-------------------|
| food | `foodie` |
| bars | `nightlife,social` |
| music | `music,cultural` |
| photo spots | `photography,chill` |
| street art | `photography,adventurous` |
| museums | `cultural,history` |
| nature | `outdoors,chill` |
| active | `adventurous,outdoors` |
| cafes | `chill,foodie` |
| shopping | `chill` |

### `price_level`
Number 1-4:
- `1` = free or under $10
- `2` = $1-$10
- `3` = $10-$30
- `4` = $30+

### `avg_duration_minutes`
Estimated time in minutes to complete the task:
- Quick stop (coffee, photo): `20-30`
- Food/bar: `45-60`
- Museum/attraction: `60-90`
- Outdoor/active: `60-120`

### `lat` and `lng`
GPS coordinates for each location.
- Go to [maps.google.com](https://maps.google.com)
- Search the place
- Right-click on the pin → coordinates appear at the top (e.g. `36.1627, -86.7816`)
- `lat` = first number, `lng` = second number (negative for Nashville)

For tasks with no fixed location (e.g. "find a street performer"), leave `lat` and `lng` blank.

---

## Step 4 - Export and Replace

1. File → Download → Comma Separated Values (.csv)
2. Rename to `nashville_template_tasks.csv`
3. Replace the existing file in the project root
4. Commit and push

---

