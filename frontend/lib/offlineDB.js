/**
 * GymX Offline Database — IndexedDB storage for offline check-in.
 * 
 * Stores:
 *   - members: Full member cache for offline verification
 *   - pendingCheckins: Queued check-ins to sync when online
 *   - meta: Last sync timestamp and status
 */

const DB_NAME = 'gymx-offline';
const DB_VERSION = 1;

let db = null;

/**
 * Open/initialize the IndexedDB database.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Members store — keyed by memberId
      if (!database.objectStoreNames.contains('members')) {
        database.createObjectStore('members', { keyPath: 'memberId' });
      }

      // Pending check-ins — auto-increment ID
      if (!database.objectStoreNames.contains('pendingCheckins')) {
        database.createObjectStore('pendingCheckins', { keyPath: 'id', autoIncrement: true });
      }

      // Meta store — sync timestamps etc
      if (!database.objectStoreNames.contains('meta')) {
        database.createObjectStore('meta', { keyPath: 'key' });
      }

      // Offline check-in log (for duplicate detection)
      if (!database.objectStoreNames.contains('todayCheckins')) {
        database.createObjectStore('todayCheckins', { keyPath: 'memberId' });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Cache all members from the API into IndexedDB.
 * Called on login and periodically while online.
 */
export async function syncMembersToOffline(apiInstance) {
  try {
    const database = await openDB();

    // Fetch all active members with plan details
    const { data } = await apiInstance.get('/members?limit=5000&status=active');
    const members = data?.data || [];

    const tx = database.transaction('members', 'readwrite');
    const store = tx.objectStore('members');

    // Clear old data and insert fresh
    store.clear();

    for (const m of members) {
      store.put({
        memberId: m.memberId,
        fullName: m.fullName,
        status: m.status,
        plan: {
          type: m.plan?.type,
          allowedDays: m.plan?.allowedDays || null,
          expiryDate: m.plan?.expiryDate,
          daysRemaining: m.plan?.daysRemaining,
        },
      });
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    // Update sync timestamp
    const metaTx = database.transaction('meta', 'readwrite');
    metaTx.objectStore('meta').put({
      key: 'lastSync',
      timestamp: new Date().toISOString(),
      memberCount: members.length,
    });

    console.log(`✅ Offline DB synced: ${members.length} members`);
    return members.length;
  } catch (err) {
    console.warn('⚠️ Offline sync failed:', err.message);
    return -1;
  }
}

/**
 * Look up a member from IndexedDB for offline verification.
 */
export async function getOfflineMember(memberId) {
  try {
    const database = await openDB();
    const tx = database.transaction('members', 'readonly');
    const store = tx.objectStore('members');

    return new Promise((resolve) => {
      const request = store.get(memberId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Perform offline check-in verification.
 * Replicates the backend's 12-step flow locally.
 */
export async function offlineCheckin(memberId) {
  const MEMBER_ID_REGEX = /^MBR-[A-Z0-9]{8}$/;

  // Step 3: Validate format
  if (!MEMBER_ID_REGEX.test(memberId)) {
    return {
      result: 'denied',
      denyReason: 'invalid-format',
      message: 'Invalid QR code format',
      offline: true,
    };
  }

  // Step 5: Local lookup
  const member = await getOfflineMember(memberId);
  if (!member) {
    return {
      result: 'denied',
      denyReason: 'unknown-id',
      message: 'Member not found in offline database',
      offline: true,
    };
  }

  // Step 6: Check status
  if (member.status !== 'active') {
    return {
      result: 'denied',
      denyReason: member.status,
      message: `Membership is ${member.status}`,
      member: { fullName: member.fullName },
      offline: true,
    };
  }

  // Step 7: Check expiry
  const now = new Date();
  const expiry = new Date(member.plan.expiryDate);
  if (now > expiry) {
    return {
      result: 'denied',
      denyReason: 'expired',
      message: `Membership expired on ${expiry.toISOString().split('T')[0]}`,
      member: { fullName: member.fullName },
      offline: true,
    };
  }

  // Step 8: Check allowed days (3-day plan)
  if (member.plan.type === '3-day') {
    const todayWeekday = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon, 7=Sun
    if (member.plan.allowedDays && !member.plan.allowedDays.includes(todayWeekday)) {
      const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const nextDays = member.plan.allowedDays.map(d => dayNames[d]).join(', ');
      return {
        result: 'denied',
        denyReason: 'wrong-day',
        message: `3-day plan. Allowed days: ${nextDays}`,
        member: { fullName: member.fullName },
        offline: true,
      };
    }
  }

  // Step 9: Duplicate check (local)
  const alreadyCheckedIn = await checkDuplicateOffline(memberId);
  if (alreadyCheckedIn) {
    return {
      result: 'denied',
      denyReason: 'duplicate',
      message: 'Already checked in today (offline record)',
      member: { fullName: member.fullName },
      offline: true,
    };
  }

  // ✅ GRANTED — record locally and queue for sync
  const checkedInAt = new Date().toISOString();
  await recordOfflineCheckin(memberId, member.fullName, checkedInAt);
  await markCheckedInToday(memberId);

  const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  return {
    result: 'granted',
    member: {
      fullName: member.fullName,
      planType: member.plan.type,
      expiryDate: expiry.toISOString().split('T')[0],
      expiringSoon: daysRemaining <= 5,
    },
    checkedInAt,
    offline: true,
  };
}

/**
 * Check if member already checked in today (offline).
 */
async function checkDuplicateOffline(memberId) {
  try {
    const database = await openDB();
    const tx = database.transaction('todayCheckins', 'readonly');
    const store = tx.objectStore('todayCheckins');

    return new Promise((resolve) => {
      const request = store.get(memberId);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Mark a member as checked-in today (offline duplicate prevention).
 */
async function markCheckedInToday(memberId) {
  try {
    const database = await openDB();
    const tx = database.transaction('todayCheckins', 'readwrite');
    tx.objectStore('todayCheckins').put({ memberId, date: new Date().toISOString().split('T')[0] });
  } catch (err) { /* ignore */ }
}

/**
 * Queue a check-in for later sync to the server.
 */
async function recordOfflineCheckin(memberId, fullName, checkedInAt) {
  try {
    const database = await openDB();
    const tx = database.transaction('pendingCheckins', 'readwrite');
    tx.objectStore('pendingCheckins').add({
      memberId,
      fullName,
      checkedInAt,
      synced: false,
    });
  } catch (err) {
    console.error('Failed to queue offline check-in:', err);
  }
}

/**
 * Sync pending offline check-ins to the server.
 * Sends offlineQueued: true and originalScannedAt so the backend records the correct time.
 * Treats HTTP 200 with result: 'duplicate' as a success (marks synced).
 * Tracks retry attempts — after 5 failures, marks as failed and skips.
 * Returns { synced, failed, skipped } counts.
 */
export async function syncPendingCheckins(scannerKey, apiBase) {
  try {
    const database = await openDB();
    const tx = database.transaction('pendingCheckins', 'readonly');
    const store = tx.objectStore('pendingCheckins');

    const pending = await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });

    if (pending.length === 0) return { synced: 0, failed: 0, skipped: 0 };

    let synced = 0;
    let failed = 0;
    let skipped = 0;

    // Process in chronological order
    const sorted = [...pending].sort((a, b) => {
      const tA = new Date(a.checkedInAt || 0).getTime();
      const tB = new Date(b.checkedInAt || 0).getTime();
      return tA - tB;
    });

    for (const checkin of sorted) {
      // Skip already-failed items (5+ attempts)
      if (checkin.attempts >= 5 || checkin.failed) {
        skipped++;
        continue;
      }

      try {
        const res = await fetch(`${apiBase}/checkin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-scanner-key': scannerKey,
          },
          body: JSON.stringify({
            memberId: checkin.memberId,
            offlineQueued: true,
            originalScannedAt: checkin.checkedInAt,
          }),
        });

        const data = await res.json();

        // Treat both success and duplicate as "synced" — remove from queue
        if (res.ok) {
          synced++;
          const delTx = database.transaction('pendingCheckins', 'readwrite');
          delTx.objectStore('pendingCheckins').delete(checkin.id);
        } else {
          throw new Error(`Server returned ${res.status}`);
        }
      } catch (err) {
        failed++;
        // Increment attempts counter
        const attempts = (checkin.attempts || 0) + 1;
        const updateTx = database.transaction('pendingCheckins', 'readwrite');
        updateTx.objectStore('pendingCheckins').put({
          ...checkin,
          attempts,
          failed: attempts >= 5,
        });
        if (attempts >= 5) {
          console.warn(`⚠️ Check-in for ${checkin.memberId} failed after 5 attempts, marking as failed`);
        }
      }
    }

    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed, ${skipped} skipped`);
    return { synced, failed, skipped };
  } catch (err) {
    console.error('Sync error:', err);
    return { synced: 0, failed: -1, skipped: 0 };
  }
}

/**
 * Get the number of pending (unsynced) check-ins.
 */
export async function getPendingCount() {
  try {
    const database = await openDB();
    const tx = database.transaction('pendingCheckins', 'readonly');
    const store = tx.objectStore('pendingCheckins');

    return new Promise((resolve) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  } catch (err) {
    return 0;
  }
}

/**
 * Get last sync info.
 */
export async function getLastSyncInfo() {
  try {
    const database = await openDB();
    const tx = database.transaction('meta', 'readonly');
    const store = tx.objectStore('meta');

    return new Promise((resolve) => {
      const request = store.get('lastSync');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Clear today's check-in records (called at midnight or on new day).
 */
export async function clearTodayCheckins() {
  try {
    const database = await openDB();
    const tx = database.transaction('todayCheckins', 'readwrite');
    tx.objectStore('todayCheckins').clear();
  } catch (err) { /* ignore */ }
}
