const STORAGE_KEY = "generator_shop_system_v1";

const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => `${Number(value || 0).toLocaleString("ar-YE")} ريال`;
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const seed = {
  session: null,
  users: [
    { id: "u1", name: "المدير", username: "admin", password: "admin123", role: "مشرف", active: true },
    { id: "u2", name: "موظف الاستقبال", username: "employee", password: "1234", role: "موظف", active: true }
  ],
  customers: [
    { id: "c1", name: "محمد علي", phone: "777123456", address: "صنعاء - الحصبة", notes: "عميل تأجير دائم" },
    { id: "c2", name: "أحمد صالح", phone: "771222333", address: "شارع تعز", notes: "صيانة مولد خاص" }
  ],
  equipment: [
    { id: "e1", code: "GEN-001", name: "مولد هوندا 5 كيلو", type: "مملوك للمحل", power: "5KW", status: "متوفر", notes: "جاهز للتأجير" },
    { id: "e2", code: "GEN-002", name: "مولد ياماها 7 كيلو", type: "مملوك للمحل", power: "7KW", status: "مؤجر", notes: "" },
    { id: "e3", code: "CUS-101", name: "مولد خاص بالعميل", type: "خاص بعميل", power: "3KW", status: "تحت الصيانة", notes: "وصل مع عطل تشغيل" }
  ],
  maintenance: [
    { id: "m1", customerId: "c2", equipmentId: "e3", fault: "لا يعمل عند التشغيل", receivedAt: today(), expectedAt: today(), status: "جاري", cost: 12000, paid: 5000, receivedBy: "موظف الاستقبال", intakeCondition: "لا يعمل", accessories: "بدون", notes: "يحتاج فحص كربريتر" }
  ],
  rentals: [
    { id: "r1", customerId: "c1", equipmentId: "e2", startAt: today(), endAt: today(), returnedAt: "", returnCondition: "", receivedBy: "", status: "نشط", rentTotal: 20000, paid: 10000, depositType: "بطاقة شخصية", depositValue: 0, depositReceivedBy: "موظف الاستقبال", depositReturnedBy: "", oilCondition: true, misuseCondition: true, notes: "تم توضيح شروط سوء الاستخدام" }
  ],
  payments: [
    { id: "p1", date: today(), targetType: "إيجار", targetId: "r1", amount: 10000, method: "نقد", notes: "دفعة أولى" },
    { id: "p2", date: today(), targetType: "صيانة", targetId: "m1", amount: 5000, method: "نقد", notes: "عربون صيانة" }
  ],
  loginLog: []
};

let db = load();
let page = "dashboard";
let query = "";

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : structuredClone(seed);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function byId(list, id) {
  return db[list].find((item) => item.id === id);
}

function customerName(id) {
  return byId("customers", id)?.name || "غير محدد";
}

function equipmentName(id) {
  const item = byId("equipment", id);
  return item ? `${item.code} - ${item.name}` : "غير محدد";
}

function canAdmin() {
  return db.session && byId("users", db.session.userId)?.role === "مشرف";
}

const pages = [
  ["dashboard", "الرئيسية"],
  ["customers", "العملاء"],
  ["equipment", "المعدات"],
  ["maintenance", "الصيانة"],
  ["rentals", "التأجير"],
  ["payments", "الدفع"],
  ["reports", "التقارير"],
  ["users", "المستخدمون"],
  ["backup", "النسخ الاحتياطي"]
];

document.getElementById("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const username = form.get("username").trim();
  const password = form.get("password");
  const user = db.users.find((item) => item.username === username && item.password === password && item.active);
  if (!user) {
    alert("بيانات الدخول غير صحيحة");
    return;
  }
  db.session = { userId: user.id, at: new Date().toISOString() };
  db.loginLog.unshift({ id: uid("log"), userId: user.id, at: new Date().toLocaleString("ar-YE") });
  save();
  render();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  db.session = null;
  save();
  render();
});

document.getElementById("globalSearch").addEventListener("input", (event) => {
  query = event.target.value.trim();
  renderPage();
});

function render() {
  const loggedIn = Boolean(db.session);
  document.getElementById("loginView").classList.toggle("hidden", loggedIn);
  document.getElementById("appView").classList.toggle("hidden", !loggedIn);
  if (!loggedIn) return;
  const user = byId("users", db.session.userId);
  document.getElementById("currentUser").textContent = `${user.name} - ${user.role}`;
  renderNav();
  renderPage();
}

function renderNav() {
  document.getElementById("nav").innerHTML = pages.map(([id, label]) => {
    if (id === "users" && !canAdmin()) return "";
    return `<button class="nav-btn ${page === id ? "active" : ""}" data-page="${id}">${label}</button>`;
  }).join("");
  document.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      page = btn.dataset.page;
      renderPage();
    });
  });
}

