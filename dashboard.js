import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================================
   GDA Finance Services V2 Dashboard
   Message 1
========================================= */

let dashboardData = {

  totalCustomers: 0,

  totalLoan: 0,

  totalCollection: 0,

  todayCollection: 0,

  totalRemaining: 0,

  dueCustomers: 0

};

export async function loadDashboard() {

  try {

    resetDashboard();

    const customerSnap =
      await getDocs(collection(db, "customers"));

    const collectionSnap =
      await getDocs(collection(db, "collections"));

    dashboardData.totalCustomers =
      customerSnap.size;

    const today =
      new Date().toISOString().split("T")[0];

    customerSnap.forEach((docSnap) => {

      const customer = docSnap.data();

      dashboardData.totalLoan +=
        Number(customer.loan || 0);

      dashboardData.totalRemaining +=
        Number(customer.remainingAmount || 0);

      calculateDue(customer);

    });

    collectionSnap.forEach((docSnap) => {

      const item = docSnap.data();

      dashboardData.totalCollection +=
        Number(item.amount || 0);

      checkTodayCollection(item, today);

    });

    updateDashboardUI();

  }

  catch (err) {

    console.error(err);

  }

}

/* Reset */

function resetDashboard(){

dashboardData.totalCustomers = 0;

dashboardData.totalLoan = 0;

dashboardData.totalCollection = 0;

dashboardData.todayCollection = 0;

dashboardData.totalRemaining = 0;

dashboardData.dueCustomers = 0;

}
/* =========================================
   GDA Finance Services V2 Dashboard
   Message 2
========================================= */

/* Due Customer Calculation */

function calculateDue(customer) {

  if (!customer.loanDate || !customer.days) return;

  const loanDate = new Date(customer.loanDate);

  const today = new Date();

  const passedDays = Math.floor(
    (today - loanDate) / (1000 * 60 * 60 * 24)
  );

  const paidDays = Number(customer.paidDays || 0);

  const dueDays = passedDays - paidDays;

  if (
    dueDays > 0 &&
    Number(customer.remainingAmount || 0) > 0
  ) {

    dashboardData.dueCustomers++;

  }

}

/* Today's Collection */

function checkTodayCollection(item, today) {

  if (!item.date) return;

  let collectionDate = "";

  if (item.date.toDate) {

    collectionDate = item.date
      .toDate()
      .toISOString()
      .split("T")[0];

  }

  else if (item.date.seconds) {

    collectionDate = new Date(
      item.date.seconds * 1000
    )
      .toISOString()
      .split("T")[0];

  }

  if (collectionDate === today) {

    dashboardData.todayCollection +=
      Number(item.amount || 0);

  }

}
/* =========================================
   GDA Finance Services V2 Dashboard
   Message 3 (Final)
========================================= */

/* Number Formatter */

function formatNumber(value) {

  return Number(value || 0).toLocaleString("en-IN");

}

/* Update Dashboard UI */

function updateDashboardUI() {

  const setText = (id, value) => {

    const el = document.getElementById(id);

    if (el) {

      el.textContent = value;

    }

  };

  setText("totalCustomers", dashboardData.totalCustomers);

  setText("totalLoan", formatNumber(dashboardData.totalLoan));

  setText("totalCollection", formatNumber(dashboardData.totalCollection));

  setText("todayCollection", formatNumber(dashboardData.todayCollection));

  setText("totalRemaining", formatNumber(dashboardData.totalRemaining));

  setText("dueCustomers", dashboardData.dueCustomers);

}

/* Manual Refresh */

window.refreshDashboard = function () {

  load
