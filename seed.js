
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

const prisma = new PrismaClient();

async function loadData(name) {
  const fileUrl = new URL(
    `../src/data/${name}.json`,
    import.meta.url
  );

  const contents = await readFile(fileUrl, "utf8");
  return JSON.parse(contents)[name];
}

async function main() {
  const datasets = [
    ["users", "user"],
    ["hosts", "host"],
    ["amenities", "amenity"],
    ["properties", "property"],
    ["bookings", "booking"],
    ["reviews", "review"],
  ];

  for (const [filename, model] of datasets) {
    const records = await loadData(filename);

    for (const record of records) {
      const data = { ...record };

      if (filename === "bookings") {
        data.checkinDate = new Date(data.checkinDate);
        data.checkoutDate = new Date(data.checkoutDate);
      }

      await prisma[model].create({ data });
    }

    console.log(`${filename}: ${records.length} toegevoegd`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