function renderPage() {
  const label = pages.find(([id]) => id === page)?.[1] || "";
  document.getElementById("pageTitle").textContent = label;
  const content = document.getElementById("content");
  const map = { dashboard, customers, equipment, maintenance, rentals, payments, reports, users, backup };
  content.innerHTML = map[page]();
  wireActions(content);
}

function asNumber(value) {
  return Number(value || 0);
}

function fail(message) {
  alert(message);
  return false;
}

function validateRequired(data, labels) {
  for (const [key, label] of Object.entries(labels)) {
    if (!String(data[key] ?? "").trim()) return fail(`حقل ${label} مطلوب`);
  }
  return true;
}

function validatePhone(phone) {
  if (!/^[0-9+\-\s]{7,15}$/.test(String(phone || "").trim())) {
    return fail("رقم الجوال غير صحيح");
  }
  return true;
}

function validateMoney(data, keys) {
  for (const key of keys) {
    if (asNumber(data[key]) < 0) return fail("المبالغ يجب أن تكون صفر أو أكثر");
  }
  return true;
}

function validateDateOrder(start, end, message) {
  if (start && end && start > end) return fail(message);
  return true;
}

function validatePaid(total, paid) {
  if (asNumber(paid) > asNumber(total)) return fail("المدفوع لا يمكن أن يكون أكبر من الإجمالي");
  return true;
}

function refreshEquipmentStatus(equipmentId) {
  const equipment = byId("equipment", equipmentId);
  if (!equipment) return;
  const rented = db.rentals.some((r) => r.equipmentId === equipmentId && !["مكتمل", "ملغي"].includes(r.status));
  const inMaintenance = db.maintenance.some((m) => m.equipmentId === equipmentId && !["تم التسليم", "ملغي"].includes(m.status));
  equipment.status = rented ? "مؤجر" : inMaintenance ? "تحت الصيانة" : "متوفر";
}

function dashboard() {
  const activeRentals = db.rentals.filter((r) => r.status === "نشط");
  const overdue = activeRentals.filter((r) => r.endAt < today());
  const dueMaintenance = db.maintenance.filter((m) => m.status !== "تم التسليم" && m.expectedAt <= today());
  return `
    <div class="stats">
      <div class="stat"><span>العملاء</span><b>${db.customers.length}</b></div>
      <div class="stat"><span>المعدات المتوفرة</span><b>${db.equipment.filter((e) => e.status === "متوفر").length}</b></div>
      <div class="stat"><span>إيجارات نشطة</span><b>${activeRentals.length}</b></div>
      <div class="stat"><span>تنبيهات اليوم</span><b>${overdue.length + dueMaintenance.length}</b></div>
    </div>
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head"><h3>تنبيهات التأجير</h3><button class="secondary" data-add-rental>عقد جديد</button></div>
        <div class="list">${overdue.length ? overdue.map((r) => `<div class="item-row"><span>${customerName(r.customerId)} - ${equipmentName(r.equipmentId)}</span><span class="badge danger">متأخر</span></div>`).join("") : `<p class="muted">لا توجد إيجارات متأخرة.</p>`}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>الصيانة المستحقة</h3><button class="secondary" data-add-maintenance>طلب صيانة</button></div>
        <div class="list">${dueMaintenance.length ? dueMaintenance.map((m) => `<div class="item-row"><span>${customerName(m.customerId)} - ${m.fault}</span><span class="badge warn">${m.status}</span></div>`).join("") : `<p class="muted">لا توجد صيانة مستحقة اليوم.</p>`}</div>
      </section>
    </div>
    ${table("آخر الدفعات", ["التاريخ", "النوع", "المرجع", "المبلغ", "الطريقة"], db.payments.slice(0, 6).map((p) => [p.date, p.targetType, p.targetId, money(p.amount), p.method]))}
  `;
}

function customers() {
  const rows = filtered(db.customers, ["name", "phone", "address"]).map((c) => [
    c.name, c.phone, c.address || "-", c.notes || "-",
    actions(`<button class="secondary" data-edit-customer="${c.id}">تعديل</button><button class="danger" data-delete="customers:${c.id}">حذف</button>`)
  ]);
  return section("العملاء", `<button class="primary" data-add-customer>إضافة عميل</button>`, tableHtml(["الاسم", "الجوال", "العنوان", "ملاحظات", "إجراء"], rows));
}

function equipment() {
  const rows = filtered(db.equipment, ["code", "name", "type", "status"]).map((e) => [
    e.code, e.name, e.type, e.power, statusBadge(e.status), e.notes || "-",
    actions(`<button class="secondary" data-edit-equipment="${e.id}">تعديل</button><button class="danger" data-delete="equipment:${e.id}">حذف</button>`)
  ]);
  return section("المعدات والمولدات", `<button class="primary" data-add-equipment>إضافة معدة</button>`, tableHtml(["الكود", "المعدة", "الملكية", "القدرة", "الحالة", "ملاحظات", "إجراء"], rows));
}

