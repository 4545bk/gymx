/**
 * Staff Service — Business logic for staff management.
 */
const bcrypt = require('bcrypt');
const Staff = require('../../models/Staff');
const Member = require('../../models/Member');

const SALT_ROUNDS = 12;

const createStaff = async (data) => {
  const existingEmail = await Staff.findOne({ email: data.email.toLowerCase() }).lean();
  if (existingEmail) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    err.code = 'EMAIL_ALREADY_EXISTS';
    throw err;
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const staffDoc = {
    fullName: data.fullName,
    email: data.email.toLowerCase(),
    phone: data.phone || null,
    role: data.role,
    passwordHash,
    salary: data.salary || {},
    trainerProfile: data.role === 'trainer' ? (data.trainerProfile || {}) : null,
  };

  const staff = await Staff.create(staffDoc);

  return {
    id: staff._id,
    fullName: staff.fullName,
    email: staff.email,
    phone: staff.phone,
    role: staff.role,
    status: staff.status,
    salary: staff.salary,
    trainerProfile: staff.trainerProfile,
    createdAt: staff.createdAt,
  };
};

const listStaff = async (query) => {
  const { role, status, page = 1, limit = 20 } = query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [staffList, total] = await Promise.all([
    Staff.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Staff.countDocuments(filter),
  ]);

  const data = staffList.map((s) => ({
    id: s._id,
    fullName: s.fullName,
    email: s.email,
    phone: s.phone,
    role: s.role,
    status: s.status,
    salary: s.salary,
    trainerProfile: s.trainerProfile,
    lastLoginAt: s.lastLoginAt,
    createdAt: s.createdAt,
  }));

  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

const getStaffById = async (staffId) => {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    const err = new Error('Staff not found');
    err.statusCode = 404;
    err.code = 'STAFF_NOT_FOUND';
    throw err;
  }
  return {
    id: staff._id,
    fullName: staff.fullName,
    email: staff.email,
    phone: staff.phone,
    role: staff.role,
    status: staff.status,
    salary: staff.salary,
    trainerProfile: staff.trainerProfile,
    lastLoginAt: staff.lastLoginAt,
    createdAt: staff.createdAt,
  };
};

const updateStaff = async (staffId, data) => {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    const err = new Error('Staff not found');
    err.statusCode = 404;
    err.code = 'STAFF_NOT_FOUND';
    throw err;
  }

  if (data.fullName) staff.fullName = data.fullName;
  if (data.phone !== undefined) staff.phone = data.phone;
  if (data.salary) Object.assign(staff.salary, data.salary);
  if (data.trainerProfile && staff.role === 'trainer') {
    if (!staff.trainerProfile) staff.trainerProfile = {};
    Object.assign(staff.trainerProfile, data.trainerProfile);
    if (data.trainerProfile.schedule) {
      Object.assign(staff.trainerProfile.schedule, data.trainerProfile.schedule);
    }
  }

  await staff.save();
  return staff;
};

const updateStatus = async (staffId, status) => {
  const staff = await Staff.findByIdAndUpdate(staffId, { status }, { new: true });
  if (!staff) {
    const err = new Error('Staff not found');
    err.statusCode = 404;
    err.code = 'STAFF_NOT_FOUND';
    throw err;
  }
  return { id: staff._id, status: staff.status };
};

const changePassword = async (staffId, currentPassword, newPassword, requestingStaff) => {
  const staff = await Staff.findById(staffId).select('+passwordHash');
  if (!staff) {
    const err = new Error('Staff not found');
    err.statusCode = 404;
    err.code = 'STAFF_NOT_FOUND';
    throw err;
  }

  // If not owner changing someone else's password, require currentPassword
  const isOwnerChangingOther = requestingStaff.role === 'owner' && 
    String(requestingStaff.id) !== String(staffId);

  if (!isOwnerChangingOther) {
    if (!currentPassword) {
      const err = new Error('Current password is required');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const isMatch = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!isMatch) {
      const err = new Error('Current password is incorrect');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }
  }

  staff.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  staff.refreshTokenHash = null; // Force re-login
  await staff.save();

  return { success: true };
};

const getTrainerMembers = async (staffId, requestingStaff) => {
  const staff = await Staff.findById(staffId).lean();
  if (!staff) {
    const err = new Error('Staff not found');
    err.statusCode = 404;
    err.code = 'STAFF_NOT_FOUND';
    throw err;
  }

  // Trainers can only see their own members
  if (requestingStaff.role === 'trainer' && String(requestingStaff.id) !== String(staffId)) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const members = await Member.find({ assignedTrainerId: staffId, status: 'active' })
    .select('memberId fullName status plan.type plan.expiryDate')
    .lean();

  return {
    trainer: { fullName: staff.fullName },
    members: members.map((m) => ({
      memberId: m.memberId,
      fullName: m.fullName,
      status: m.status,
      plan: { type: m.plan.type, expiryDate: m.plan.expiryDate },
    })),
  };
};

module.exports = {
  createStaff, listStaff, getStaffById, updateStaff,
  updateStatus, changePassword, getTrainerMembers,
};
