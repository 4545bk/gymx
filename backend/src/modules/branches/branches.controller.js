/**
 * Branches Controller — CRUD for multi-location support.
 * All operations are Owner-only.
 */
const Branch = require('../../models/Branch');
const crypto = require('crypto');

/**
 * List all branches for the gym.
 * GET /branches
 */
exports.list = async (req, res, next) => {
  try {
    const filter = { gymId: req.gymId || 'default' };
    if (req.query.active === 'true') filter.isActive = true;

    const branches = await Branch.find(filter).sort({ isHeadquarters: -1, name: 1 });
    res.json({ success: true, data: branches });
  } catch (err) { next(err); }
};

/**
 * Create a new branch.
 * POST /branches
 */
exports.create = async (req, res, next) => {
  try {
    const { name, address, phone, isHeadquarters } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { message: 'Branch name is required' } });

    const gymId = req.gymId || 'default';

    // If marking as HQ, unset existing HQ
    if (isHeadquarters) {
      await Branch.updateMany({ gymId, isHeadquarters: true }, { isHeadquarters: false });
    }

    const branch = await Branch.create({
      name,
      address,
      phone,
      gymId,
      isHeadquarters: isHeadquarters || false,
    });

    res.status(201).json({ success: true, data: branch });
  } catch (err) { next(err); }
};

/**
 * Update a branch.
 * PUT /branches/:id
 */
exports.update = async (req, res, next) => {
  try {
    const { name, address, phone, isActive, isHeadquarters } = req.body;
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, error: { message: 'Branch not found' } });

    if (name !== undefined) branch.name = name;
    if (address !== undefined) branch.address = address;
    if (phone !== undefined) branch.phone = phone;
    if (isActive !== undefined) branch.isActive = isActive;

    if (isHeadquarters) {
      await Branch.updateMany({ gymId: branch.gymId, isHeadquarters: true }, { isHeadquarters: false });
      branch.isHeadquarters = true;
    }

    await branch.save();
    res.json({ success: true, data: branch });
  } catch (err) { next(err); }
};

/**
 * Regenerate scanner API key for a branch.
 * POST /branches/:id/regenerate-key
 */
exports.regenerateKey = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, error: { message: 'Branch not found' } });

    branch.scannerApiKey = `branch-${crypto.randomBytes(16).toString('hex')}`;
    await branch.save();

    res.json({ success: true, data: { scannerApiKey: branch.scannerApiKey } });
  } catch (err) { next(err); }
};

/**
 * Get branch count for the gym (used by frontend to decide if branch switcher is needed).
 * GET /branches/count
 */
exports.count = async (req, res, next) => {
  try {
    const gymId = req.gymId || 'default';
    const count = await Branch.countDocuments({ gymId, isActive: true });
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
};