function maintenance() {
  const rows = filtered(db.maintenance, ["fault", "status", "notes"]).map((m) => [
    m.id, customerName(m.customerId), equipmentName(m.equipmentId), m.fault, m.receivedAt, m.expectedAt,
    statusBadge(m.status), money(m.cost), money(Number(m.cost) - Number(m.paid || 0)),
    actions(`<button class="secondary" data-edit-maintenance="${m.id}">تعديل</button><button class="secondary" data-print-maintenance="${m.id}">فاتورة</button>${m.status !== "تم التسليم" ? `<button class="secondary" data-deliver-maintenance="${m.id}">تسليم</button>` : ""}<button class="danger" data-delete="maintenance:${m.id}">حذف</button>`)
  ]);
  return section("طلبات الصيانة", `<button class="primary" data-add-maintenance>استلام معدة للصيانة</button>`, tableHtml(["رقم", "العميل", "المعدة", "العطل", "الاستلام", "التسليم المتوقع", "الحالة", "التكلفة", "المتبقي", "إجراء"], rows));
}

function rentals() {
  const rows = filtered(db.rentals, ["status", "depositType", "notes"]).map((r) => [
    r.id, customerName(r.customerId), equipmentName(r.equipmentId), r.startAt, r.endAt,
    r.returnedAt || "-", statusBadge(r.status), r.depositType, money(r.rentTotal), money(Number(r.rentTotal) - Number(r.paid || 0)),
    actions(`<button class="secondary" data-edit-rental="${r.id}">تعديل</button>${r.status !== "مكتمل" && r.status !== "ملغي" ? `<button class="secondary" data-receive-rental="${r.id}">استلام</button>` : ""}<button class="secondary" data-print-rental="${r.id}">عقد</button><button class="danger" data-delete="rentals:${r.id}">حذف</button>`)
  ]);
  return section("عقود التأجير", `<button class="primary" data-add-rental>عقد تأجير</button>`, tableHtml(["رقم", "المستأجر", "المعدة", "البداية", "النهاية", "تاريخ الاستلام", "الحالة", "الرهن", "الإجمالي", "المتبقي", "إجراء"], rows));
}

function payments() {
  const rows = filtered(db.payments, ["targetType", "targetId", "method", "notes"]).map((p) => [
    p.date, p.targetType, p.targetId, money(p.amount), p.method, p.notes || "-",
    actions(`<button class="danger" data-delete="payments:${p.id}">حذف</button>`)
  ]);
  return section("سجل الدفع", `<button class="primary" data-add-payment>تسجيل دفعة</button>`, tableHtml(["التاريخ", "النوع", "المرجع", "المبلغ", "الطريقة", "ملاحظات", "إجراء"], rows));
}

function reports() {
  const rentIncome = db.payments.filter((p) => p.targetType === "إيجار").reduce((sum, p) => sum + Number(p.amount), 0);
  const maintenanceIncome = db.payments.filter((p) => p.targetType === "صيانة").reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingRent = db.rentals.reduce((sum, r) => sum + Math.max(0, Number(r.rentTotal) - Number(r.paid || 0)), 0);
  const remainingMaintenance = db.maintenance.reduce((sum, m) => sum + Math.max(0, Number(m.cost) - Number(m.paid || 0)), 0);
  return `
    <div class="stats">
      <div class="stat"><span>دخل التأجير</span><b>${money(rentIncome)}</b></div>
      <div class="stat"><span>دخل الصيانة</span><b>${money(maintenanceIncome)}</b></div>
      <div class="stat"><span>متبقي التأجير</span><b>${money(remainingRent)}</b></div>
      <div class="stat"><span>متبقي الصيانة</span><b>${money(remainingMaintenance)}</b></div>
    </div>
    ${table("تقرير حالة المعدات", ["الحالة", "العدد"], ["متوفر", "مؤجر", "تحت الصيانة"].map((s) => [s, db.equipment.filter((e) => e.status === s).length]))}
    ${table("سجل دخول المستخدمين", ["المستخدم", "الوقت"], db.loginLog.slice(0, 10).map((l) => [byId("users", l.userId)?.name || "-", l.at]))}
  `;
}

function users() {
  if (!canAdmin()) return `<section class="panel"><p>هذه الصفحة للمدير فقط.</p></section>`;
  const rows = db.users.map((u) => [
    u.name, u.username, u.role, u.active ? "نشط" : "موقوف",
    actions(`<button class="secondary" data-edit-user="${u.id}">تعديل</button><button class="danger" data-delete="users:${u.id}">حذف</button>`)
  ]);
  return section("إدارة المستخدمين", `<button class="primary" data-add-user>إضافة مستخدم</button>`, tableHtml(["الاسم", "اسم المستخدم", "الصلاحية", "الحالة", "إجراء"], rows));
}

