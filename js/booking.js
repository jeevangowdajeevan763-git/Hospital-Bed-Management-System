const form = document.getElementById("bookForm");
const msg = document.getElementById("msg");
const wardSelect = document.getElementById("ward");
const dateInput = document.getElementById("date");

// No past dates
dateInput.min = new Date().toISOString().split("T")[0];

// 1. Fill the ward dropdown from Supabase
async function loadWards() {
  const { data, error } = await db.from("wards").select("id, name").order("name");
  if (error) {
    msg.className = "bad";
    msg.textContent = "Could not load wards: " + error.message;
    return;
  }
  data.forEach(function (w) {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.name;
    wardSelect.appendChild(opt);
  });
}
loadWards();

// 2. Show an error message under a field
function showError(input) {
  let err = input.parentElement.querySelector(".error");
  if (!err) {
    err = document.createElement("span");
    err.className = "error";
    input.parentElement.appendChild(err);
  }
  err.textContent = input.validity.valid ? "" : input.validationMessage;
}

// Mark a field as touched, so the green/red border shows only after use
form.querySelectorAll("input, select").forEach(function (el) {
  el.addEventListener("input", function () {
    el.classList.add("touched");
    if (el.id === "phone") {
      el.setCustomValidity(
        el.validity.patternMismatch ? "Enter a valid 10 digit mobile number" : ""
      );
    }
    showError(el);
  });
});

// 3. Submit
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.querySelectorAll("input, select").forEach(function (el) {
      el.classList.add("touched");
      showError(el);
    });
    form.reportValidity();
    msg.className = "bad";
    msg.textContent = "Please fix the highlighted fields.";
    return;
  }

  msg.className = "";
  msg.textContent = "Booking...";

  try {
    const wardId = Number(wardSelect.value);
    const patient = document.getElementById("name").value;

    // Find the first available bed in this ward
    const { data: beds, error: bedError } = await db
      .from("beds")
      .select("id, bed_number")
      .eq("ward_id", wardId)
      .eq("status", "available")
      .order("bed_number")
      .limit(1);

    if (bedError) throw bedError;

    if (beds.length === 0) {
      msg.className = "bad";
      msg.textContent = "No bed is free in this ward. Try another ward.";
      return;
    }

    const bed = beds[0];

    // Mark the bed as reserved
    const { error: updateError } = await db
      .from("beds")
      .update({
        status: "reserved",
        patient_name: patient,
        updated_at: new Date().toISOString()
      })
      .eq("id", bed.id);

    if (updateError) throw updateError;

    // Save the booking
    const { error: bookError } = await db.from("bookings").insert({
      patient_name: patient,
      phone: document.getElementById("phone").value,
      age: Number(document.getElementById("age").value),
      ward_id: wardId,
      bed_id: bed.id,
      admission_date: dateInput.value,
      needs_oxygen: document.getElementById("oxygen").checked,
      needs_ventilator: document.getElementById("ventilator").checked
    });

    if (bookError) throw bookError;

    msg.className = "ok";
    msg.textContent = "Booked! " + patient + " is assigned bed " + bed.bed_number + ".";
    form.reset();
    form.querySelectorAll(".error").forEach(function (er) { er.textContent = ""; });
    form.querySelectorAll(".touched").forEach(function (el) { el.classList.remove("touched"); });

  } catch (err) {
    msg.className = "bad";
    msg.textContent = "Booking failed: " + err.message;
  }
});