'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const en = {
  nav: { dashboard: "Dashboard", members: "Members", checkin: "Check-In", attendance: "Attendance", payments: "Payments", dues: "Dues", staff: "Staff", inventory: "Inventory", products: "Products", sales: "Sales", reports: "Reports", alerts: "Alerts", settings: "Settings", finance: "Finance", mobileScanner: "Mobile Scanner" },
  members: { title: "Members", addMember: "Add Member", search: "Search by name, ID, or phone...", filterAll: "All", filterActive: "Active", filterExpired: "Expired", filterSuspended: "Suspended", filterFrozen: "Frozen", filterOverdue: "Overdue", noMembers: "No members found", adjustFilters: "Try adjusting your search or filters", addFirst: "Add your first member to get started", memberSince: "Member since", expires: "Expires", recordPayment: "Record Payment", viewDetails: "View Details", changeStatus: "Change Status", editMember: "Edit Member", renewPlan: "Renew Plan", viewQR: "View QR Code", downloadCard: "Download Card", deleteMember: "Delete Member", showingOf: "Showing {start}\u2013{end} of {total} members", plan: "Plan", payment: "Payment", actions: "Actions", daysLeft: "{days}d left", expired: "Expired" },
  status: { active: "Active", expired: "Expired", suspended: "Suspended", frozen: "Frozen", paid: "Paid", partial: "Partial", unpaid: "Unpaid", overdue: "Overdue" },
  checkin: { accessGranted: "Access Granted", accessDenied: "Access Denied", readyToScan: "Ready to scan", todayActivity: "Today's Activity", checkinsToday: "check-ins today", reconnecting: "Reconnecting...", live: "Live", offline: "Offline", offlineMode: "OFFLINE MODE \u2014 Check-ins saved locally", noCheckinsYet: "No check-ins yet today", scanToStart: "Scan a QR code to get started", pending: "pending", justNow: "Just now", granted: "Granted", validating: "Validating...", backToDashboard: "Dashboard", denialExpired: "Membership Expired", denialSuspended: "Account Suspended", denialFrozen: "Account Frozen", denialWrongDay: "Not Allowed Today", denialDuplicate: "Already Checked In", denialInvalid: "Invalid QR Code", denialUnknown: "Unknown Member", denialError: "System Error" },
  common: { save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", view: "View", loading: "Loading...", error: "Something went wrong", retry: "Try again", retrying: "Retrying...", noData: "No data available", offline: "You appear to be offline. Some features may not work.", currency: "ETB", prev: "Prev", next: "Next", close: "Close", allPlans: "All Plans", member: "Member" },
  dashboard: { greeting_morning: "Good morning", greeting_afternoon: "Good afternoon", greeting_evening: "Good evening", activeMembers: "Active Members", todayCheckins: "Today's Check-ins", monthRevenue: "This Month's Revenue", outstandingDues: "Outstanding Dues", recentCheckins: "Recent Check-ins", viewAll: "View all", revenueChart: "Revenue Trend", memberStatus: "Member Status", noMemberData: "No member data", lastUpdated: "Updated {seconds}s ago", total: "Total" },
  settings: { title: "Settings", general: "General", plans: "Membership Plans", backup: "Backup & Restore" },
  dues: { title: "Membership Dues", paidMembers: "Paid Members", partialPayments: "Partial Payments", unpaidMembers: "Unpaid Members", overdueMembers: "Overdue", outstanding: "Outstanding", recordPayment: "Record Payment", paymentHistory: "Payment History" },
  sidebar: { operations: "Operations", financeMgmt: "Finance", management: "Management", insights: "Insights", system: "System", logout: "Logout", onlineStatus: "Online" },
};