function backup() {
  return `
    <section class="panel">
      <div class="panel-head"><h3>النسخ الاحتياطي</h3></div>
      <p class="muted">يمكن تصدير كل بيانات النظام إلى ملف JSON أو استيراد نسخة محفوظة.</p>
      <div class="actions">
        <button class="primary" data-export>تصدير نسخة</button>
        <label class="secondary">استيراد نسخة<input type="file" accept="application/json" data-import hidden></label>
        <button class="danger" data-reset>إعادة البيانات التجريبية</button>
      </div>
    </section>
  `;
}

function filtered(items, keys) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((item) => keys.some((key) => String(item[key] || "").toLowerCase().includes(q)) || JSON.stringify(item).toLowerCase().includes(q));
}

function section(title, action, body) {
  return `<section class="panel"><div class="panel-head"><h3>${title}</h3><div class="actions">${action}</div></div>${body}</section>`;
}

function table(title, headers, rows) {
  return `<section class="panel"><div class="panel-head"><h3>${title}</h3></div>${tableHtml(headers, rows)}</section>`;
}

function tableHtml(headers, rows) {
  if (!rows.length) return `<p class="muted">لا توجد بيانات مطابقة.</p>`;
  return `<div class="table-panel"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function statusBadge(status) {
  const cls = status === "متوفر" || status === "تم" || status === "تم التسليم" ? "ok" : status === "متأخر" || status === "ملغي" ? "danger" : status === "مؤجر" || status === "نشط" || status === "جاري" ? "warn" : "info";
  return `<span class="badge ${cls}">${status}</span>`;
}

function actions(html) {
  return `<div class="actions">${html}</div>`;
}

function options(list, selected, labeler) {
  return list.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${labeler(item)}</option>`).join("");
}

function wireActions(root) {
  root.querySelectorAll("[data-add-customer]").forEach((b) => b.onclick = () => customerForm());
  root.querySelectorAll("[data-edit-customer]").forEach((b) => b.onclick = () => customerForm(byId("customers", b.dataset.editCustomer)));
  root.querySelectorAll("[data-add-equipment]").forEach((b) => b.onclick = () => equipmentForm());
  root.querySelectorAll("[data-edit-equipment]").forEach((b) => b.onclick = () => equipmentForm(byId("equipment", b.dataset.editEquipment)));
  root.querySelectorAll("[data-add-maintenance]").forEach((b) => b.onclick = () => maintenanceForm());
  root.querySelectorAll("[data-edit-maintenance]").forEach((b) => b.onclick = () => maintenanceForm(byId("maintenance", b.dataset.editMaintenance)));
  root.querySelectorAll("[data-deliver-maintenance]").forEach((b) => b.onclick = () => deliverMaintenanceForm(byId("maintenance", b.dataset.deliverMaintenance)));
  root.querySelectorAll("[data-add-rental]").forEach((b) => b.onclick = () => rentalForm());
  root.querySelectorAll("[data-edit-rental]").forEach((b) => b.onclick = () => rentalForm(byId("rentals", b.dataset.editRental)));
  root.querySelectorAll("[data-receive-rental]").forEach((b) => b.onclick = () => receiveRentalForm(byId("rentals", b.dataset.receiveRental)));
  root.querySelectorAll("[data-add-payment]").forEach((b) => b.onclick = () => paymentForm());
  root.querySelectorAll("[data-add-user]").forEach((b) => b.onclick = () => userForm());
  root.querySelectorAll("[data-edit-user]").forEach((b) => b.onclick = () => userForm(byId("users", b.dataset.editUser)));
  root.querySelectorAll("[data-delete]").forEach((b) => b.onclick = () => deleteItem(b.dataset.delete));
  root.querySelectorAll("[data-print-maintenance]").forEach((b) => b.onclick = () => printMaintenance(byId("maintenance", b.dataset.printMaintenance)));
  root.querySelectorAll("[data-print-rental]").forEach((b) => b.onclick = () => printRental(byId("rentals", b.dataset.printRental)));
  root.querySelectorAll("[data-export]").forEach((b) => b.onclick = exportBackup);
  root.querySelectorAll("[data-import]").forEach((input) => input.onchange = importBackup);
  root.querySelectorAll("[data-reset]").forEach((b) => b.onclick = resetData);
}

function openModal(title, bodyHtml, onSubmit) {
  const tpl = document.getElementById("modalTemplate").content.cloneNode(true);
  const backdrop = tpl.querySelector(".modal-backdrop");
  tpl.querySelector("h3").textContent = title;
  tpl.querySelector(".modal-body").innerHTML = bodyHtml;
  tpl.querySelector("[data-close]").onclick = () => backdrop.remove();
  document.body.appendChild(tpl);
  const form = backdrop.querySelector("form");
  if (form) {
    form.onsubmit = (event) => {
      event.preventDefault();
      const ok = onSubmit(new FormData(form));
      if (ok === false) return;
      backdrop.remove();
      save();
      renderPage();
    };
  }
  return backdrop;
}

