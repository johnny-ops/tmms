# 🚦 TMMS Complete System Testing Guide

Welcome to the **Traffic Management & Monitoring System (TMMS)**. This guide will walk you through a complete end-to-end test of the system to ensure all features are working flawlessly, including the fixes we recently applied.

> [!IMPORTANT]
> **Prerequisites before testing:**
> 1. Make sure you have run the `fix_roles.sql` script in your Supabase SQL Editor. This is required for roles to be saved correctly in the database.
> 2. Ensure your local dev servers are running (AI Service and Website).

---

## 🏎️ Phase 1: Driver Registration & View
First, we'll create a new driver to ensure the system handles new users correctly without showing other people's data.

1. **Register**
   - Go to `http://localhost:5173/register`
   - Select **DRIVER** as the account type.
   - Fill in some test details (e.g., Name: *John Doe*, License: `TEST-DRV-001`).
   - Click Register.
2. **Verify Dashboard**
   - You should be immediately redirected to the Driver Dashboard.
   - Verify that **My Vehicles** and **Violations** show *Empty States* (no seed data should leak here).
3. **Log Out**
   - Click the logout icon in the bottom left corner to prepare for the next phase.

---

## 🏢 Phase 2: Operator Registration & Fleet Assignment
Next, we'll test the Operator flow and assign the driver we just created to this operator's fleet.

1. **Register**
   - Go to `http://localhost:5173/register`
   - Select **OPERATOR** as the account type.
   - Fill in details (e.g., Name: *City Transit Corp*).
2. **Verify Clean Slate**
   - Navigate through **Dashboard**, **My Vehicles**, **Assigned Drivers**, and **Vehicle Status**.
   - Verify that all pages show the new clean empty states (e.g., "Your fleet has a clean record").
3. **Assign a Driver**
   - Go to the **Assigned Drivers** page on the sidebar.
   - Click the blue **+ Assign Driver** button at the top right.
   - Enter the exact license number you used in Phase 1 (`TEST-DRV-001`).
   - Click **Assign Driver**.
   - **Result**: The driver should now appear beautifully formatted in your table!
4. **Test Assignment Constraints**
   - Try assigning the *exact same* license number again. 
   - **Result**: The system should reject it with an error saying the driver is already assigned.

---

## 🚨 Phase 3: AI Violation Pipeline (Backend)
This tests the Python AI Service. Since operators cannot manually add vehicles yet through the UI, we assume you'll be using existing seeded vehicles for this test.

1. **Trigger the AI Camera**
   - Open a terminal and use `curl` or Postman to send a POST request to your AI service (usually `http://localhost:8001/api/v1/process-frame`).
   - Pass in a test payload containing a vehicle plate (e.g., `ABC-1234`) and an image.
2. **Verify AI Candidate**
   - Log into the Supabase Dashboard and check the `ai_violation_candidates` table.
   - You should see a new row representing the flagged vehicle.

---

## 👮 Phase 4: Admin / Staff Management
*(Note: To test this, you must log in with the admin credentials found in your seed data, e.g., admin@govserve.com)*

1. **Verify AI Violations**
   - As an Admin, go to the AI verification page.
   - You should see the candidate generated in Phase 3.
   - Approve the candidate to convert it into a real `traffic_ticket`.
2. **Manage Users**
   - Go to **User Management**.
   - Verify that you can see your newly registered Driver and Operator in the table.
   - Verify that you can successfully click the red Trash icon to delete a user.

---

## 💳 Phase 5: Ticketing & Resolution
To finish the cycle, the Operator or Driver needs to see the ticket and resolve it.

1. **View the Ticket**
   - Log back in as the Operator who owns the vehicle `ABC-1234` (Seed data operator).
   - Go to **Violation Records**.
   - You should see the new ticket created in Phase 4. It should have a red **UNPAID** badge.
2. **Check Vehicle Status**
   - Go to **Vehicle Status**.
   - Depending on the violation severity, the vehicle `ABC-1234` might now be marked as `SUSPENDED` or require action.

**🎉 If all these steps pass, your TMMS system is fully operational and secure!**
