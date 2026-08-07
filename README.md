# Finance Department Performance Dashboard

## What is included

- Live month-end workflow: **Preparation → Approval → Entry → Review**
- Imported recurring activities by person from `Infasco_Month-End_Dashboard.xlsx`
- **Alex P.** and **Akram L.** remain open so tasks can be added/removed/edited directly
- Head-office deliverables and historical monthly performance, including the original scoring:
  - 3 = on time and error-free
  - 2 = late < 1 hour / minor errors
  - 1 = late > 1 hour / errors requiring correction
  - 0 = not sent
- D+2 at 6:00 PM close target
- Browser reminders for tasks approaching their stage deadline
- Quality/correction log
- Manual JE and automation-opportunity log
- Improvement-action tracker
- JSON backup/import

## Recommended: shared live mode

This V1 has a small Node.js server and **no external packages**.

1. Install Node.js on the computer/server that will host the dashboard.
2. Open a command prompt in this folder.
3. Run:

   `node server.js`

4. Open:

   `http://localhost:8080`

Everyone who opens the same server address shares the same data. When someone completes a stage, the next stage becomes ready immediately and connected browsers refresh automatically.

For access from other computers on the same network, use the hosting computer's network IP, for example:

`http://192.168.1.25:8080`

Your IT/network rules may require allowing port 8080 through the Windows firewall.

## Notifications

Click **Enable notifications** in the dashboard and choose your name in the top-right Current User selector.

The dashboard will notify that browser when:
- an assigned stage is within the configured warning threshold;
- an assigned stage is overdue;
- a live update causes the next stage to become ready for that user.

The browser can be minimized/backgrounded. **True push while the browser/app is completely closed requires a Web Push provider, push subscriptions, and authentication; that is not included in this local V1.**

## Important security note

The included server is intended for an internal prototype / trusted network. It does not contain authentication or role-based access control. Do not expose it directly to the public internet.

For production use, the next deployment step should add:
- Microsoft Entra ID / company SSO;
- database storage instead of a JSON file;
- role permissions (preparer, approver, controller/admin);
- HTTPS;
- Web Push or Teams/email alerts if closed-app notifications are required;
- audit log of every update.

## Data files

`data/state.json` is the central live data store. Back it up regularly. The dashboard also has an **Export** button that downloads the current state as JSON.