function input(name, label, value = "", type = "text", extra = "") {
  return `<label>${label}<input name="${name}" type="${type}" value="${value ?? ""}" ${extra}></label>`;
}

function select(name, label, values, selected = "") {
  return `<label>${label}<select name="${name}">${values.map((v) => `<option ${v === selected ? "selected" : ""}>${v}</option>`).join("")}</select></label>`;
}

function textarea(name, label, value = "") {
  return `<label class="span-2">${label}<textarea name="${name}">${value ?? ""}</textarea></label>`;
}

function customerForm(item = {}) {
  openModal(item.id ? "تعديل عميل" : "إضافة عميل", `
    <form class="form-grid">
      ${input("name", "اسم العميل", item.name, "text", "required")}
      ${input("phone", "رقم الجوال", item.phone, "tel", "required")}
      ${input("address", "العنوان", item.address || "")}
      ${textarea("notes", "ملاحظات", item.notes || "")}
      <button class="primary span-2">حفظ</button>
    </form>`, (fd) => {
      const data = Object.fromEntries(fd);
      if (!validateRequired(data, { name: "اسم العميل", phone: "رقم الجوال" }) || !validatePhone(data.phone)) return false;
      upsert("customers", item.id, data);
    });
}

function equipmentForm(item = {}) {
  openModal(item.id ? "تعديل معدة" : "إضافة معدة", `
    <form class="form-grid">
      ${input("code", "كود المعدة", item.code, "text", "required")}
      ${input("name", "اسم المعدة", item.name, "text", "required")}
      ${select("type", "الملكية", ["مملوك للمحل", "خاص بعميل"], item.type)}
      ${input("power", "القدرة", item.power || "")}
      ${select("status", "الحالة", ["متوفر", "مؤجر", "تحت الصيانة"], item.status || "متوفر")}
      ${textarea("notes", "ملاحظات", item.notes || "")}
      <button class="primary span-2">حفظ</button>
    </form>`, (fd) => {
      const data = Object.fromEntries(fd);
      if (!validateRequired(data, { code: "كود المعدة", name: "اسم المعدة" })) return false;
      const duplicate = db.equipment.some((e) => e.code === data.code && e.id !== item.id);
      if (duplicate) return fail("كود المعدة مستخدم من قبل");
      upsert("equipment", item.id, data);
    });
}

function maintenanceForm(item = {}) {
  openModal(item.id ? "تعديل طلب صيانة" : "استلام معدة للصيانة", `
    <form class="form-grid">
      <label>العميل<select name="customerId" required>${options(db.customers, item.customerId, (c) => `${c.name} - ${c.phone}`)}</select></label>
      <label>المعدة<select name="equipmentId" required>${options(db.equipment, item.equipmentId, (e) => `${e.code} - ${e.name}`)}</select></label>
      ${input("fault", "نوع العطل", item.fault, "text", "required")}
      ${input("receivedAt", "تاريخ الاستلام", item.receivedAt || today(), "date")}
      ${input("expectedAt", "التسليم المتوقع", item.expectedAt || today(), "date")}
      ${select("status", "الحالة", ["جاري", "تم", "تم التسليم", "ملغي"], item.status || "جاري")}
      ${input("cost", "تكلفة الصيانة", item.cost || 0, "number")}
      ${input("paid", "المدفوع", item.paid || 0, "number")}
      ${input("receivedBy", "مستلم المعدة", item.receivedBy || currentUserName())}
      ${input("intakeCondition", "حالة المعدة عند الاستلام", item.intakeCondition || "")}
      ${input("accessories", "الملحقات المستلمة", item.accessories || "")}
      ${textarea("notes", "ملاحظات الأعطال", item.notes || "")}
      <button class="primary span-2">حفظ</button>
    </form>`, (fd) => {
      const data = Object.fromEntries(fd);
      if (!validateRequired(data, { customerId: "العميل", equipmentId: "المعدة", fault: "نوع العطل", receivedAt: "تاريخ الاستلام", expectedAt: "التسليم المتوقع", receivedBy: "مستلم المعدة" })) return false;
      if (!validateDateOrder(data.receivedAt, data.expectedAt, "تاريخ التسليم المتوقع يجب أن يكون بعد تاريخ الاستلام")) return false;
      if (!validateMoney(data, ["cost", "paid"]) || !validatePaid(data.cost, data.paid)) return false;
      const previousEquipmentId = item.equipmentId;
      upsert("maintenance", item.id, data);
      refreshEquipmentStatus(data.equipmentId);
      if (previousEquipmentId && previousEquipmentId !== data.equipmentId) refreshEquipmentStatus(previousEquipmentId);
    });
}

