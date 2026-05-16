/**
 * Settings Service — Business logic for gym configuration, plans, backup/restore.
 */
const Settings = require('../../models/Settings');
const MembershipPlan = require('../../models/MembershipPlan');
const AuditLog = require('../../models/AuditLog');
const mongoose = require('mongoose');

// ═════════════════════════════════════════════════════════
// SETTINGS
// ═════════════════════════════════════════════════════════

const getSettings = async () => {
  let settings = await Settings.findOne({ gymId: 'default' }).lean();
  if (!settings) {
    settings = await Settings.create({ gymId: 'default' });
    settings = settings.toObject();
  }
  return { ...settings, id: settings._id };
};

const updateSettings = async (data, staffId, staffName) => {
  const current = await getSettings();
  const before = { ...current };
  delete before._id; delete before.__v; delete before.id;

  const settings = await Settings.findOneAndUpdate(
    { gymId: 'default' },
    { $set: data },
    { new: true, upsert: true }
  ).lean();

  const after = {};
  Object.keys(data).forEach(k => { after[k] = data[k]; });

  await AuditLog.create({
    action: 'SETTINGS_UPDATED',
    entity: 'settings',
    entityRef: settings._id,
    entityName: 'System Settings',
    changes: { before: Object.fromEntries(Object.keys(data).map(k => [k, before[k]])), after },
    performedBy: staffId,
    performedByName: staffName,
  });

  return { ...settings, id: settings._id };
};

// ═════════════════════════════════════════════════════════
// MEMBERSHIP PLANS
// ═════════════════════════════════════════════════════════

const getPlans = async () => {
  const plans = await MembershipPlan.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  return plans.map(p => ({ ...p, id: p._id }));
};

const getActivePlans = async () => {
  const plans = await MembershipPlan.find({ status: 'active' }).sort({ sortOrder: 1 }).lean();
  return plans.map(p => ({ ...p, id: p._id }));
};

const createPlan = async (data, staffId, staffName) => {
  const existing = await MembershipPlan.findOne({ slug: data.slug });
  if (existing) {
    const err = new Error('A plan with this slug already exists');
    err.statusCode = 409;
    throw err;
  }

  const plan = await MembershipPlan.create({ ...data, createdBy: staffId });

  await AuditLog.create({
    action: 'PLAN_CREATED',
    entity: 'plan',
    entityRef: plan._id,
    entityName: plan.name,
    changes: { before: null, after: { name: plan.name, slug: plan.slug, price: plan.price, type: plan.type } },
    performedBy: staffId,
    performedByName: staffName,
  });

  return plan;
};

const updatePlan = async (planId, data, staffId, staffName) => {
  const plan = await MembershipPlan.findById(planId);
  if (!plan) { const err = new Error('Plan not found'); err.statusCode = 404; throw err; }

  const before = { name: plan.name, price: plan.price, status: plan.status, type: plan.type };
  Object.assign(plan, data);
  await plan.save();

  await AuditLog.create({
    action: 'PLAN_UPDATED',
    entity: 'plan',
    entityRef: plan._id,
    entityName: plan.name,
    changes: { before, after: { name: plan.name, price: plan.price, status: plan.status, type: plan.type } },
    performedBy: staffId,
    performedByName: staffName,
  });

  return plan;
};

const deletePlan = async (planId, staffId, staffName) => {
  const plan = await MembershipPlan.findById(planId);
  if (!plan) { const err = new Error('Plan not found'); err.statusCode = 404; throw err; }

  const name = plan.name;
  plan.status = 'inactive';
  await plan.save();

  await AuditLog.create({
    action: 'PLAN_DELETED',
    entity: 'plan',
    entityRef: plan._id,
    entityName: name,
    changes: { before: { status: 'active' }, after: { status: 'inactive' } },
    performedBy: staffId,
    performedByName: staffName,
  });

  return { success: true, message: `Plan "${name}" deactivated` };
};

// ═════════════════════════════════════════════════════════
// BACKUP — Pure Node.js JSON export (no mongodump dependency)
// ═════════════════════════════════════════════════════════

const BACKUP_COLLECTIONS = [
  'members', 'staffs', 'attendances', 'payments',
  'inventoryitems', 'alerts', 'products', 'sales',
  'inventorymovements', 'auditlogs', 'settings', 'membershipplans',
];

