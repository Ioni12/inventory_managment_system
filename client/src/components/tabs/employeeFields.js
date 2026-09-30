// Shared by EmployeesTab and NePerdorimTab so the employee form
// stays identical in both places.
export const EMPLOYEE_FIELDS = [
  { name: "firstName", label: "Emri", required: true },
  { name: "lastName", label: "Mbiemri", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  {
    name: "emails",
    label: "Email shtesë",
    type: "list",
    itemType: "email",
    addLabel: "+ Shto email",
  },
  { name: "company", label: "Kompania" },
  { name: "department", label: "Departamenti" },
  { name: "phone", label: "Telefoni" },
  { name: "badgeQr", label: "Badge / QR Code" },
  {
    name: "role",
    label: "Roli",
    type: "select",
    required: true,
    options: [
      { value: "admin", label: "Admin" },
      { value: "user", label: "Përdorues" },
    ],
  },
];