function rentalForm(item = {}) {
  const equipmentChoices = item.id ? db.equipment : db.equipment.filter((e) => e.status === "متوفر");
  openModal(item.id ? "تعديل عقد تأجير" : "عقد تأجير جديد", `
    <form class="form-grid">
      <label>المستأجر<select name="customerId" required>${options(db.customers, item.customerId, (c) => `${c.name} - ${c.phone}`)}</select></label>
      <label>المعدة<select name="equipmentId" required>${options(equipmentChoices, item.equipmentId, (e) => `${e.code} - ${e.name} - ${e.status}`)}</select></label>
      ${input("startAt", "تاريخ البداية", item.startAt || today(), "date")}
      ${input("endAt", "تاريخ الإرجاع", item.endAt || today(), "date")}
      ${select("status", "الحالة", ["نشط", "مكتمل", "متأخر", "ملغي"], item.status || "نشط")}
      ${input("rentTotal", "إجمالي الإيجار", item.rentTotal || 0, "number")}
      ${input("paid", "المدفوع", item.paid || 0, "number")}
      ${input("depositType", "نوع الرهن", item.depositType || "")}
      ${input("depositValue", "قيمة الرهن", item.depositValue || 0, "number")}
      ${input("depositReceivedBy", "مستلم الرهن", item.depositReceivedBy || "")}
      ${input("depositReturnedBy", "مسلم الرهن عند الإرجاع", item.depositReturnedBy || "")}
      <label><input name="oilCondition" type="checkbox" ${item.oilCondition !== false ? "checked" : ""}> يتحمل المستأجر تغيير الزيت عند طول المدة</label>
      <label><input name="misuseCondition" type="checkbox" ${item.misuseCondition !== false ? "checked" : ""}> يتحمل المستأجر أعطال سوء الاستخدام</label>
      ${textarea("notes", "ملاحظات وشروط إضافية", item.notes || "")}
      <button class="primary span-2">حفظ</button>
    </form>`, (fd) => {
      const data = Object.fromEntries(fd);
      if (!data.equipmentId) return fail("لا توجد معدات متوفرة للتأجير");
      if (!validateRequired(data, { customerId: "المستأجر", equipmentId: "المعدة", startAt: "تاريخ البداية", endAt: "تاريخ الإرجاع" })) return false;
      if (!validateDateOrder(data.startAt, data.endAt, "تاريخ الإرجاع يجب أن يكون بعد تاريخ البداية")) return false;
      if (!validateMoney(data, ["rentTotal", "paid", "depositValue"]) || !validatePaid(data.rentTotal, data.paid)) return false;
      const equipment = byId("equipment", data.equipmentId);
      if (!item.id && equipment?.status !== "متوفر") return fail("لا يمكن تأجير معدة غير متوفرة");
      const previousEquipmentId = item.equipmentId;
      data.oilCondition = fd.has("oilCondition");
      data.misuseCondition = fd.has("misuseCondition");
      upsert("rentals", item.id, data);
      refreshEquipmentStatus(data.equipmentId);
      if (previousEquipmentId && previousEquipmentId !== data.equipmentId) refreshEquipmentStatus(previousEquipmentId);
    });
}

function receiveRentalForm(item) {
  openModal("استلام معدة مؤجرة", `
    <form class="form-grid">
      ${input("returnedAt", "تاريخ الاستلام", item.returnedAt || today(), "date", "required")}
      ${input("receivedBy", "مستلم المعدة", item.receivedBy || currentUserName(), "text", "required")}
      ${input("returnCondition", "حالة المعدة عند الرجوع", item.returnCondition || "سليمة", "text", "required")}
      ${input("depositReturnedBy", "مسلم الرهن", item.depositReturnedBy || currentUserName())}
      ${input("extraCost", "تكلفة إضافية/أضرار", 0, "number")}
      ${input("paidNow", "مبلغ مستلم الآن", Math.max(0, Number(item.rentTotal) - Number(item.paid || 0)), "number")}
      ${textarea("notes", "ملاحظات الاستلام", item.notes || "")}
      <button class="primary span-2">تأكيد الاستلام</button>
    </form>`, (fd) => {
      const data = Object.fromEntries(fd);
      if (!validateRequired(data, { returnedAt: "تاريخ الاستلام", receivedBy: "مستلم المعدة", returnCondition: "حالة المعدة" })) return false;
      if (!validateDateOrder(item.startAt, data.returnedAt, "تاريخ الاستلام يجب أن يكون بعد تاريخ بداية العقد")) return false;
      if (!validateMoney(data, ["extraCost", "paidNow"])) return false;
      const extraCost = asNumber(data.extraCost);
      const paidNow = asNumber(data.paidNow);
      const newTotal = asNumber(item.rentTotal) + extraCost;
      if (asNumber(item.paid) + paidNow > newTotal) return fail("المبلغ المستلم أكبر من المتبقي");
      Object.assign(item, {
        returnedAt: data.returnedAt,
        receivedBy: data.receivedBy,
        returnCondition: data.returnCondition,
        depositReturnedBy: data.depositReturnedBy,
        rentTotal: newTotal,
        paid: asNumber(item.paid) + paidNow,
        status: "مكتمل",
        notes: data.notes
      });
      if (paidNow > 0) {
        db.payments.unshift({ id: uid("p"), date: data.returnedAt, targetType: "إيجار", targetId: item.id, amount: paidNow, method: "نقد", notes: "دفعة عند استلام المعدة المؤجرة" });
      }
      refreshEquipmentStatus(item.equipmentId);
    });
}