const createBackup = async (staffId, staffName) => {
  const backup = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    createdBy: staffName,
    gymxVersion: '1.0.0',
    collections: {},
  };

  // Export each collection
  for (const name of BACKUP_COLLECTIONS) {
    try {
      const collection = mongoose.connection.db.collection(name);
      const docs = await collection.find({}).toArray();
      backup.collections[name] = docs;
    } catch (err) {
      backup.collections[name] = []; // Collection may not exist yet
    }
  }

  // Update last backup timestamp
  await Settings.findOneAndUpdate(
    { gymId: 'default' },
    { lastBackupAt: new Date(), lastBackupBy: staffName },
    { upsert: true }
  );

  // Audit log
  await AuditLog.create({
    action: 'BACKUP_CREATED',
    entity: 'backup',
    entityRef: new mongoose.Types.ObjectId(),
    entityName: `Backup ${backup.createdAt}`,
    metadata: { collections: BACKUP_COLLECTIONS.length, createdAt: backup.createdAt },
    performedBy: staffId,
    performedByName: staffName,
  });

  return backup;
};

// ═════════════════════════════════════════════════════════
// RESTORE — Validates structure, then bulk-writes
// ═════════════════════════════════════════════════════════

const validateBackup = (data) => {
  if (!data || !data.version || !data.collections) {
    return { valid: false, error: 'Invalid backup file format' };
  }
  if (typeof data.collections !== 'object') {
    return { valid: false, error: 'Backup missing collections data' };
  }
  const collectionNames = Object.keys(data.collections);
  if (collectionNames.length === 0) {
    return { valid: false, error: 'Backup contains no collections' };
  }

  let totalDocs = 0;
  collectionNames.forEach(name => {
    totalDocs += (data.collections[name] || []).length;
  });

  return {
    valid: true,
    summary: {
      version: data.version,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      collections: collectionNames.length,
      totalDocuments: totalDocs,
      collectionDetails: collectionNames.map(name => ({
        name,
        count: (data.collections[name] || []).length,
      })),
    },
  };
};

const restoreBackup = async (backupData, staffId, staffName) => {
  const validation = validateBackup(backupData);
  if (!validation.valid) {
    const err = new Error(validation.error);
    err.statusCode = 400;
    throw err;
  }

  // Audit: restore started
  await AuditLog.create({
    action: 'RESTORE_STARTED',
    entity: 'backup',
    entityRef: new mongoose.Types.ObjectId(),
    entityName: `Restore from ${backupData.createdAt}`,
    metadata: validation.summary,
    performedBy: staffId,
    performedByName: staffName,
  });

  const results = {};

  for (const [name, docs] of Object.entries(backupData.collections)) {
    if (!docs || docs.length === 0) {
      results[name] = { restored: 0 };
      continue;
    }
    try {
      const collection = mongoose.connection.db.collection(name);
      await collection.deleteMany({});
      // Convert string _id back to ObjectId where applicable
      const prepared = docs.map(doc => {
        if (doc._id && typeof doc._id === 'string') {
          try { doc._id = new mongoose.Types.ObjectId(doc._id); } catch (e) { /* keep as string */ }
        }
        return doc;
      });
      await collection.insertMany(prepared, { ordered: false });
      results[name] = { restored: prepared.length };
    } catch (err) {
      results[name] = { error: err.message };
    }
  }

  // Audit: restore completed
  await AuditLog.create({
    action: 'RESTORE_COMPLETED',
    entity: 'backup',
    entityRef: new mongoose.Types.ObjectId(),
    entityName: `Restore from ${backupData.createdAt}`,
    metadata: { results },
    performedBy: staffId,
    performedByName: staffName,
  });

  return results;
};

// ═════════════════════════════════════════════════════════
// SEED DEFAULT PLANS (run on first startup)
// ═════════════════════════════════════════════════════════

const seedDefaultPlans = async () => {
  const count = await MembershipPlan.countDocuments();
  if (count > 0) return; // Already seeded

  const defaults = [
    { name: 'Full Week', slug: 'full-week', type: 'full-week', durationMonths: 1, price: 80000, allowedDays: null, sortOrder: 1 },
    { name: '3-Day Plan', slug: '3-day', type: '3-day', durationMonths: 1, price: 50000, allowedDays: [1, 3, 5], sortOrder: 2 },
    { name: 'Weekend Plan', slug: 'weekend', type: 'weekend', durationMonths: 1, price: 40000, allowedDays: [6, 7], sortOrder: 3 },
  ];

  await MembershipPlan.insertMany(defaults);
  console.log('✅ Default membership plans seeded');
};

module.exports = {
  getSettings, updateSettings,
  getPlans, getActivePlans, createPlan, updatePlan, deletePlan,
  createBackup, validateBackup, restoreBackup,
  seedDefaultPlans,
};