const am = {
  nav: { dashboard: "\u12F3\u123D\u1266\u122D\u12F5", members: "\u12A0\u1263\u120B\u1275", checkin: "\u1218\u130D\u1262\u12EB", attendance: "\u1270\u1308\u129D\u1290\u1275", payments: "\u12AD\u134D\u12EB\u12CE\u127D", dues: "\u12CD\u12DD\u134D \u12AD\u134D\u12EB", staff: "\u1230\u122B\u1270\u129E\u127D", inventory: "\u12D5\u1243\u12CE\u127D", products: "\u121D\u122D\u1276\u127D", sales: "\u123D\u12EB\u132D", reports: "\u122A\u1356\u122D\u1276\u127D", alerts: "\u121B\u1235\u1320\u1295\u1240\u1242\u12EB", settings: "\u1245\u1295\u1265\u122E\u127D", finance: "\u134B\u12ED\u1293\u1295\u1235", mobileScanner: "ሞባይል ስካነር" },
  members: { title: "\u12A0\u1263\u120B\u1275", addMember: "\u12A0\u1263\u120D \u1328\u121D\u122D", search: "\u1260\u1235\u121D\u1363 \u1218\u1273\u12C8\u1242\u12EB \u12C8\u12ED\u121D \u1235\u120D\u12AD \u12ED\u134D\u1208\u1309...", filterAll: "\u1201\u1209\u121D", filterActive: "\u1295\u1241", filterExpired: "\u130A\u12DC \u12EB\u1208\u134C", filterSuspended: "\u1273\u130D\u12F7\u120D", filterFrozen: "\u1240\u12DD\u1245\u12DF\u120D", filterOverdue: "\u1260\u12D8\u1308\u12E8", noMembers: "\u121D\u1295\u121D \u12A0\u1263\u120D \u12A0\u120D\u1270\u1308\u129C\u121D", adjustFilters: "\u134D\u1208\u130B\u12CE\u1295 \u12C8\u12ED\u121D \u121B\u1323\u122A\u12EB\u12CE\u1295 \u12EB\u1235\u1270\u12AB\u12AD\u1209", addFirst: "\u12E8\u1218\u1300\u1218\u122A\u12EB \u12A0\u1263\u120D\u12CE\u1295 \u12ED\u1328\u121D\u1229", memberSince: "\u12A0\u1263\u120D \u12A8", expires: "\u12EB\u1260\u1243\u120D", recordPayment: "\u12AD\u134D\u12EB \u12ED\u1218\u12DD\u130D\u1261", viewDetails: "\u12DD\u122D\u12DD\u122D \u12ED\u1218\u120D\u12A8\u1271", changeStatus: "\u1201\u1294\u1273 \u12ED\u1240\u12ED\u1229", editMember: "\u12A0\u1263\u120D \u12EB\u122D\u1219", renewPlan: "\u12D5\u1245\u12F5 \u12EB\u12F5\u1231", viewQR: "QR \u12AE\u12F5 \u12ED\u1218\u120D\u12A8\u1271", downloadCard: "\u12AB\u122D\u12F5 \u12EB\u12CD\u122D\u12F1", deleteMember: "\u12A0\u1263\u120D \u12EB\u1235\u12C8\u130D\u12F1", showingOf: "{start}\u2013{end} \u12A8{total} \u12A0\u1263\u120B\u1275", plan: "\u12D5\u1245\u12F5", payment: "\u12AD\u134D\u12EB", actions: "\u1270\u130D\u1263\u122E\u127D", daysLeft: "{days} \u1240\u1295 \u1240\u1228", expired: "\u130A\u12DC \u12EB\u1208\u134C" },
  status: { active: "\u1295\u1241", expired: "\u130A\u12DC \u12EB\u1208\u134C", suspended: "\u1273\u130D\u12F7\u120D", frozen: "\u1240\u12DD\u1245\u12DF\u120D", paid: "\u1270\u12A8\u134D\u120F\u120D", partial: "\u1260\u12A8\u134A\u120D", unpaid: "\u12A0\u120D\u1270\u12A8\u1348\u1208\u121D", overdue: "\u1260\u12D8\u1308\u12E8" },
  checkin: { accessGranted: "\u1218\u130D\u1262\u12EB \u1270\u134C\u1245\u12F7\u120D", accessDenied: "\u1218\u130D\u1262\u12EB \u1270\u12A8\u120D\u12AD\u120F\u120D", readyToScan: "\u1208\u1235\u12AB\u1295 \u12DD\u130D\u1301", todayActivity: "\u12E8\u12DB\u122C \u1270\u130D\u1263\u122B\u1275", checkinsToday: "\u12E8\u12DB\u122C \u1218\u130D\u1262\u12EB\u12CE\u127D", reconnecting: "\u12A5\u1295\u12F0\u1308\u1293 \u1260\u121B\u1308\u1293\u1298\u1275 \u120B\u12ED...", live: "\u1240\u1325\u1273", offline: "\u12A8\u1218\u1235\u1218\u122D \u12CD\u132A", offlineMode: "\u12A8\u1218\u1235\u1218\u122D \u12CD\u132A \u2014 \u1218\u130D\u1262\u12EB\u12CE\u127D \u1260\u1266\u1273\u12CD \u1270\u1240\u121D\u1320\u12CB\u120D", noCheckinsYet: "\u12DB\u122C \u121D\u1295\u121D \u1218\u130D\u1262\u12EB \u12E8\u1208\u121D", scanToStart: "\u1208\u1218\u1300\u1218\u122D QR \u12AE\u12F5 \u12ED\u1243\u1299", pending: "\u1260\u1218\u1320\u1263\u1260\u1245 \u120B\u12ED", justNow: "\u12A0\u1201\u1295", granted: "\u1270\u134C\u1245\u12F7\u120D", validating: "\u1260\u121B\u1228\u130B\u1308\u1325 \u120B\u12ED...", backToDashboard: "\u12F3\u123D\u1266\u122D\u12F5", denialExpired: "\u12A0\u1263\u120D\u1290\u1275 \u130A\u12DC \u12A0\u120D\u134F\u120D", denialSuspended: "\u1218\u1208\u12EB \u1273\u130D\u12F7\u120D", denialFrozen: "\u1218\u1208\u12EB \u1240\u12DD\u1245\u12DF\u120D", denialWrongDay: "\u12DB\u122C \u12A0\u12ED\u134C\u1240\u12F5\u121D", denialDuplicate: "\u1240\u12F5\u121E \u1270\u1218\u12DD\u130D\u1267\u120D", denialInvalid: "\u120D\u12AD \u12EB\u120D\u1206\u1290 QR \u12AE\u12F5", denialUnknown: "\u12EB\u120D\u1273\u12C8\u1240 \u12A0\u1263\u120D", denialError: "\u12E8\u1235\u122D\u12D3\u1275 \u1235\u1205\u1270\u1275" },
  common: { save: "\u12A0\u1235\u1240\u121D\u1325", cancel: "\u1230\u122D\u12DD", delete: "\u12A0\u1325\u134B", edit: "\u12A0\u122D\u121D", view: "\u12ED\u1218\u120D\u12A8\u1271", loading: "\u1260\u1218\u132B\u1295 \u120B\u12ED...", error: "\u127D\u130D\u122D \u1270\u134C\u1325\u122F\u120D", retry: "\u12A5\u1295\u12F0\u1308\u1293 \u12ED\u121E\u12AD\u1229", retrying: "\u12A5\u1295\u12F0\u1308\u1293 \u1260\u1218\u121E\u12A8\u122D \u120B\u12ED...", noData: "\u121D\u1295\u121D \u1218\u1228\u1303 \u12E8\u1208\u121D", offline: "\u12A8\u1218\u1235\u1218\u122D \u12CD\u132A \u1290\u12CE\u1275\u1362 \u12A0\u1295\u12F3\u1295\u12F5 \u1263\u1205\u122A\u12EB\u1275 \u120B\u12ED\u1230\u1229 \u12ED\u127D\u120B\u1209\u1362", currency: "\u1265\u122D", prev: "\u1240\u12F3\u121A", next: "\u1240\u1323\u12ED", close: "\u12DD\u130B", allPlans: "\u1201\u1209\u121D \u12D5\u1245\u12F6\u127D", member: "\u12A0\u1263\u120D" },
  dashboard: { greeting_morning: "\u12A5\u1295\u12F0\u121D\u1295 \u12A0\u12F0\u1229", greeting_afternoon: "\u12A5\u1295\u12F0\u121D\u1295 \u12CB\u1209", greeting_evening: "\u12A5\u1295\u12F0\u121D\u1295 \u12A0\u1218\u1231", activeMembers: "\u1295\u1241 \u12A0\u1263\u120B\u1275", todayCheckins: "\u12E8\u12DB\u122C \u1218\u130D\u1262\u12EB\u12CE\u127D", monthRevenue: "\u12E8\u12DA\u1205 \u12C8\u122D \u1308\u1262", outstandingDues: "\u12EB\u120D\u1270\u12A8\u1348\u1208 \u12CD\u12DD\u134D", recentCheckins: "\u12E8\u1245\u122D\u1265 \u130A\u12DC \u1218\u130D\u1262\u12EB\u12CE\u127D", viewAll: "\u1201\u1209\u1295\u121D \u12ED\u1218\u120D\u12A8\u1271", revenueChart: "\u12E8\u1308\u1262 \u12A0\u12DD\u121B\u121A\u12EB", memberStatus: "\u12E8\u12A0\u1263\u120D \u1201\u1294\u1273", noMemberData: "\u12E8\u12A0\u1263\u120D \u1218\u1228\u1303 \u12E8\u1208\u121D", lastUpdated: "\u12A8{seconds} \u1230\u12A8\u1295\u12F5 \u1260\u134A\u1275", total: "\u1320\u1245\u120B\u120B" },
  settings: { title: "\u1245\u1295\u1265\u122E\u127D", general: "\u12A0\u1320\u1243\u120B\u12ED", plans: "\u12E8\u12A0\u1263\u120D\u1290\u1275 \u12D5\u1245\u12F6\u127D", backup: "\u121D\u1275\u12AE \u12A5\u1293 \u1218\u120D\u1236 \u121B\u130D\u129B" },
  dues: { title: "\u12E8\u12A0\u1263\u120D\u1290\u1275 \u12CD\u12DD\u134D \u12AD\u134D\u12EB", paidMembers: "\u12E8\u12A8\u1348\u1209 \u12A0\u1263\u120B\u1275", partialPayments: "\u1260\u12A8\u134A\u120D \u12AD\u134D\u12EB\u12CE\u127D", unpaidMembers: "\u12EB\u120D\u12A8\u1348\u1209 \u12A0\u1263\u120B\u1275", overdueMembers: "\u1260\u12D8\u1308\u12E8", outstanding: "\u12EB\u120D\u1270\u12A8\u1348\u1208", recordPayment: "\u12AD\u134D\u12EB \u12ED\u1218\u12DD\u130D\u1261", paymentHistory: "\u12E8\u12AD\u134D\u12EB \u1273\u122A\u12AD" },
  sidebar: { operations: "\u1235\u122B\u12CE\u127D", financeMgmt: "\u134B\u12ED\u1293\u1295\u1235", management: "\u12A0\u1235\u1270\u12F3\u12F0\u122D", insights: "\u1275\u1295\u1273\u1294", system: "\u1235\u122D\u12D3\u1275", logout: "\u12CD\u1323", onlineStatus: "\u12A6\u1295\u120B\u12ED\u1295" },
};

const translations = { en, am };
const STORAGE_KEY = 'gymx_language';
const DEFAULT_LANG = 'en';

const I18nContext = createContext(null);

function resolve(obj, path, vars) {
  const val = path.split('.').reduce((o, k) => o?.[k], obj);
  if (val == null) return path;
  if (!vars) return val;
  return val.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : `{${k}}`);
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && translations[saved]) setLangState(saved);
    } catch (e) { /* SSR or storage blocked */ }
  }, []);

  const setLanguage = useCallback((newLang) => {
    if (!translations[newLang]) return;
    setLangState(newLang);
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch (e) { /* ignore */ }
  }, []);

  const t = useCallback((key, vars) => {
    const result = resolve(translations[lang], key, vars);
    if (result !== key) return result;
    return resolve(translations[DEFAULT_LANG], key, vars);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: DEFAULT_LANG,
      setLanguage: () => {},
      t: (key, vars) => resolve(translations[DEFAULT_LANG], key, vars),
    };
  }
  return ctx;
}

export function getCurrentLanguage() {
  try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch (e) { return DEFAULT_LANG; }
}