function deliverMaintenanceForm(item) {
  openModal("تسليم معدة الصيانة للعميل", `
    <form class="form-grid">
      ${input("deliveredAt", "تاريخ التسليم", item.deliveredAt || today(), "date", "required")}
      ${input("deliveredBy", "مسلم المعدة", item.deliveredBy || currentUserName(), "text", "required")}
      ${input("paidNow", "مبلغ مستلم الآن", Math.max(0, Number(item.cost) - Number(item.paid || 0)), "number")}
      ${textarea("notes", "ملاحظات التسليم", item.notes || "")}
      <button class="primary span-2">تأكيد التسليم</button>
    </form>`, (fd) => {
      const data = Object.fromEntries(fd);
      if (!validateRequired(data, { deliveredAt: "تاريخ التسليم", deliveredBy: "مسلم المعدة" })) return false;
      if (!validateDateOrder(item.receivedAt, data.deliveredAt, "تاريخ التسليم يجب أن يكون بعد تاريخ الاستلام")) return false;
      if (!validateMoney(data, ["paidNow"])) return false;
      const paidNow = asNumber(data.paidNow);
      if (asNumber(item.paid) + paidNow > asNumber(item.cost)) return fail("المبلغ المستلم أكبر من المتبقي");
      Object.assign(item, {
        deliveredAt: data.deliveredAt,
        deliveredBy: data.deliveredBy,
        paid: asNumber(item.paid) + paidNow,
        status: "تم التسليم",
        notes: data.notes
      });
      if (paidNow > 0) {
        db.payments.unshift({ id: uid("p"), date: data.deliveredAt, targetType: "صيانة", targetId: item.id, amount: paidNow, method: "نقد", notes: "دفعة عند تسليم معدة الصيانة" });
      }
      refreshEquipmentStatus(item.equipmentId);
    });
}

function paymentForm() {
  const refs = [
    ...db.rentals.map((r) => ({ id: r.id, label: `إيجار: ${r.id} - ${customerName(r.customerId)}`, type: "إيجار" })),
    ...db.maintenance.map((m) => ({ id: m.id, label: `صيانة: ${m.id} - ${customerName(m.customerId)}`, type: "صيانة" }))
  ];
  openModal("تسجيل دفعة", `
    <form class="form-grid">
      ${input("date", "التاريخ", today(), "date")}
      <label>المرجع<select name="ref" required>${refs.map((r) => `<option value="${r.type}|${r.id}">${r.label}</option>`).join("")}</select></label>
      ${input("amount", "المبلغ", 0, "number", "required")}
      ${select("method", "طريقة الدفع", ["نقد", "حوالة", "آجل"], "نقد")}
      ${textarea("notes", "ملاحظات", "")}
      <button class="primary span-2">حفظ الدفعة</button>
    </form>`, (fd) => {
      const [targetType, targetId] = fd.get("ref").split("|");
      const amount = Number(fd.get("amount"));
      if (amount <= 0) return fail("مبلغ الدفعة يجب أن يكون أكبر من صفر");
      const collection = targetType === "إيجار" ? "rentals" : "maintenance";
      const target = byId(collection, targetId);
      const total = targetType === "إيجار" ? target?.rentTotal : target?.cost;
      if (target && Number(target.paid || 0) + amount > Number(total || 0)) return fail("الدفعة أكبر من المبلغ المتبقي");
      db.payments.unshift({ id: uid("p"), date: fd.get("date"), targetType, targetId, amount, method: fd.get("method"), notes: fd.get("notes") });
      if (target) target.paid = Number(target.paid || 0) + amount;
    });
}

function userForm(item = {}) {
  openModal(item.id ? "تعديل مستخدم" : "إضافة مستخدم", `
    <form class="form-grid">
      ${input("name", "الاسم", item.name, "text", "required")}
      ${input("username", "اسم المستخدم", item.username, "text", "required")}
      ${input("password", "كلمة المرور", item.password || "", "text", "required")}
      ${select("role", "الصلاحية", ["مشرف", "موظف"], item.role || "موظف")}
      ${select("active", "الحالة", ["نشط", "موقوف"], item.active === false ? "موقوف" : "نشط")}
      <button class="primary span-2">حفظ</button>
    </form>`, (fd) => {
      const data = Object.fromEntries(fd);
      if (!validateRequired(data, { name: "الاسم", username: "اسم المستخدم", password: "كلمة المرور" })) return false;
      const duplicate = db.users.some((u) => u.username === data.username && u.id !== item.id);
      if (duplicate) return fail("اسم المستخدم مستخدم من قبل");
      data.active = data.active === "نشط";
      upsert("users", item.id, data);
    });
}

