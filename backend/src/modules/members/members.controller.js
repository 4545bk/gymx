/**
 * Members Controller — Request/response handling.
 */
const membersService = require('./members.service');
const { generateMemberCard } = require('../../utils/cardGenerator');
const Member = require('../../models/Member');
const Settings = require('../../models/Settings');
const AuditLog = require('../../models/AuditLog');

const create = async (req, res, next) => {
  try {
    const member = await membersService.createMember(req.body, req.staff.id);
    res.status(201).json({ success: true, data: member });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await membersService.listMembers(req.query, req.staff.role, req.staff.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const member = await membersService.getMemberByMemberId(
      req.params.memberId, req.staff.role, req.staff.id
    );
    res.status(200).json({ success: true, data: member });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const member = await membersService.updateMember(req.params.memberId, req.body);
    res.status(200).json({ success: true, data: member });
  } catch (err) { next(err); }
};

const updatePlan = async (req, res, next) => {
  try {
    const result = await membersService.updatePlan(req.params.memberId, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const result = await membersService.updateStatus(req.params.memberId, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const getQR = async (req, res, next) => {
  try {
    const result = await membersService.getQRCode(req.params.memberId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const getAttendance = async (req, res, next) => {
  try {
    const result = await membersService.getMemberAttendance(
      req.params.memberId, req.query, req.staff.role, req.staff.id
    );
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await membersService.deleteMember(req.params.memberId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

/**
 * Download permanent membership ID card PDF.
 * - Tracks card issuance (issuedAt set ONCE on first print)
 * - Increments printCount on every print
 * - Writes audit log entry
 */
const downloadCard = async (req, res, next) => {
  try {
    // 1. Find member
    const member = await Member.findOne({ memberId: req.params.memberId });
    if (!member) {
      const err = new Error('Member not found');
      err.statusCode = 404;
      err.code = 'MEMBER_NOT_FOUND';
      throw err;
    }

    // 2. Fetch gym settings
    const settings = await Settings.findOne({ gymId: 'default' }).lean() || {};

    // 3. Generate the PDF buffer
    const pdfBuffer = await generateMemberCard(member, settings);

    // 4. Update card issuance tracking
    const isFirstPrint = !member.card?.issuedAt;
    if (isFirstPrint) {
      member.card = member.card || {};
      member.card.issuedAt = new Date();
    }
    member.card = member.card || {};
    member.card.printCount = (member.card.printCount || 0) + 1;
    member.card.lastPrintedBy = req.staff.id;
    await member.save();

    // 5. Audit log
    await AuditLog.create({
      action: 'CARD_PRINTED',
      entity: 'member',
      entityRef: member._id,
      entityName: member.fullName,
      metadata: {
        printCount: member.card.printCount,
        isFirstPrint,
      },
      performedBy: req.staff.id,
      performedByName: req.staff.fullName,
    });

    // 6. Send PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="GymX-Card-${member.memberId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(`[CARD_DOWNLOAD] Failed for member ${req.params.memberId}:`, err.message);
    next(err);
  }
};

/**
 * Upload or update member photo (base64 data URI).
 * Accepts { photoUrl: "data:image/jpeg;base64,..." }
 */
const uploadPhoto = async (req, res, next) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl && photoUrl !== null) {
      return res.status(400).json({ success: false, error: { message: 'photoUrl is required' } });
    }

    const member = await Member.findOne({ memberId: req.params.memberId });
    if (!member) {
      const err = new Error('Member not found');
      err.statusCode = 404;
      throw err;
    }

    member.photoUrl = photoUrl;
    await member.save();

    res.status(200).json({ success: true, data: { memberId: member.memberId, photoUrl: member.photoUrl } });
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne, update, updatePlan, updateStatus, getQR, getAttendance, remove, downloadCard, uploadPhoto };
