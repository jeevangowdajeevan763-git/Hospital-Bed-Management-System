let allBeds = [];
let sortKey = "bed_number";
let sortAsc = true;

// 1. Load beds from Supabase
async function loadBeds() {
  const status = document.getElementById("status");

  const { data, error } = await db
    .from("beds")
    .select("id, bed_number, status, patient_name, updated_at, wards(name)")
    .order("bed_number");

  if (error) {
    status.textContent = "Could not load beds: " + error.message;
    return;
  }
  status.textContent = "";

  // Put the ward name directly on each bed
  allBeds = data.map(function (b) {
    return { ...b, ward: b.wards.name };
  });

  buildWardFilters();
  render();
}

// 2. Ward checkboxes (built only once)
function buildWardFilters() {
  const box = document.getElementById("wardBox");
  if (box.children.length > 0) return;

  const names = [...new Set(allBeds.map(function (b) { return b.ward; }))];
  names.forEach(function (name) {
    const label = document.createElement("label");
    label.innerHTML =
      '<input type="checkbox" class="ward-filter" value="' + name + '" checked> ' + name;
    box.appendChild(label);
  });
}

// 3. Apply checkboxes, search and sorting
function getVisibleBeds() {
  const statuses = [...document.querySelectorAll(".status-filter:checked")]
    .map(function (c) { return c.value; });
  const wards = [...document.querySelectorAll(".ward-filter:checked")]
    .map(function (c) { return c.value; });
  const text = document.getElementById("searchBox").value.toLowerCase();

  const list = allBeds.filter(function (b) {
    const matchText =
      b.bed_number.toLowerCase().includes(text) ||
      (b.patient_name || "").toLowerCase().includes(text);
    return statuses.includes(b.status) && wards.includes(b.ward) && matchText;
  });

  list.sort(function (a, b) {
    const x = (a[sortKey] || "").toString();
    const y = (b[sortKey] || "").toString();
    return sortAsc ? x.localeCompare(y) : y.localeCompare(x);
  });

  return list;
}

// 4. Draw the grid and the table
function render() {
  const beds = getVisibleBeds();
  const grid = document.getElementById("bedGrid");
  const body = document.getElementById("bedBody");
  grid.innerHTML = "";
  body.innerHTML = "";

  beds.forEach(function (b) {
    // Grid card with a status dropdown
    const card = document.createElement("article");
    card.className = "bed " + b.status;
    card.innerHTML =
      "<h3>" + b.bed_number + "</h3>" +
      "<p>" + b.ward + "</p>" +
      '<select data-id="' + b.id + '">' +
      option("available", b.status) +
      option("occupied", b.status) +
      option("reserved", b.status) +
      "</select>";
    grid.appendChild(card);

    // Table row
    const time = b.updated_at ? new Date(b.updated_at).toLocaleString() : "-";
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" + b.bed_number + "</td>" +
      "<td>" + b.ward + "</td>" +
      '<td class="' + b.status + '">' + b.status + "</td>" +
      "<td>" + (b.patient_name || "-") + "</td>" +
      "<td>" + time + "</td>";
    body.appendChild(row);
  });

  document.getElementById("tableTotal").textContent =
    "Showing " + beds.length + " of " + allBeds.length + " beds";
}

function option(value, current) {
  const sel = value === current ? " selected" : "";
  return '<option value="' + value + '"' + sel + ">" + value + "</option>";
}

// 5. Change a bed's status and save to Supabase
async function changeStatus(id, newStatus) {
  let patient = null;

  if (newStatus === "occupied") {
    patient = prompt("Patient name?");
    if (!patient) { render(); return; }  // cancelled
  }

  const { error } = await db
    .from("beds")
    .update({
      status: newStatus,
      patient_name: patient,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    document.getElementById("status").textContent = "Update failed: " + error.message;
    return;
  }
  loadBeds();
}

// 6. Events
document.getElementById("bedGrid").addEventListener("change", function (e) {
  if (e.target.tagName === "SELECT") {
    changeStatus(e.target.dataset.id, e.target.value);
  }
});

document.querySelector(".filters").addEventListener("input", render);

document.querySelectorAll("thead th").forEach(function (th) {
  th.addEventListener("click", function () {
    const key = th.dataset.key;
    sortAsc = key === sortKey ? !sortAsc : true;
    sortKey = key;
    render();
  });
});

// 7. Start + realtime
loadBeds();

db.channel("beds-page")
  .on("postgres_changes", { event: "*", schema: "public", table: "beds" }, loadBeds)
  .subscribe();