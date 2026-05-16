/**
 * Demo Seed Script — Generates realistic gym demo data.
 * Run: node src/scripts/seedDemo.js
 *
 * Creates:
 *   - 1 owner + 2 staff (receptionist + trainer)
 *   - 40 members (active, expired, suspended, frozen, various payment states)
 *   - 6 products with stock
 *   - 3 months of attendance history
 *   - 3 months of payment history
 *   - Sales history
 *   - Active alerts
 *
 * IMPORTANT: This wipes existing data. Run only for demos.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { MONGODB_URI } = require('../config/env');

const Staff = require('../models/Staff');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');

const SALT = 12;

// ─── Ethiopian Names Pool ─────────────────────────────────
const FIRST_NAMES = [
  'Abebe','Dawit','Yonas','Bereket','Henok','Ermias','Nahom','Samuel','Eyob','Kidus',
  'Mekdes','Tigist','Hana','Selam','Meron','Bethlehem','Rahel','Yordanos','Feven','Kidist',
  'Amanuel','Biniam','Dereje','Fikru','Getachew','Habtamu','Kiros','Lemma','Mulugeta','Tesfaye',
  'Almaz','Aster','Bezawit','Chaltu','Eden','Fikirte','Genet','Helen','Konjit','Liya',
];
const LAST_NAMES = [
  'Tesfaye','Bekele','Haile','Kebede','Girma','Abebe','Mulatu','Tadesse','Mekonnen','Wolde',
  'Gebremedhin','Tekle','Assefa','Berhane','Desta','Endale','Fikre','Getahun','Kassa','Negash',
];
const PHONE_PREFIX = '09';

const genId = () => `MBR-${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8)}`;
const genPhone = () => `${PHONE_PREFIX}${String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 8)}`;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const dateStr = (d) => d.toISOString().split('T')[0];

// ─── Main ─────────────────────────────────────────────────
async function seedDemo() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── Clear existing data ──
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      Staff.deleteMany({}), Member.deleteMany({}), Attendance.deleteMany({}),
      Payment.deleteMany({}), Product.deleteMany({}), Sale.deleteMany({}),
      Alert.deleteMany({}), Settings.deleteMany({}),
    ]);

    // ── Settings ──
    await Settings.create({ gymId: 'default', gymName: 'GymX Fitness Center', tagline: 'Train Hard. Stay Consistent.', phone: '0911234567', email: 'info@gymx.com', address: 'Bole, Addis Ababa' });

    // ── Staff ──
    console.log('👥 Creating staff...');
    const hash = await bcrypt.hash('OwnerPass123!', SALT);
    const recHash = await bcrypt.hash('Reception123!', SALT);
    const trainHash = await bcrypt.hash('Trainer123!', SALT);

    const owner = await Staff.create({ fullName: 'Biruh Tesfaye', email: 'owner@gymx.com', phone: '0911000001', role: 'owner', passwordHash: hash, status: 'active', salary: { amount: 0, currency: 'ETB', paymentDay: 30 } });
    const receptionist = await Staff.create({ fullName: 'Meron Bekele', email: 'reception@gymx.com', phone: '0911000002', role: 'receptionist', passwordHash: recHash, status: 'active', salary: { amount: 800000, currency: 'ETB', paymentDay: 30 } });
    const trainer = await Staff.create({ fullName: 'Dawit Haile', email: 'trainer@gymx.com', phone: '0911000003', role: 'trainer', passwordHash: trainHash, status: 'active', salary: { amount: 1200000, currency: 'ETB', paymentDay: 30 } });

    console.log('   owner@gymx.com / OwnerPass123!');
    console.log('   reception@gymx.com / Reception123!');
    console.log('   trainer@gymx.com / Trainer123!\n');

    // ── Products ──
    console.log('📦 Creating products...');
    const products = await Product.insertMany([
      { name: 'Whey Protein (1kg)', sku: 'SUPP-001', category: 'supplements', sellingPrice: 350000, costPrice: 280000, stock: 24, minStockThreshold: 5, status: 'active', createdBy: owner._id },
      { name: 'BCAA Capsules', sku: 'SUPP-002', category: 'supplements', sellingPrice: 120000, costPrice: 80000, stock: 35, minStockThreshold: 10, status: 'active', createdBy: owner._id },
      { name: 'Energy Drink', sku: 'DRK-001', category: 'drinks', sellingPrice: 8000, costPrice: 5000, stock: 120, minStockThreshold: 20, status: 'active', createdBy: owner._id },
      { name: 'Gym Gloves (Pair)', sku: 'ACC-001', category: 'accessories', sellingPrice: 45000, costPrice: 30000, stock: 18, minStockThreshold: 5, status: 'active', createdBy: owner._id },
      { name: 'GymX T-Shirt', sku: 'APP-001', category: 'apparel', sellingPrice: 65000, costPrice: 35000, stock: 3, minStockThreshold: 5, status: 'active', createdBy: owner._id },
      { name: 'Water Bottle (750ml)', sku: 'ACC-002', category: 'accessories', sellingPrice: 25000, costPrice: 15000, stock: 42, minStockThreshold: 10, status: 'active', createdBy: owner._id },
    ]);

    // ── Members ──
    console.log('🏋️ Creating 40 members...');
    const usedPhones = new Set();
    const members = [];

    // Distribution: 25 active, 7 expired, 4 suspended, 2 frozen, 2 3-day plan
    const memberConfigs = [
      // Active, fully paid (15)
      ...Array(15).fill(null).map(() => ({ status: 'active', paymentStatus: 'paid', planType: 'full-week', expiredDaysAgo: null, startDaysAgo: randInt(5, 80) })),
      // Active, partially paid (5)
      ...Array(5).fill(null).map(() => ({ status: 'active', paymentStatus: 'partial', planType: 'full-week', expiredDaysAgo: null, startDaysAgo: randInt(10, 60) })),
      // Active, unpaid (3)
      ...Array(3).fill(null).map(() => ({ status: 'active', paymentStatus: 'unpaid', planType: 'full-week', expiredDaysAgo: null, startDaysAgo: randInt(5, 40) })),
      // Active, overdue (2)
      ...Array(2).fill(null).map(() => ({ status: 'active', paymentStatus: 'overdue', planType: 'full-week', expiredDaysAgo: null, startDaysAgo: randInt(20, 50) })),
      // Active, 3-day plan (2)
      ...Array(2).fill(null).map(() => ({ status: 'active', paymentStatus: 'paid', planType: '3-day', expiredDaysAgo: null, startDaysAgo: randInt(10, 40) })),
      // Expired (7)
      ...Array(7).fill(null).map(() => ({ status: 'expired', paymentStatus: 'paid', planType: 'full-week', expiredDaysAgo: randInt(1, 20), startDaysAgo: null })),
      // Suspended (4)
      ...Array(4).fill(null).map(() => ({ status: 'suspended', paymentStatus: 'overdue', planType: 'full-week', expiredDaysAgo: null, startDaysAgo: randInt(30, 60) })),
      // Frozen (2) — requested freeze
      ...Array(2).fill(null).map(() => ({ status: 'frozen', paymentStatus: 'paid', planType: 'full-week', expiredDaysAgo: null, startDaysAgo: randInt(20, 50) })),
    ];

    for (let i = 0; i < memberConfigs.length; i++) {
      const cfg = memberConfigs[i];
      let phone;
      do { phone = genPhone(); } while (usedPhones.has(phone));
      usedPhones.add(phone);

      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = pick(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;

      // Plan dates
      let startDate, expiryDate;
      if (cfg.status === 'expired') {
        expiryDate = daysAgo(cfg.expiredDaysAgo);
        startDate = new Date(expiryDate); startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate = daysAgo(cfg.startDaysAgo);
        expiryDate = new Date(startDate); expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      // Billing
      const planPrice = cfg.planType === '3-day' ? 60000 : 100000; // 600 or 1000 ETB
      let amountPaid = 0;
      if (cfg.paymentStatus === 'paid') amountPaid = planPrice;
      else if (cfg.paymentStatus === 'partial') amountPaid = Math.floor(planPrice * 0.5);
      else amountPaid = 0;

      const member = await Member.create({
        memberId: genId(),
        fullName,
        phone,
        plan: {
          type: cfg.planType,
          allowedDays: cfg.planType === '3-day' ? [1, 3, 5] : null,
          startDate, expiryDate, durationMonths: 1,
        },
        status: cfg.status,
        paymentStatus: cfg.paymentStatus,
        billing: {
          totalDue: planPrice, amountPaid,
          remainingBalance: planPrice - amountPaid,
          lastPaymentDate: amountPaid > 0 ? startDate : null,
          lastPaymentAmount: amountPaid,
          paymentCount: amountPaid > 0 ? 1 : 0,
        },
        emergencyContact: { name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, phone: genPhone() },
        assignedTrainerId: i % 3 === 0 ? trainer._id : null,
        registeredBy: i % 2 === 0 ? owner._id : receptionist._id,
        card: i < 20 ? { issuedAt: daysAgo(randInt(1, 60)), printCount: 1, lastPrintedBy: receptionist._id } : {},
        createdAt: daysAgo(randInt(5, 90)),
      });
      members.push(member);
    }

    // ── Attendance (3 months) ──
    console.log('📅 Generating attendance history...');
    const attendanceDocs = [];
    const activeMembers = members.filter(m => m.status === 'active' || m.status === 'expired');

    for (let day = 90; day >= 0; day--) {
      const date = daysAgo(day);
      const dateString = dateStr(date);
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // ISO weekday

      // 40-70% of active members check in each day
      const checkinRate = 0.4 + Math.random() * 0.3;
      const shuffled = activeMembers.sort(() => Math.random() - 0.5);
      const checkingIn = shuffled.slice(0, Math.floor(shuffled.length * checkinRate));

      for (const m of checkingIn) {
        const hour = randInt(6, 21);
        const minute = randInt(0, 59);
        const checkedInAt = new Date(date); checkedInAt.setHours(hour, minute, 0, 0);

        const isWrongDay = m.plan.type === '3-day' && !m.plan.allowedDays.includes(dayOfWeek);
        attendanceDocs.push({
          memberId: m.memberId,
          memberRef: m._id,
          checkedInAt,
          date: dateString,
          status: isWrongDay ? 'denied' : 'granted',
          denyReason: isWrongDay ? 'wrong-day' : null,
          planSnapshot: { type: m.plan.type, expiryDate: m.plan.expiryDate },
        });
      }
    }

    // Batch insert (skip duplicates)
    if (attendanceDocs.length > 0) {
      await Attendance.insertMany(attendanceDocs, { ordered: false }).catch(() => {});
    }
    console.log(`   ${attendanceDocs.length} attendance records\n`);

    // ── Payments (3 months) ──
    console.log('💰 Generating payment history...');
    const paymentDocs = [];
    const now = new Date();

    // Membership payments
    for (const m of members) {
      if (m.billing.amountPaid > 0) {
        const payDate = new Date(m.plan.startDate);
        paymentDocs.push({
          type: 'membership', direction: 'in',
          memberRef: m._id, memberName: m.fullName, planType: m.plan.type,
          description: `Membership payment — ${m.fullName}`,
          amount: m.billing.amountPaid, paymentMethod: pick(['cash', 'bank-transfer']),
          period: { month: payDate.getMonth() + 1, year: payDate.getFullYear() },
          recordedBy: receptionist._id, recordedAt: payDate,
        });
      }
    }

    // Expenses (past 3 months)
    const expenses = [
      { desc: 'Electricity bill', cat: 'utilities', amount: 450000 },
      { desc: 'Water bill', cat: 'utilities', amount: 120000 },
      { desc: 'Equipment maintenance', cat: 'equipment', amount: 800000 },
      { desc: 'Cleaning supplies', cat: 'other', amount: 150000 },
      { desc: 'New dumbbells (set)', cat: 'equipment', amount: 2500000 },
      { desc: 'Receptionist salary — Meron', cat: 'salary', amount: 800000, staffRef: receptionist._id },
      { desc: 'Trainer salary — Dawit', cat: 'salary', amount: 1200000, staffRef: trainer._id },
    ];

    for (let month = 0; month < 3; month++) {
      const d = new Date(); d.setMonth(d.getMonth() - month);
      const expenseSubset = month === 0 ? expenses : expenses.slice(0, 5); // All expenses current month, fewer before
      for (const exp of expenseSubset) {
        const payDate = new Date(d.getFullYear(), d.getMonth(), randInt(1, 28));
        paymentDocs.push({
          type: exp.cat === 'salary' ? 'salary' : 'expense', direction: 'out',
          description: exp.desc, amount: exp.amount,
          expenseCategory: exp.cat, staffRef: exp.staffRef || null,
          paymentMethod: 'bank-transfer',
          period: { month: payDate.getMonth() + 1, year: payDate.getFullYear() },
          recordedBy: owner._id, recordedAt: payDate,
        });
      }
    }

    await Payment.insertMany(paymentDocs);
    console.log(`   ${paymentDocs.length} payments\n`);

    // ── Sales ──
    console.log('🛒 Generating sales...');
    const saleDocs = [];
    for (let i = 0; i < 25; i++) {
      const saleDate = daysAgo(randInt(0, 60));
      const prod = pick(products);
      const qty = randInt(1, 3);
      const lineTotal = prod.sellingPrice * qty;
      const num = `SL-${dateStr(saleDate).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;
      saleDocs.push({
        saleNumber: num,
        items: [{ productRef: prod._id, productName: prod.name, sku: prod.sku, quantity: qty, unitPrice: prod.sellingPrice, lineTotal }],
        subtotal: lineTotal, discount: 0, total: lineTotal,
        paymentMethod: pick(['cash', 'bank-transfer']),
        soldBy: pick([owner._id, receptionist._id]),
        soldByName: pick(['Biruh Tesfaye', 'Meron Bekele']),
        saleDate,
      });
    }
    await Sale.insertMany(saleDocs);
    console.log(`   ${saleDocs.length} sales\n`);

    // ── Alerts ──
    console.log('🔔 Generating alerts...');
    const alertDocs = [];
    const expiringMembers = members.filter(m => m.status === 'active').slice(0, 4);
    const expiredMembers = members.filter(m => m.status === 'expired').slice(0, 3);
    const overdueMembers = members.filter(m => m.paymentStatus === 'overdue');

    for (const m of expiringMembers) {
      alertDocs.push({ type: 'membership-expiring', severity: 'warning', subjectType: 'member', subjectRef: m._id, subjectName: m.fullName, message: `${m.fullName}'s membership expires soon`, visibleTo: ['owner', 'receptionist'], expiresAt: daysAgo(-14) });
    }
    for (const m of expiredMembers) {
      alertDocs.push({ type: 'membership-expired', severity: 'critical', subjectType: 'member', subjectRef: m._id, subjectName: m.fullName, message: `${m.fullName}'s membership has expired`, visibleTo: ['owner', 'receptionist'], expiresAt: daysAgo(-14) });
    }
    for (const m of overdueMembers) {
      alertDocs.push({ type: 'payment-overdue', severity: 'critical', subjectType: 'member', subjectRef: m._id, subjectName: m.fullName, message: `${m.fullName} has overdue payment of ${(m.billing.remainingBalance / 100).toLocaleString()} ETB`, visibleTo: ['owner', 'receptionist'], expiresAt: daysAgo(-30) });
    }
    // Low stock alert
    alertDocs.push({ type: 'maintenance-due', severity: 'warning', subjectType: 'equipment', subjectRef: owner._id, subjectName: 'GymX T-Shirt', message: 'GymX T-Shirt stock is low (3 remaining)', visibleTo: ['owner', 'receptionist'], expiresAt: daysAgo(-14) });

    await Alert.insertMany(alertDocs);
    console.log(`   ${alertDocs.length} alerts\n`);

    // ── Summary ──
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ DEMO DATA SEEDED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Staff:      3 (owner, receptionist, trainer)`);
    console.log(`   Members:    ${members.length}`);
    console.log(`   Attendance: ${attendanceDocs.length} records`);
    console.log(`   Payments:   ${paymentDocs.length} records`);
    console.log(`   Products:   ${products.length}`);
    console.log(`   Sales:      ${saleDocs.length}`);
    console.log(`   Alerts:     ${alertDocs.length}`);
    console.log('');
    console.log('📋 Login credentials:');
    console.log('   Owner:        owner@gymx.com / OwnerPass123!');
    console.log('   Receptionist: reception@gymx.com / Reception123!');
    console.log('   Trainer:      trainer@gymx.com / Trainer123!');
    console.log('');
    console.log('🏋️ Sample Member IDs for check-in testing:');
    members.filter(m => m.status === 'active').slice(0, 5).forEach(m => {
      console.log(`   ${m.memberId}  ${m.fullName} (${m.plan.type}, ${m.paymentStatus})`);
    });
    const expired = members.find(m => m.status === 'expired');
    if (expired) console.log(`   ${expired.memberId}  ${expired.fullName} (EXPIRED — will deny)`);
    const threeDayMember = members.find(m => m.plan.type === '3-day');
    if (threeDayMember) console.log(`   ${threeDayMember.memberId}  ${threeDayMember.fullName} (3-day plan — may deny)`);
    console.log('═══════════════════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seedDemo();
