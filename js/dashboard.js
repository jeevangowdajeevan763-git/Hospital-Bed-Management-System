// Load beds with their ward name from Supabase
async function loadDashboard() {
  const status = document.getElementById("status");

  const { data, error } = await db
    .from("beds")
    .select("status, wards(name)");

  if (error) {
    status.textContent = "Could not load data: " + error.message;
    return;
  }
  status.textContent = "";

  // Overall counts
  let available = 0, occupied = 0, reserved = 0;
  // Counts per ward
  const wards = {};

  data.forEach(function (bed) {
    const name = bed.wards.name;
    if (!wards[name]) {
      wards[name] = { available: 0, occupied: 0, reserved: 0 };
    }
    wards[name][bed.status]++;

    if (bed.status === "available") available++;
    if (bed.status === "occupied") occupied++;
    if (bed.status === "reserved") reserved++;
  });

  // Update the 4 cards
  document.getElementById("totalCount").textContent = data.length;
  document.getElementById("availableCount").textContent = available;
  document.getElementById("occupiedCount").textContent = occupied;
  document.getElementById("reservedCount").textContent = reserved;

  // Build the ward table rows
  const body = document.getElementById("wardBody");
  body.innerHTML = "";

  Object.keys(wards).forEach(function (name) {
    const w = wards[name];
    const total = w.available + w.occupied + w.reserved;
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" + name + "</td>" +
      "<td>" + w.available + "</td>" +
      "<td>" + w.occupied + "</td>" +
      "<td>" + w.reserved + "</td>" +
      "<td>" + total + "</td>";
    body.appendChild(row);
  });
}

loadDashboard();

// Realtime: reload whenever any bed changes
db.channel("beds-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "beds" },
      loadDashboard)
  .subscribe();