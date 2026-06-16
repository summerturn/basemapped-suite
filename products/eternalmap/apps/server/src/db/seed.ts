import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding EternalMap...");

  // Clean slate (dev only)
  await prisma.changeLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.grave.deleteMany({});
  await prisma.person.deleteMany({});
  await prisma.plot.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.cemetery.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  // Demo Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Greenlawn Memorial",
      slug: "greenlawn-memorial",
      subscriptionStatus: "active",
    },
  });
  console.log(`  ✅ Tenant: ${tenant.name}`);

  // Demo Users
  const users = await prisma.user.createMany({
    data: [
      {
        tenantId: tenant.id,
        email: "admin@greenlawn.demo",
        passwordHash: "$2a$10$devhashplaceholderadmin",
        firstName: "Alice",
        lastName: "Administrator",
        role: "admin",
      },
      {
        tenantId: tenant.id,
        email: "manager@greenlawn.demo",
        passwordHash: "$2a$10$devhashplaceholdermanager",
        firstName: "Bob",
        lastName: "Manager",
        role: "manager",
      },
      {
        tenantId: tenant.id,
        email: "viewer@greenlawn.demo",
        passwordHash: "$2a$10$devhashplaceholderviewer",
        firstName: "Carol",
        lastName: "Viewer",
        role: "viewer",
      },
    ],
  });
  console.log(`  ✅ Users: ${users.count}`);

  const adminUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "admin" },
  });

  // Demo Cemetery
  const cemetery = await prisma.cemetery.create({
    data: {
      tenantId: tenant.id,
      name: "Greenlawn Memorial Gardens",
      code: "GMG-001",
      address: "1234 Eternal Way",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      phone: "+1-555-0100",
      email: "info@greenlawn.demo",
      totalAcres: 45.5,
      establishedDate: new Date("1892-06-15"),
    },
  });
  console.log(`  ✅ Cemetery: ${cemetery.name}`);

  // Demo Sections
  const sectionsData = [
    { name: "Garden of Peace", code: "A", sectionType: "standard" },
    { name: "Mausoleum Hills", code: "B", sectionType: "mausoleum" },
    { name: "Cremation Garden", code: "C", sectionType: "cremation_garden" },
  ];

  const sections: { id: string }[] = [];
  for (const s of sectionsData) {
    const section = await prisma.section.create({
      data: {
        tenantId: tenant.id,
        cemeteryId: cemetery.id,
        name: s.name,
        code: s.code,
        sectionType: s.sectionType,
        totalPlots: 0,
      },
    });
    sections.push({ id: section.id });
    console.log(`  ✅ Section: ${s.name}`);
  }

  // Demo Plots (20 plots, distributed across sections)
  const plotStatuses = ["available", "occupied", "reserved", "available"] as const;
  const plotTypes = ["single", "double", "family", "single", "companion"] as const;
  const plots: { id: string; status: string; maxOccupants: number }[] = [];

  for (let i = 1; i <= 20; i++) {
    const sectionIndex = i <= 8 ? 0 : i <= 14 ? 1 : 2;
    const status = plotStatuses[i % plotStatuses.length];
    const plotType = plotTypes[i % plotTypes.length];
    const maxOccupants = plotType === "family" ? 4 : plotType === "double" || plotType === "companion" ? 2 : 1;

    const plot = await prisma.plot.create({
      data: {
        tenantId: tenant.id,
        cemeteryId: cemetery.id,
        sectionId: sections[sectionIndex].id,
        plotNumber: `${String.fromCharCode(65 + sectionIndex)}-${String(i).padStart(3, "0")}`,
        rowNumber: String(Math.ceil(i / 4)),
        plotType,
        status,
        maxOccupants,
        currentOccupants: status === "occupied" ? 1 : 0,
        price: plotType === "family" ? 4500 : plotType === "double" ? 3200 : 1800,
        depth: 6,
        width: plotType === "family" ? 12 : 4,
        length: plotType === "family" ? 12 : 8,
      },
    });
    plots.push({ id: plot.id, status: plot.status, maxOccupants });
    console.log(`  ✅ Plot: ${plot.plotNumber} (${status})`);
  }

  // Update section plot counts
  for (const section of sections) {
    const count = await prisma.plot.count({
      where: { sectionId: section.id, deletedAt: null },
    });
    await prisma.section.update({
      where: { id: section.id },
      data: { totalPlots: count },
    });
  }

  // Demo Persons (10 deceased)
  const deceasedData = [
    { firstName: "John", lastName: "Smith", dateOfBirth: new Date("1945-03-12"), dateOfDeath: new Date("2020-07-22") },
    { firstName: "Mary", lastName: "Johnson", dateOfBirth: new Date("1938-11-05"), dateOfDeath: new Date("2019-04-18") },
    { firstName: "Robert", lastName: "Williams", dateOfBirth: new Date("1950-01-30"), dateOfDeath: new Date("2021-09-10") },
    { firstName: "Patricia", lastName: "Brown", dateOfBirth: new Date("1942-06-14"), dateOfDeath: new Date("2018-12-03") },
    { firstName: "James", lastName: "Jones", dateOfBirth: new Date("1935-08-21"), dateOfDeath: new Date("2017-05-28") },
    { firstName: "Linda", lastName: "Garcia", dateOfBirth: new Date("1948-02-09"), dateOfDeath: new Date("2022-01-15") },
    { firstName: "Michael", lastName: "Miller", dateOfBirth: new Date("1940-10-17"), dateOfDeath: new Date("2016-08-07") },
    { firstName: "Elizabeth", lastName: "Davis", dateOfBirth: new Date("1933-04-25"), dateOfDeath: new Date("2015-11-19") },
    { firstName: "William", lastName: "Rodriguez", dateOfBirth: new Date("1955-07-08"), dateOfDeath: new Date("2023-03-30") },
    { firstName: "Barbara", lastName: "Martinez", dateOfBirth: new Date("1943-12-01"), dateOfDeath: new Date("2021-06-12") },
  ];

  const persons: { id: string }[] = [];
  for (const p of deceasedData) {
    const person = await prisma.person.create({
      data: {
        tenantId: tenant.id,
        firstName: p.firstName,
        lastName: p.lastName,
        personType: "deceased",
        dateOfBirth: p.dateOfBirth,
        dateOfDeath: p.dateOfDeath,
        dateOfBurial: new Date(p.dateOfDeath.getTime() + 5 * 24 * 60 * 60 * 1000),
      },
    });
    persons.push({ id: person.id });
    console.log(`  ✅ Person: ${p.firstName} ${p.lastName}`);
  }

  // Demo Graves (link occupied plots to persons)
  let personIdx = 0;
  for (const plot of plots) {
    if (plot.status === "occupied" && personIdx < persons.length) {
      await prisma.grave.create({
        data: {
          tenantId: tenant.id,
          plotId: plot.id,
          personId: persons[personIdx].id,
          graveNumber: `G-${String(personIdx + 1).padStart(3, "0")}`,
          burialDate: new Date(`2020-0${(personIdx % 9) + 1}-15`),
          condition: "good",
          headstoneType: "Upright Granite",
          headstoneMaterial: "Granite",
        },
      });
      console.log(`  ✅ Grave: G-${String(personIdx + 1).padStart(3, "0")}`);
      personIdx++;
    }
  }

  // Change logs for sync demo
  await prisma.changeLog.create({
    data: {
      tenantId: tenant.id,
      tableName: "plots",
      recordId: plots[0].id,
      operation: "UPDATE",
      version: 1,
      changedBy: adminUser?.id ?? null,
      deviceId: "seed-script",
      payload: { status: plots[0].status },
    },
  });

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
