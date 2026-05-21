/**
 * Branch Filter Middleware.
 * 
 * Reads the `x-branch-id` header (set by the frontend branch context)
 * and attaches `req.branchFilter` for use in queries.
 *
 * Rules:
 *   - Owner with no branch header → no filter (sees all branches)
 *   - Owner with branch header → filters to that branch
 *   - Non-owner staff → filters to their assignedBranches (ignores header if not in list)
 *   - If staff has no assignedBranches → no filter (backwards compat for single-branch)
 *
 * Usage in controllers:
 *   const filter = { ...req.branchFilter, status: 'active' };
 *   const members = await Member.find(filter);
 */
const branchFilter = (req, res, next) => {
  const branchHeader = req.headers['x-branch-id'];
  
  // Default: no branch filter
  req.branchFilter = {};
  req.currentBranchId = null;

  if (!req.staff) return next(); // No auth context, skip

  const { role } = req.staff;
  const assignedBranches = req.staff.assignedBranches || [];

  if (role === 'owner') {
    // Owner can filter by any branch or see all
    if (branchHeader && branchHeader !== 'all') {
      req.branchFilter = { branchId: branchHeader };
      req.currentBranchId = branchHeader;
    }
    // else: no filter → sees all branches
  } else if (assignedBranches.length > 0) {
    // Non-owner staff scoped to assigned branches
    if (branchHeader && assignedBranches.includes(branchHeader)) {
      req.branchFilter = { branchId: branchHeader };
      req.currentBranchId = branchHeader;
    } else {
      // Default to first assigned branch
      req.branchFilter = { branchId: { $in: assignedBranches } };
      req.currentBranchId = assignedBranches[0];
    }
  }
  // else: no assignedBranches → no filter (single-branch backwards compat)

  next();
};

module.exports = branchFilter;