function currentUserName() {
  return byId("users", db.session?.userId)?.name || "";
}

function upsert(collection, id, data) {
  const normalized = { ...data };
  ["cost", "paid", "rentTotal", "depositValue"].forEach((key) => {
    if (key in normalized) normalized[key] = Number(normalized[key] || 0);
  });
  if (id) {
    Object.assign(byId(collection, id), normalized);
  } else {
    db[collection].unshift({ id: uid(collection.slice(0, 1)), ...normalized });
  }
}

function deleteItem(ref) {
  const [collection, id] = ref.split(":");
  if (collection === "customers" && (db.rentals.some((r) => r.customerId === id) || db.maintenance.some((m) => m.customerId === id))) {
    alert("لا يمكن حذف عميل مرتبط بعقود أو طلبات صيانة");
    return;
  }
  if (collection === "equipment" && (db.rentals.some((r) => r.equipmentId === id) || db.maintenance.some((m) => m.equipmentId === id))) {
    alert("لا يمكن حذف معدة مرتبطة بعقد أو طلب صيانة");
    return;
  }
  if (collection === "users" && db.session?.userId === id) {
    alert("لا يمكن حذف المستخدم الحالي");
    return;
  }
  if (!confirm("هل تريد حذف هذا السجل؟")) return;
  const deleted = db[collection].find((item) => item.id === id);
  db[collection] = db[collection].filter((item) => item.id !== id);
  if (deleted?.equipmentId && ["rentals", "maintenance"].includes(collection)) refreshEquipmentStatus(deleted.equipmentId);
  if (collection === "payments" && deleted) {
    const target = byId(deleted.targetType === "إيجار" ? "rentals" : "maintenance", deleted.targetId);
    if (target) target.paid = Math.max(0, Number(target.paid || 0) - Number(deleted.amount || 0));
  }
  save();
  renderPage();
}

function printMaintenance(item) {
  openModal("فاتورة صيانة", invoiceHtml("فاتورة صيانة", [
    ["رقم الطلب", item.id],
    ["العميل", customerName(item.customerId)],
    ["المعدة", equipmentName(item.equipmentId)],
    ["العطل", item.fault],
    ["التكلفة", money(item.cost)],
    ["المدفوع", money(item.paid)],
    ["المتبقي", money(Number(item.cost) - Number(item.paid || 0))],
    ["الحالة", item.status],
    ["مستلم المعدة", item.receivedBy || "-"],
    ["حالة الاستلام", item.intakeCondition || "-"],
    ["الملحقات", item.accessories || "-"],
    ["ملاحظات", item.notes || "-"]
  ]), () => {});
}

function printRental(item) {
  openModal("عقد تأجير", invoiceHtml("عقد تأجير مولد", [
    ["رقم العقد", item.id],
    ["المستأجر", customerName(item.customerId)],
    ["المعدة", equipmentName(item.equipmentId)],
    ["مدة التأجير", `${item.startAt} إلى ${item.endAt}`],
    ["الإجمالي", money(item.rentTotal)],
    ["المدفوع", money(item.paid)],
    ["المتبقي", money(Number(item.rentTotal) - Number(item.paid || 0))],
    ["الرهن", `${item.depositType || "-"} ${Number(item.depositValue || 0) ? money(item.depositValue) : ""}`],
    ["تاريخ الاستلام", item.returnedAt || "-"],
    ["مستلم المعدة", item.receivedBy || "-"],
    ["حالة الرجوع", item.returnCondition || "-"],
    ["الشروط", `${item.oilCondition ? "تغيير الزيت عند طول المدة. " : ""}${item.misuseCondition ? "تحمل أعطال سوء الاستخدام." : ""}`],
    ["ملاحظات", item.notes || "-"]
  ]), () => {});
}

function invoiceHtml(title, rows) {
  return `
    <div class="print-box">
      <h2>${title}</h2>
      <p class="muted">نظام إدارة محل صيانة وتأجير مولدات - ${new Date().toLocaleDateString("ar-YE")}</p>
      <table><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</tbody></table>
      <p>توقيع الموظف: ____________________ &nbsp;&nbsp; توقيع العميل: ____________________</p>
    </div>
    <div class="actions" style="margin-top:12px"><button class="primary" onclick="window.print()">طباعة</button></div>
  `;
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-generator-shop-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      db = JSON.parse(reader.result);
      save();
      render();
      alert("تم استيراد النسخة بنجاح");
    } catch {
      alert("ملف النسخة غير صالح");
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("سيتم حذف البيانات الحالية واستعادة البيانات التجريبية. هل أنت متأكد؟")) return;
  db = structuredClone(seed);
  save();
  render();
}

render();
