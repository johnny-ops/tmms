# Fix Database Issues - Step by Step

## Problems Found:

1. ❌ **Inspections**: Missing `document_url` column
2. ❌ **Registrations**: Table doesn't exist
3. ❌ **Parking Areas**: Edit not working (permissions issue)
4. ❌ **Terminals**: Missing `route_id` column

---

## Solution: Run Database Setup SQL

### Step 1: Open Supabase SQL Editor

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar (database icon)
4. Click **"New query"**

### Step 2: Copy the SQL Script

1. Open the file: **`DATABASE_SETUP.sql`** (in your project root)
2. **Copy ALL the SQL code** (Ctrl+A, Ctrl+C)

### Step 3: Paste and Run

1. **Paste** the SQL code into the Supabase SQL Editor
2. Click **"Run"** button (bottom right)
3. Wait for execution (~5-10 seconds)

### Step 4: Verify Success

You should see a success message at the bottom:
```
✅ Database setup complete! All tables, columns, and policies created.
```

### Step 5: Check Tables

1. Go to **"Table Editor"** in Supabase (left sidebar)
2. Verify these tables exist:
   - ✅ inspections (with `document_url` column)
   - ✅ registrations
   - ✅ parking_areas
   - ✅ terminals (with `route_id` column)
   - ✅ vehicles
   - ✅ operators
   - ✅ drivers
   - ✅ routes
   - ✅ franchises
   - ✅ tickets
   - ✅ parking_slots
   - ✅ ai_detections
   - ✅ profiles

---

## What the SQL Script Does:

### 1. Creates Missing Tables
- `registrations` - Vehicle registration tracking
- Creates all other tables if they don't exist

### 2. Adds Missing Columns
- `inspections.document_url` - For document uploads
- `terminals.route_id` - For linking terminals to routes

### 3. Enables Row Level Security (RLS)
- Protects all tables with authentication

### 4. Creates RLS Policies
- Allows authenticated users to read/write data
- Prevents unauthorized access

### 5. Creates Indexes
- Improves query performance
- Speeds up searches and joins

---

## After Running the SQL

### Test Each Feature:

1. **Inspections**:
   - Go to Inspections page
   - Click "Add Record"
   - Should work without errors ✅

2. **Vehicle Registration**:
   - Go to Registrations page
   - Click "Add Record"
   - Should work without errors ✅

3. **Parking Areas**:
   - Go to Parking Areas page
   - Click "Edit" on any area
   - Should save successfully ✅

4. **Terminals**:
   - Go to Terminals page
   - Click "Add Terminal"
   - Should save successfully ✅

---

## If You Still Get Errors

### Error: "permission denied"

**Solution**: Check RLS policies
1. Go to Supabase → Authentication → Policies
2. Make sure policies exist for each table
3. Re-run the SQL script

### Error: "column does not exist"

**Solution**: The column wasn't added
1. Go to Supabase → Table Editor
2. Select the table (e.g., `inspections`)
3. Check if column exists (e.g., `document_url`)
4. If missing, re-run the SQL script

### Error: "table does not exist"

**Solution**: Table creation failed
1. Check SQL Editor for error messages
2. Look for red error text
3. Fix the error and re-run

---

## Alternative: Manual Column Addition

If the SQL script doesn't work, you can add columns manually:

### Add `document_url` to inspections:

1. Supabase → Table Editor → `inspections`
2. Click "New Column"
3. Fill in:
   - Name: `document_url`
   - Type: `text`
   - Default: (leave empty)
4. Click "Save"

### Add `route_id` to terminals:

1. Supabase → Table Editor → `terminals`
2. Click "New Column"
3. Fill in:
   - Name: `route_id`
   - Type: `text`
   - Default: (leave empty)
4. Click "Save"

---

## Important Notes

⚠️ **Backup First** (if you have production data):
1. Supabase → Database → Backups
2. Create a manual backup before running SQL

✅ **Safe to Run Multiple Times**:
- The SQL script uses `IF NOT EXISTS` checks
- Won't duplicate tables or columns
- Won't delete existing data

🔒 **Security**:
- RLS policies protect your data
- Only authenticated users can access
- Prevents unauthorized modifications

---

## Need Help?

If you encounter errors:
1. Copy the error message
2. Check which table/column is mentioned
3. Verify that table exists in Supabase
4. Make sure you're logged in to Supabase

Your app should work perfectly after running this SQL! 🚀
